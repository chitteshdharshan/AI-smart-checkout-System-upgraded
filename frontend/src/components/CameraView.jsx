// CameraView.jsx – Generic multi-product scanner with atomic frame lock, Web Audio API beep & FIFO confirmation queue
import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { addToCart } from "../api/cart";

// Configurable constants for scanner performance & concurrency
const SCAN_INTERVAL = 280;           // Faster responsive scan interval
const BACKOFF_DELAY = 4000;
const HANDLED_IOU_THRESHOLD = 0.35;
const HANDLED_MISSING_FRAMES = 2;    // Fast lock release after 2 missing frames
const HANDLED_TRACK_TIMEOUT = 6000;  // Safety expiry fallback
const MAX_CONCURRENT_PRODUCT_PIPELINES = 2;
const TRACK_STALE_MS = 1500;        // ms before un-seen track is pruned
const TRACK_IOU_MATCH = 0.40;       // IoU to consider two boxes the same object

// Utility: Convert a data URL (from canvas) to a Blob for upload
const dataURLtoBlob = (dataurl) => {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

// Compute Intersection-over-Union for two boxes {x,y,w,h}
const computeIoU = (a, b) => {
  if (!a || !b) return 0;
  const xA = Math.max(a.x, b.x);
  const yA = Math.max(a.y, b.y);
  const xB = Math.min(a.x + a.w, b.x + b.w);
  const yB = Math.min(a.y + a.h, b.y + b.h);
  const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  const unionArea = a.w * a.h + b.w * b.h - interArea;
  return unionArea === 0 ? 0 : interArea / unionArea;
};

function CameraView({
  webcamRef,
  facingMode,
  setFacingMode,
  isScanning,
  onAddToCart,
  onCaptureProcessed,
}) {
  const [scannerState, setScannerState] = useState("IDLE");
  const [scannerError, setScannerError] = useState(null);
  const scannerStateRef = useRef("IDLE");
  const setScannerStateSync = (newState) => {
    scannerStateRef.current = newState;
    setScannerState(newState);
  };

  const [pendingProducts, setPendingProducts] = useState([]);
  const [submittingIds, setSubmittingIds] = useState(new Set());
  const [uncertainNotice, setUncertainNotice] = useState(null);
  const uncertainTimerRef = useRef(null);

  const currentItem = pendingProducts.length > 0 ? pendingProducts[0] : null;

  const trackRegistryRef = useRef(new Map());
  const trackIdCounterRef = useRef(1);
  const scanSessionIdRef = useRef(1);

  const [renderTracks, setRenderTracks] = useState([]);

  const scannerLockedRef = useRef(false);
  const yoloLockRef = useRef(false);
  const scanInProgressRef = useRef(false);
  const scanTimerRef2 = useRef(null);
  const isScanningRef = useRef(isScanning);
  const scanGenerationRef = useRef(0);
  const frameCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const capturedFrameRef = useRef(null);

  const audioCtxRef = useRef(null);
  const beepedTracksRef = useRef(new Set());

  const queueRef = useRef([]);
  const queuedTrackIdsRef = useRef(new Set());
  const activeTrackIdsRef = useRef(new Set());
  const processedTrackIdsRef = useRef(new Set());
  const matchedTrackIdsRef = useRef(new Set());

  const handledObjectsRef = useRef([]);

  isScanningRef.current = isScanning;

  // Crisp supermarket barcode scanner chime (dual-tone)
  const playSuccessBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      
      // Tone 1 (High chime)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(1050, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Tone 2 (Higher success ping)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1450, now + 0.08);
      gain2.gain.setValueAtTime(0.35, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.22);
    } catch (err) {
      console.warn("[AUDIO] Beep error:", err);
    }
  };

  useEffect(() => {
    if (currentItem) {
      console.log(`[CONFIRM] Showing product ${currentItem.name}`);
    }
  }, [currentItem?.trackId, currentItem?.scanId]);

  const captureVideoFrame = () => {
    const video = webcamRef.current?.video?.video || webcamRef.current?.video;
    if (!video) return null;
    if (video.readyState < 2) return null;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;
    const canvas = frameCanvasRef.current;
    
    // Maintain high fidelity while bounding maximum dimension to optimize payload & latency
    const origW = video.videoWidth;
    const origH = video.videoHeight;
    let targetW = origW;
    let targetH = origH;
    const MAX_DIM = 1280;
    if (targetW > MAX_DIM || targetH > MAX_DIM) {
      if (targetW >= targetH) {
        targetH = Math.round((origH * MAX_DIM) / origW);
        targetW = MAX_DIM;
      } else {
        targetW = Math.round((origW * MAX_DIM) / origH);
        targetH = MAX_DIM;
      }
    }

    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, targetW, targetH);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.80);
    return dataURLtoBlob(dataUrl);
  };

  const toBox = (bbox) => ({
    x: bbox[0],
    y: bbox[1],
    w: bbox[2] - bbox[0],
    h: bbox[3] - bbox[1],
  });

  const sendYoloRequest = async () => {
    if (scannerLockedRef.current || yoloLockRef.current) {
      console.log("[SCAN] Frame locked - skipping scan");
      return;
    }

    const currentSessionId = ++scanSessionIdRef.current;
    console.log(`[SCAN] scanId=${currentSessionId} Starting scan`);

    const blob = captureVideoFrame();
    if (!blob || blob.size === 0) return;

    const frameW = frameCanvasRef.current?.width || 0;
    const frameH = frameCanvasRef.current?.height || 0;
    console.log(`[FRAME] scanId=${currentSessionId} Captured frame (${frameW}x${frameH}, ${blob.size} bytes)`);

    scannerLockedRef.current = true;
    yoloLockRef.current = true;
    capturedFrameRef.current = blob;
    console.log(`[SCAN] scanId=${currentSessionId} Frame LOCKED`);
    console.log(`[YOLO] scanId=${currentSessionId} Sending frame`);

    const tYoloStart = performance.now();
    try {
      const formData = new FormData();
      formData.append("image", blob, "frame.jpg");
      const resp = await fetch("/api/camera/upload", {
        method: "POST",
        body: formData,
      });
      const tYoloMs = Math.round(performance.now() - tYoloStart);
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error(`[YOLO] HTTP error: ${resp.status}`, errorText);
        throw new Error(`YOLO upload failed: ${resp.status}`);
      }
      const result = await resp.json();
      console.log(`[YOLO] scanId=${currentSessionId} request completed (${tYoloMs} ms)`);

      if (currentSessionId !== scanSessionIdRef.current) {
        console.log(`[STALE] Ignoring result: scan=${currentSessionId} current=${scanSessionIdRef.current}`);
        return result;
      }

      setScannerError(null);
      const rawDetections = result.detections || [];
      const detections = rawDetections.map(d => ({ ...d, yoloTimeMs: tYoloMs, frameW, frameH }));
      console.log(`[YOLO] scanId=${currentSessionId} Detection count: ${detections.length}`);

      updateTracks(detections, currentSessionId, blob);
      return result;
    } catch (e) {
      console.error(`[YOLO] scanId=${currentSessionId} request error:`, e.message);
      setScannerError("AI Scanner temporarily unavailable. Please retry.");
      scannerLockedRef.current = false;
    } finally {
      yoloLockRef.current = false;
    }
  };

  const isBoxHandled = (box) =>
    handledObjectsRef.current.some(
      (h) => computeIoU(box, h.box) > HANDLED_IOU_THRESHOLD
    );

  const getScopedKey = (sessionId, trackId) => `${sessionId}_${trackId}`;

  const enqueueTrack = (trackId, detection, sessionId, frameBlob) => {
    const scopedKey = getScopedKey(sessionId, trackId);
    if (queuedTrackIdsRef.current.has(scopedKey))   return;
    if (activeTrackIdsRef.current.has(scopedKey))   return;
    if (matchedTrackIdsRef.current.has(scopedKey))  return;
    if (processedTrackIdsRef.current.has(scopedKey)) return;
    if (isBoxHandled(detection.box))                return;

    queuedTrackIdsRef.current.add(scopedKey);
    queueRef.current.push({ trackId, detection, sessionId, frameBlob });
    console.log(`[AI QUEUE] Track ${trackId} added for scan ${sessionId}`);
  };

  const updateTracks = (detections, sessionId, frameBlob) => {
    if (sessionId !== scanSessionIdRef.current) {
      console.log(`[STALE] Ignoring updateTracks: scan=${sessionId} current=${scanSessionIdRef.current}`);
      return;
    }

    const now      = Date.now();
    const registry = trackRegistryRef.current;

    const activeHandledIndexes = new Set();
    detections.forEach((det) => {
      const curBox = toBox(det.bbox);
      handledObjectsRef.current.forEach((hObj, i) => {
        if (computeIoU(curBox, hObj.box) > HANDLED_IOU_THRESHOLD) {
          activeHandledIndexes.add(i);
          hObj.missingCount = 0;
        }
      });
    });

    handledObjectsRef.current = handledObjectsRef.current.filter((hObj, i) => {
      if (!activeHandledIndexes.has(i)) {
        hObj.missingCount = (hObj.missingCount || 0) + 1;
        console.log(`[TRACK] Track ${hObj.trackId || "object"} missing frame ${hObj.missingCount}`);
      }
      const isMissing = hObj.missingCount >= HANDLED_MISSING_FRAMES;
      const isExpired  = now - hObj.timestamp > HANDLED_TRACK_TIMEOUT;
      if (isMissing || isExpired) {
        console.log(`[TRACK] Track ${hObj.trackId || "object"} disappeared`);
        console.log(`[TRACK] Track ${hObj.trackId || "object"} lock released`);
        return false;
      }
      return true;
    });

    detections.forEach((det) => {
      const curBox = toBox(det.bbox);

      let bestId  = null;
      let bestIoU = TRACK_IOU_MATCH;
      for (const [id, info] of registry.entries()) {
        const iou = computeIoU(curBox, info.detection.box);
        if (iou > bestIoU) { bestIoU = iou; bestId = id; }
      }

      if (bestId !== null) {
        const info = registry.get(bestId);
        info.lastSeen  = now;
        info.detection = { ...det, box: curBox };
        info.sessionId = sessionId;
        registry.set(bestId, info);

        console.log(`[TRACK] scanId=${sessionId} trackId=${bestId} Updating existing track`);
        if (!isBoxHandled(curBox)) {
          enqueueTrack(bestId, info.detection, sessionId, frameBlob);
        }
      } else {
        const newId = trackIdCounterRef.current++;
        console.log(`[TRACK] scanId=${sessionId} trackId=${newId} Creating new track`);
        registry.set(newId, {
          trackId:   newId,
          detection: { ...det, box: curBox },
          state:     "DETECTED",
          createdAt: now,
          lastSeen:  now,
          sessionId: sessionId,
        });

        if (isBoxHandled(curBox)) {
          console.log(`[TRACK] scanId=${sessionId} trackId=${newId} already handled — skipping`);
        } else {
          enqueueTrack(newId, { ...det, box: curBox }, sessionId, frameBlob);
        }
      }
    });

    for (const [id, info] of registry.entries()) {
      if (now - info.lastSeen > TRACK_STALE_MS) {
        registry.delete(id);
      }
    }

    const frameCount      = detections.length;
    const activeCount     = registry.size;
    const queuedCount     = queueRef.current.length;
    const processingCount = activeTrackIdsRef.current.size;
    const handledCount    = handledObjectsRef.current.length;
    console.log(`[PIPELINE] Frame detections: ${frameCount}`);
    console.log(`[PIPELINE] Active tracks: ${activeCount}`);
    console.log(`[PIPELINE] Queued tracks: ${queuedCount}`);
    console.log(`[PIPELINE] Processing tracks: ${processingCount}`);
    console.log(`[PIPELINE] Pending confirmations: ${pendingProducts.length}`);
    console.log(`[PIPELINE] Handled objects: ${handledCount}`);

    if (queueRef.current.length === 0 && activeTrackIdsRef.current.size === 0 && pendingProducts.length === 0) {
      scannerLockedRef.current = false;
    }

    setRenderTracks([...registry.values()]);
    processNextInQueue();
  };

  const processNextInQueue = () => {
    while (
      queueRef.current.length > 0 &&
      activeTrackIdsRef.current.size < MAX_CONCURRENT_PRODUCT_PIPELINES
    ) {
      const item = queueRef.current.shift();
      const { trackId, detection, sessionId, frameBlob } = item;
      const scopedKey = getScopedKey(sessionId, trackId);
      queuedTrackIdsRef.current.delete(scopedKey);

      activeTrackIdsRef.current.add(scopedKey);
      console.log(`[AI QUEUE] Track ${trackId} processing for scan ${sessionId}`);

      runPipelineForTrack(trackId, detection, sessionId, frameBlob);
    }
  };

  const runPipelineForTrack = async (trackId, detection, sessionId, frameBlob) => {
    const scopedKey = getScopedKey(sessionId, trackId);
    const tStart = performance.now();
    const yoloTimeMs = detection.yoloTimeMs || 0;
    let tOcrMs = 0, tVlmMs = 0, tEmbedMs = 0, tFaissMs = 0, tDbMs = 0;

    try {
      if (sessionId !== scanSessionIdRef.current) {
        console.log(`[STALE] Ignoring result: scan=${sessionId} current=${scanSessionIdRef.current}`);
        return;
      }

      const sourceBlob = frameBlob || capturedFrameRef.current || captureVideoFrame();
      if (!sourceBlob) return;

      // Crop directly from frozen captured frame image
      const imgUrl = URL.createObjectURL(sourceBlob);
      const img = new Image();
      img.src = imgUrl;
      await new Promise((res) => { img.onload = res; img.onerror = res; });
      URL.revokeObjectURL(imgUrl);
      const frameImageSource = img;

      if (sessionId !== scanSessionIdRef.current) {
        console.log(`[STALE] Ignoring result: scan=${sessionId} current=${scanSessionIdRef.current}`);
        return;
      }

      const { x, y, w, h } = detection.box;
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = Math.max(1, w);
      cropCanvas.height = Math.max(1, h);
      const cropCtx = cropCanvas.getContext("2d");
      cropCtx.drawImage(frameImageSource, x, y, w, h, 0, 0, w, h);
      const cropBlob = await new Promise((res) =>
        cropCanvas.toBlob(res, "image/jpeg", 0.85)
      );

      // 2 & 3. Run OCR and Qwen2.5-VL concurrently on the product crop
      const tInferStart = performance.now();
      const [ocrResp, vlmResp] = await Promise.all([
        fetch("/api/ai/ocr", {
          method: "POST",
          body: (() => {
            const fd = new FormData();
            fd.append("image", cropBlob, "crop.jpg");
            return fd;
          })(),
        }),
        fetch("/api/ai/vlm", {
          method: "POST",
          body: (() => {
            const fd = new FormData();
            fd.append("image", cropBlob, "crop.jpg");
            return fd;
          })(),
        }),
      ]);
      tOcrMs = Math.round(performance.now() - tInferStart);
      tVlmMs = tOcrMs;

      if (!ocrResp.ok) throw new Error(`OCR request failed: ${ocrResp.status}`);
      if (!vlmResp.ok) throw new Error(`VLM request failed: ${vlmResp.status}`);

      const ocrResult = await ocrResp.json();
      const ocrText = ocrResult?.ocr?.text || "";
      const normOcr = ocrResult?.ocr?.normalized_text || ocrText;
      console.log(`[OCR] scanId=${sessionId} trackId=${trackId} text="${ocrText}"`);

      if (sessionId !== scanSessionIdRef.current) {
        console.log(`[STALE] Ignoring result: scan=${sessionId} current=${scanSessionIdRef.current}`);
        return;
      }

      const vlmResult = await vlmResp.json();
      const vlmPayload = vlmResult?.vlm || vlmResult || {};

      const ignoredTokens = new Set([
        "generic", "product", "standard", "n/a", "general", "unknown",
        "retail", "pack", "full_frame", "none", "(none)", "null", "undefined",
      ]);
      const extractCleanTokens = (val) => {
        if (!val) return "";
        const str = String(val).trim();
        return ignoredTokens.has(str.toLowerCase()) ? "" : str;
      };

      const cleanBrand = extractCleanTokens(vlmPayload.brand);
      const cleanProduct = extractCleanTokens(vlmPayload.product_name || vlmPayload.name || vlmPayload.title);
      const cleanFlavor = extractCleanTokens(vlmPayload.flavor || vlmPayload.variant);
      const cleanWeight = extractCleanTokens(vlmPayload.weight || vlmPayload.netVolume);
      const cleanCategory = extractCleanTokens(vlmPayload.category);
      const vlmConfidence = vlmPayload.confidence !== undefined ? vlmPayload.confidence : 0.0;

      console.log(`[VLM] scanId=${sessionId} trackId=${trackId} brand="${cleanBrand || "Generic"}" product_name="${cleanProduct || "UNKNOWN"}" confidence=${vlmConfidence}`);

      if (sessionId !== scanSessionIdRef.current) {
        console.log(`[STALE] Ignoring result: scan=${sessionId} current=${scanSessionIdRef.current}`);
        return;
      }

      // 4. Recognition Fusion: Combine OCR + Qwen2.5-VL recognition signals
      const combinedFusion = [
        cleanBrand, cleanProduct, cleanFlavor, cleanWeight, cleanCategory, normOcr,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      console.log(`[FUSION] scanId=${sessionId} trackId=${trackId} OCR="${ocrText}" VLM="${cleanBrand} ${cleanProduct}" combined="${combinedFusion}"`);

      // 5. Generate embedding from fused text
      const tEmbedStart = performance.now();
      const embedResp = await fetch("/api/ai/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: combinedFusion || "retail product" }),
      });
      tEmbedMs = Math.round(performance.now() - tEmbedStart);
      if (!embedResp.ok) throw new Error(`Embedding request failed: ${embedResp.status}`);
      const embedResult = await embedResp.json();
      const embeddingVector = embedResult?.embedding || [];
      console.log(`[EMBEDDING] scanId=${sessionId} trackId=${trackId} generated (${tEmbedMs} ms)`);

      if (sessionId !== scanSessionIdRef.current) {
        console.log(`[STALE] Ignoring result: scan=${sessionId} current=${scanSessionIdRef.current}`);
        return;
      }

      if (embeddingVector.length !== 384) {
        console.error(`[EMBED] Dimension mismatch: expected 384, got ${embeddingVector.length}`);
        return;
      }

      // 6. FAISS Top-K Search
      console.log(`[FAISS] scanId=${sessionId} trackId=${trackId} searching Top-K candidates`);
      const tFaissStart = performance.now();
      const faissResp = await fetch("/api/ai/faiss/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embedding: embeddingVector,
          vlm: vlmPayload,
          ocr_text: normOcr,
          threshold: 0.50,
        }),
      });
      tFaissMs = Math.round(performance.now() - tFaissStart);
      if (!faissResp.ok) throw new Error(`FAISS request failed: ${faissResp.status}`);
      const faissResult = await faissResp.json();
      const match = faissResult?.match || {};
      const similarity = match.similarity || 0;
      const finalScore = match.final_score || match.similarity || 0;

      // Structured FAISS Debug Logging
      console.log("[FAISS] Raw response:", faissResult);
      console.log(`[FAISS] Returned product_id: ${match.product_id || "none"}`);
      console.log(`[FAISS] Returned product name: ${match.name || "none"}`);
      console.log(`[FAISS] similarity: ${similarity.toFixed(4)}`);

      if (match.candidates && match.candidates.length > 0) {
        const topCandidate = match.candidates[0];
        console.log(`[FAISS] scanId=${sessionId} trackId=${trackId} candidate="${topCandidate.name}" similarity=${(topCandidate.similarity || 0).toFixed(2)}`);
      }

      if (sessionId !== scanSessionIdRef.current) {
        console.log(`[STALE] Ignoring result: scan=${sessionId} current=${scanSessionIdRef.current}`);
        return;
      }

      const isMatched = Boolean(match.matched && match.product_id);

      if (isMatched) {
        const mongoId = String(match.product_id);
        console.log(`[DB] Resolving product_id=${mongoId}`);

        const tDbStart = performance.now();
        const prodResp = await fetch(`/api/products/${mongoId}`);
        tDbMs = Math.round(performance.now() - tDbStart);

        if (!prodResp.ok) {
          console.warn(`[DB] Product ID not found in catalog: ${mongoId}`);
          console.warn(`[DB] Rejecting FAISS candidate instead of displaying wrong product`);
          console.log(`[MATCH] Rejected track ${trackId}: reason=PRODUCT_ID_NOT_IN_CATALOG score=${finalScore.toFixed(2)}`);
          if (uncertainTimerRef.current) clearTimeout(uncertainTimerRef.current);
          setUncertainNotice("PRODUCT UNCERTAIN - PLEASE RESCAN");
          uncertainTimerRef.current = setTimeout(() => {
            setUncertainNotice(null);
          }, 3000);
          return;
        }

        const prodData = await prodResp.json();
        const dbProduct = prodData?.product;

        if (!dbProduct || !dbProduct._id) {
          console.warn(`[DB] Product ID not found in catalog: ${mongoId}`);
          console.warn(`[DB] Rejecting FAISS candidate instead of displaying wrong product`);
          console.log(`[MATCH] Rejected track ${trackId}: reason=PRODUCT_ID_NOT_IN_CATALOG score=${finalScore.toFixed(2)}`);
          if (uncertainTimerRef.current) clearTimeout(uncertainTimerRef.current);
          setUncertainNotice("PRODUCT UNCERTAIN - PLEASE RESCAN");
          uncertainTimerRef.current = setTimeout(() => {
            setUncertainNotice(null);
          }, 3000);
          return;
        }

        if (sessionId !== scanSessionIdRef.current) {
          console.log(`[STALE] Ignoring result: scan=${sessionId} current=${scanSessionIdRef.current}`);
          return;
        }

        // Product successfully validated against real inventory
        matchedTrackIdsRef.current.add(scopedKey);

        const actualProductName = dbProduct.name || match.name || "Unknown Product";
        console.log(`[MATCH] scanId=${sessionId} trackId=${trackId} selected="${actualProductName}" confidence=${(finalScore * 100).toFixed(1)}%`);
        console.log(`[DB] scanId=${sessionId} trackId=${trackId} product="${actualProductName}"`);

        if (!beepedTracksRef.current.has(scopedKey)) {
          beepedTracksRef.current.add(scopedKey);
          console.log(`[CONFIRM] scanId=${sessionId} trackId=${trackId} product="${actualProductName}"`);
          console.log("[BEEP] Success tone played");
          playSuccessBeep();
        }

        const categoryName = typeof dbProduct.category === "object" ? dbProduct.category?.name : dbProduct.category || "General Goods";

        const pendingData = {
          _id: String(dbProduct._id),
          productId: String(dbProduct._id),
          name: dbProduct.name,
          brand: dbProduct.brand || "Generic",
          price: dbProduct.price,
          stock: dbProduct.stock !== undefined ? dbProduct.stock : 0,
          category: categoryName,
          aiClassId: dbProduct.aiClassId || "",
          similarity: finalScore,
          box: detection.box,
          trackId: trackId,
          scanId: sessionId,
        };

        setPendingProducts((prev) => {
          if (prev.some((p) => p.scanId === sessionId && p.trackId === trackId)) return prev;
          if (prev.some((p) => p.trackId === trackId)) return prev;
          const updated = [...prev, pendingData];
          return updated;
        });

        setScannerStateSync("CONFIRMING");
      } else {
        console.log(`[MATCH] Rejected track ${trackId}: reason=${match.reason || "NO_CONFIDENT_MATCH"} score=${finalScore.toFixed(2)}`);
        console.log(`[FAISS] scanId=${sessionId} trackId=${trackId} no confident match found`);
        if (uncertainTimerRef.current) clearTimeout(uncertainTimerRef.current);
        setUncertainNotice("PRODUCT UNCERTAIN - PLEASE RESCAN");
        uncertainTimerRef.current = setTimeout(() => {
          setUncertainNotice(null);
        }, 3000);
      }
    } catch (e) {
      console.error(`[PIPELINE] scanId=${sessionId} trackId=${trackId} error:`, e.message);
      setScannerError("AI Scanner temporarily unavailable. Please retry.");
    } finally {
      const tTotalMs = Math.round(performance.now() - tStart) + yoloTimeMs;
      console.log(`[PERF] Track ${trackId} TOTAL: ${tTotalMs} ms (YOLO: ${yoloTimeMs}ms, OCR: ${tOcrMs}ms, VLM: ${tVlmMs}ms, EMBED: ${tEmbedMs}ms, FAISS: ${tFaissMs}ms, DB: ${tDbMs}ms)`);

      activeTrackIdsRef.current.delete(scopedKey);
      processedTrackIdsRef.current.add(scopedKey);

      processNextInQueue();
    }
  };

  useEffect(() => {
    const video = webcamRef.current?.video?.video || webcamRef.current?.video;
    const canvas = overlayCanvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth  || canvas.offsetWidth;
    canvas.height = video.videoHeight || canvas.offsetHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    renderTracks.forEach((info) => {
      const conf = info.detection?.confidence || 0;
      const cName = (info.detection?.class_name || "").toLowerCase();

      // Filter low confidence or non-retail false positives
      if (conf < 0.25 && info.detection?.source !== "full_frame_fallback") return;
      if (["scissors", "person", "chair", "couch", "bed", "dining table", "tv"].includes(cName) && conf < 0.40) return;

      const { x, y, w, h } = info.detection.box;
      const isPending = pendingProducts.some((p) => p.trackId === info.trackId);
      const isHandled = isBoxHandled(info.detection.box);

      const color = isPending ? "#34d399" : isHandled ? "rgba(148, 163, 184, 0.4)" : "#38bdf8";
      const cornerLen = Math.max(10, Math.min(24, w * 0.22, h * 0.22));

      // ── 1. Sleek Corner Brackets (No large filled rectangle) ──
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = isPending ? "rgba(52, 211, 153, 0.5)" : "rgba(56, 189, 248, 0.5)";
      ctx.shadowBlur = 6;

      // Top-Left Corner
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLen, y);
      ctx.stroke();

      // Top-Right Corner
      ctx.beginPath();
      ctx.moveTo(x + w - cornerLen, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + cornerLen);
      ctx.stroke();

      // Bottom-Left Corner
      ctx.beginPath();
      ctx.moveTo(x, y + h - cornerLen);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x + cornerLen, y + h);
      ctx.stroke();

      // Bottom-Right Corner
      ctx.beginPath();
      ctx.moveTo(x + w - cornerLen, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w, y + h - cornerLen);
      ctx.stroke();

      ctx.restore();

      // ── 2. Compact Detection Badge ──
      const titleText = `${info.detection.class_name || "Product"} • ${((conf || 1) * 100).toFixed(0)}%`;
      const statusText = isPending ? "✓ AI VERIFIED" : "● AI DETECTED";

      ctx.font = "bold 11px Outfit, sans-serif";
      const textWidth = Math.max(ctx.measureText(titleText).width, ctx.measureText(statusText).width);
      const badgeW = textWidth + 16;
      const badgeH = 30;
      const badgeX = Math.max(4, Math.min(x, canvas.width - badgeW - 4));
      const badgeY = Math.max(6, y - badgeH - 6);

      // Glass pill badge background
      ctx.fillStyle = "rgba(7, 11, 20, 0.88)";
      ctx.strokeStyle = isPending ? "rgba(52, 211, 153, 0.4)" : "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = 1;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fill();
      ctx.stroke();

      // Title line: [ Product • 52% ]
      ctx.fillStyle = isPending ? "#34d399" : "#38bdf8";
      ctx.font = "bold 11px Outfit, sans-serif";
      ctx.fillText(titleText, badgeX + 8, badgeY + 13);

      // Status line: ● AI DETECTED
      ctx.fillStyle = isPending ? "#6ee7b7" : "#94a3b8";
      ctx.font = "600 9px Outfit, sans-serif";
      ctx.fillText(statusText, badgeX + 8, badgeY + 24);
    });
  }, [renderTracks, pendingProducts]);

  const scheduleNextScan = (delay) => {
    if (scanTimerRef2.current) clearTimeout(scanTimerRef2.current);
    scanTimerRef2.current = setTimeout(runScanIteration, delay);
  };

  const runScanIteration = async () => {
    const currentGen = scanGenerationRef.current;
    if (!isScanningRef.current) return;

    if (scannerLockedRef.current || yoloLockRef.current || pendingProducts.length > 0) {
      scheduleNextScan(350);
      return;
    }

    scanInProgressRef.current = true;
    try {
      await sendYoloRequest();
    } catch (err) {
      if (err && err.status === 429) {
        scanInProgressRef.current = false;
        scheduleNextScan(BACKOFF_DELAY);
        return;
      }
      console.error("[SCAN] Unexpected error:", err);
    } finally {
      scanInProgressRef.current = false;
    }

    if (currentGen === scanGenerationRef.current && isScanningRef.current) {
      scheduleNextScan(SCAN_INTERVAL);
    }
  };

  useEffect(() => {
    if (isScanning) {
      scanGenerationRef.current += 1;
      setScannerStateSync("SCANNING");
      if (scanTimerRef2.current) clearTimeout(scanTimerRef2.current);
      scanTimerRef2.current = setTimeout(runScanIteration, 0);
    } else {
      setScannerStateSync("IDLE");
      if (scanTimerRef2.current) {
        clearTimeout(scanTimerRef2.current);
        scanTimerRef2.current = null;
      }
    }
    return () => {
      if (scanTimerRef2.current) {
        clearTimeout(scanTimerRef2.current);
        scanTimerRef2.current = null;
      }
    };
  }, [isScanning]);

  const handleConfirmItem = async (item) => {
    if (!item || submittingIds.has(item.trackId)) return;
    setSubmittingIds((prev) => new Set(prev).add(item.trackId));

    console.log(`[CONFIRM] User selected ADD for ${item.name}`);
    console.log(`[CART] Adding product: ${item.name}`);

    try {
      const cartResponse = await addToCart(item._id, 1, item.similarity);
      const dbProduct = cartResponse?.product || cartResponse?.item;
      const dbProductName = dbProduct?.name || item.name;

      console.log(`[CART] Product successfully added`);

      if (typeof onAddToCart === "function") {
        onAddToCart({
          ...item,
          product: item._id,
          productId: item._id,
          name: dbProductName,
          quantity: 1,
        });
      }
      if (typeof onCaptureProcessed === "function") {
        onCaptureProcessed();
      }

      handledObjectsRef.current.push({
        trackId: item.trackId,
        box: item.box,
        productId: item._id,
        timestamp: Date.now(),
        missingCount: 0,
      });

      // Do NOT clear captured frame here; wait until all products are handled

      setPendingProducts((prev) => {
        const updated = prev.filter((p) => p.trackId !== item.trackId);
        if (updated.length === 0) {
          // All products from this frame handled – cleanly reset scanner lifecycle for next scan
          capturedFrameRef.current = null;
          handledObjectsRef.current = [];
          trackRegistryRef.current.clear();
          matchedTrackIdsRef.current.clear();
          processedTrackIdsRef.current.clear();
          queuedTrackIdsRef.current.clear();
          activeTrackIdsRef.current.clear();
          beepedTracksRef.current.clear();
          queueRef.current = [];
          scanSessionIdRef.current += 1;
          setRenderTracks([]);
          console.log("[FRAME] Captured frame and track state cleared after final product");
          scannerLockedRef.current = false;
          console.log("[SCAN] Frame lifecycle completed");
          console.log("[SCAN] Scanner unlocked");
          console.log("[SCAN] Ready for next frame");
          setScannerStateSync("SCANNING");
        }
        return updated;
      });
    } catch (err) {
      console.error(`[CART] Cart update failed: ${err.message}`);
      alert(`Cart Update Error: ${err.message}`);
    } finally {
      setSubmittingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.trackId);
        return next;
      });
    }
  };

  const handleCancelItem = (item) => {
    if (!item) return;
    console.log(`[CONFIRM] User cancelled product: ${item.name}`);

    handledObjectsRef.current.push({
      trackId: item.trackId,
      box: item.box,
      productId: item._id,
      timestamp: Date.now(),
      missingCount: 0,
    });

    // Clear and unlock if all items handled
    setPendingProducts((prev) => {
      const updated = prev.filter((p) => p.trackId !== item.trackId);
      if (updated.length === 0) {
        // All items handled – cleanly reset scanner lifecycle for next scan
        capturedFrameRef.current = null;
        handledObjectsRef.current = [];
        trackRegistryRef.current.clear();
        matchedTrackIdsRef.current.clear();
        processedTrackIdsRef.current.clear();
        queuedTrackIdsRef.current.clear();
        activeTrackIdsRef.current.clear();
        beepedTracksRef.current.clear();
        queueRef.current = [];
        scanSessionIdRef.current += 1;
        setRenderTracks([]);
        console.log("[FRAME] Captured frame and track state cleared after final cancellation");
        scannerLockedRef.current = false;
        console.log("[SCAN] Frame lifecycle completed");
        console.log("[SCAN] Scanner unlocked");
        console.log("[SCAN] Ready for next frame");
        setScannerStateSync("SCANNING");
      }
      return updated;
    });
  };

  const getStatusText = () => {
    if (pendingProducts.length > 0) return { icon: "✓", label: "PRODUCT RECOGNIZED", color: "#34d399" };
    if (uncertainNotice) return { icon: "⚠️", label: uncertainNotice, color: "#f59e0b" };
    if (activeTrackIdsRef.current.size > 0) return { icon: "●", label: "AI PROCESSING...", color: "#38bdf8" };
    if (scannerLockedRef.current || yoloLockRef.current) return { icon: "●", label: "SCANNING OBJECT...", color: "#38bdf8" };
    if (scannerState === "SCANNING") return { icon: "●", label: "AI VISION ACTIVE", color: "#34d399" };
    return { icon: "○", label: "STANDBY", color: "#94a3b8" };
  };

  const statusInfo = getStatusText();

  return (
    <div style={styles.container} className="hud-pulse">
      {/* Animated Scanning Laser Beam */}
      {(scannerState === "SCANNING" || scannerLockedRef.current) && (
        <div className="laser-line" />
      )}

      {/* Cyber Corner HUD Brackets */}
      <div style={styles.cornerTL} />
      <div style={styles.cornerTR} />
      <div style={styles.cornerBL} />
      <div style={styles.cornerBR} />

      {/* Top HUD Feed Badge */}
      <div style={styles.hudFeedBadge}>
        <span style={styles.hudLiveDot} />
        <span>1080P AI VISION FEED</span>
      </div>

      {/* Non-blocking Uncertain Rescan Notification Banner */}
      {uncertainNotice && pendingProducts.length === 0 && (
        <div
          style={{
            position: "absolute",
            top: "3.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(245, 158, 11, 0.92)",
            color: "#0f172a",
            padding: "0.45rem 1.1rem",
            borderRadius: "9999px",
            fontSize: "0.82rem",
            fontWeight: "800",
            letterSpacing: "0.04em",
            zIndex: 35,
            boxShadow: "0 4px 15px rgba(245, 158, 11, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          <span>⚠️</span>
          <span>PRODUCT UNCERTAIN - PLEASE RESCAN</span>
        </div>
      )}

      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={{
          facingMode: facingMode || "user",
          aspectRatio: 1.77777778,
        }}
        style={styles.webcam}
      />

      <canvas ref={frameCanvasRef} style={{ display: "none" }} />
      <canvas ref={overlayCanvasRef} style={styles.overlayCanvas} />

      {/* Controls Bar */}
      <div style={styles.controlsBar}>
        <button
          onClick={() =>
            setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
          }
          style={styles.switchBtn}
        >
          📷 Switch Camera ({facingMode === "user" ? "Front" : "Rear"})
        </button>
        <div style={styles.statusBadge}>
          <span>{statusInfo.icon}</span>{" "}
          <span style={{ color: statusInfo.color, fontWeight: "800", letterSpacing: "0.03em" }}>
            {statusInfo.label}
          </span>
          {pendingProducts.length > 0 && (
            <span style={{ color: "#94a3b8", marginLeft: "0.5rem", fontWeight: "600" }}>
              ({pendingProducts.length} Pending)
            </span>
          )}
        </div>
        {scannerError && (
          <div style={styles.errorBanner}>
            <span>⚠️ {scannerError}</span>
            <button
              onClick={() => {
                setScannerError(null);
                scannerLockedRef.current = false;
                yoloLockRef.current = false;
                scheduleNextScan(0);
              }}
              style={styles.retryBtn}
            >
              🔄 Retry
            </button>
          </div>
        )}
      </div>

      {/* Single-Product FIFO Confirmation Queue Modal Overlay */}
      {pendingProducts.length > 0 && currentItem && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard} className="cyber-glass-card">
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "#34d399", fontSize: "1.2rem" }}>✓</span>
                <h3 style={styles.modalTitle}>PRODUCT IDENTIFIED</h3>
              </div>
              <span style={styles.queueBadge}>
                {`ITEM ${pendingProducts.findIndex(p => p.trackId === currentItem.trackId) + 1} OF ${pendingProducts.length}`}
              </span>
            </div>

            <div style={styles.singleProductCard}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "0.5rem" }}>
                <div style={styles.productIconBox}>📦</div>
                <div style={{ flex: 1 }}>
                  <div style={styles.productName}>{currentItem.name}</div>
                  <div style={styles.valText}>{currentItem.brand || "Britannia"} • {currentItem.category || "General"}</div>
                </div>
                <div style={styles.priceTag}>
                  ₹{currentItem.price}
                </div>
              </div>

              <div style={styles.productMetaRow}>
                <div style={styles.metaCol}>
                  <span style={styles.label}>CONFIDENCE</span>
                  <span style={styles.matchScore}>
                    {(currentItem.similarity * 100).toFixed(1)}% Match
                  </span>
                </div>
                <div style={styles.metaCol}>
                  <span style={styles.label}>STOCK STATUS</span>
                  <span style={styles.stockVal}>
                    {currentItem.stock !== undefined ? `${currentItem.stock} in store` : "In Stock"}
                  </span>
                </div>
                <div style={styles.metaCol}>
                  <span style={styles.label}>VERIFICATION</span>
                  <span style={{ color: "#34d399", fontWeight: "700", fontSize: "0.8rem" }}>✓ AI Verified</span>
                </div>
              </div>
            </div>

            <div style={styles.cardActions}>
              <button
                onClick={() => handleConfirmItem(currentItem)}
                disabled={submittingIds.has(currentItem.trackId)}
                style={styles.addBtn}
                className="touch-btn"
              >
                {submittingIds.has(currentItem.trackId) ? "Adding..." : "🛒 CONFIRM & ADD TO CART"}
              </button>
              <button
                onClick={() => handleCancelItem(currentItem)}
                disabled={submittingIds.has(currentItem.trackId)}
                style={styles.cancelBtn}
                className="touch-btn"
              >
                ✕ CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: "relative",
    width: "100%",
    height: "100%",
    backgroundColor: "#050811",
    borderRadius: "1rem",
    overflow: "hidden",
    boxShadow: "0 0 30px rgba(0, 0, 0, 0.8)",
  },
  cornerTL: { position: "absolute", top: "12px", left: "12px", width: "24px", height: "24px", borderTop: "3px solid #38bdf8", borderLeft: "3px solid #38bdf8", zIndex: 12, pointerEvents: "none" },
  cornerTR: { position: "absolute", top: "12px", right: "12px", width: "24px", height: "24px", borderTop: "3px solid #38bdf8", borderRight: "3px solid #38bdf8", zIndex: 12, pointerEvents: "none" },
  cornerBL: { position: "absolute", bottom: "12px", left: "12px", width: "24px", height: "24px", borderBottom: "3px solid #38bdf8", borderLeft: "3px solid #38bdf8", zIndex: 12, pointerEvents: "none" },
  cornerBR: { position: "absolute", bottom: "12px", right: "12px", width: "24px", height: "24px", borderBottom: "3px solid #38bdf8", borderRight: "3px solid #38bdf8", zIndex: 12, pointerEvents: "none" },
  hudFeedBadge: {
    position: "absolute",
    top: "1rem",
    left: "1rem",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    padding: "0.35rem 0.75rem",
    borderRadius: "0.5rem",
    fontSize: "0.75rem",
    fontWeight: "800",
    color: "#38bdf8",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    zIndex: 15,
  },
  hudLiveDot: { width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#ef4444", boxShadow: "0 0 8px #ef4444" },
  webcam: { width: "100%", height: "100%", objectFit: "cover" },
  overlayCanvas: {
    position: "absolute",
    top: 0,
    left: 0,
    pointerEvents: "none",
    zIndex: 5,
  },
  controlsBar: {
    position: "absolute",
    bottom: "1rem",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "0.75rem",
    alignItems: "center",
    zIndex: 15,
  },
  switchBtn: {
    padding: "0.55rem 1rem",
    backgroundColor: "rgba(30, 41, 59, 0.85)",
    backdropFilter: "blur(8px)",
    color: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    borderRadius: "0.6rem",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "600",
    transition: "all 0.2s ease",
  },
  statusBadge: {
    padding: "0.55rem 1.1rem",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    backdropFilter: "blur(12px)",
    color: "#94a3b8",
    borderRadius: "0.6rem",
    fontSize: "0.85rem",
    border: "1px solid rgba(56, 189, 248, 0.4)",
    display: "flex",
    alignItems: "center",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(7, 11, 20, 0.82)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  modalCard: {
    width: "440px",
    maxWidth: "92vw",
    borderRadius: "1.35rem",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.1rem",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(56, 189, 248, 0.2)",
    paddingBottom: "0.75rem",
  },
  modalTitle: { fontSize: "1.15rem", fontWeight: "900", background: "linear-gradient(90deg, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  queueBadge: {
    backgroundColor: "#0284c7",
    color: "#ffffff",
    fontSize: "0.75rem",
    fontWeight: "800",
    padding: "0.25rem 0.65rem",
    borderRadius: "0.5rem",
    boxShadow: "0 0 10px rgba(2, 132, 199, 0.4)",
  },
  singleProductCard: {
    backgroundColor: "rgba(11, 18, 32, 0.85)",
    borderRadius: "1rem",
    padding: "1.25rem",
    border: "1px solid rgba(56, 189, 248, 0.25)",
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
  },
  productIconBox: {
    width: "48px",
    height: "48px",
    borderRadius: "0.75rem",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
  },
  productName: { color: "#f8fafc", fontWeight: "900", fontSize: "1.2rem", lineHeight: "1.2" },
  valText: { color: "#94a3b8", fontWeight: "600", fontSize: "0.85rem", marginTop: "0.2rem" },
  priceTag: {
    color: "#34d399",
    fontWeight: "900",
    fontSize: "1.5rem",
    backgroundColor: "rgba(6, 95, 70, 0.25)",
    border: "1px solid rgba(16, 185, 129, 0.4)",
    padding: "0.35rem 0.75rem",
    borderRadius: "0.6rem",
  },
  productMetaRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "0.5rem",
    paddingTop: "0.75rem",
    borderTop: "1px solid rgba(51, 65, 85, 0.6)",
  },
  metaCol: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  label: { color: "#64748b", fontWeight: "800", fontSize: "0.65rem", letterSpacing: "0.05em" },
  matchScore: {
    color: "#38bdf8",
    fontSize: "0.8rem",
    fontWeight: "800",
  },
  stockVal: {
    color: "#f8fafc",
    fontSize: "0.8rem",
    fontWeight: "700",
  },
  cardActions: { display: "flex", gap: "0.85rem", marginTop: "0.25rem" },
  addBtn: {
    flex: 2,
    padding: "0.85rem",
    background: "linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)",
    color: "#ffffff",
    border: "1px solid #38bdf8",
    borderRadius: "0.75rem",
    fontWeight: "800",
    fontSize: "0.92rem",
    boxShadow: "0 0 20px rgba(2, 132, 199, 0.5)",
  },
  cancelBtn: {
    flex: 1,
    padding: "0.85rem",
    backgroundColor: "rgba(51, 65, 85, 0.8)",
    color: "#cbd5e1",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    borderRadius: "0.75rem",
    fontWeight: "700",
    fontSize: "0.88rem",
  },
  errorBanner: {
    padding: "0.45rem 0.9rem",
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    border: "1px solid rgba(239, 68, 68, 0.5)",
    borderRadius: "0.6rem",
    color: "#fca5a5",
    fontSize: "0.82rem",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
  },
  retryBtn: {
    padding: "0.25rem 0.6rem",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    border: "none",
    borderRadius: "0.4rem",
    fontWeight: "800",
    fontSize: "0.75rem",
    cursor: "pointer",
  },
};

export default CameraView;

