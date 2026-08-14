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
  const scannerStateRef = useRef("IDLE");
  const setScannerStateSync = (newState) => {
    scannerStateRef.current = newState;
    setScannerState(newState);
  };

  const [pendingProducts, setPendingProducts] = useState([]);
  const [submittingIds, setSubmittingIds] = useState(new Set());

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
  }, [currentItem?.trackId]);

  const captureVideoFrame = () => {
    const video = webcamRef.current?.video?.video || webcamRef.current?.video;
    if (!video) return null;
    if (video.readyState < 2) return null;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;
    const canvas = frameCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
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

    console.log("[SCAN] Starting scan");
    console.log("[FRAME] Capturing current frame");

    const blob = captureVideoFrame();
    if (!blob || blob.size === 0) return;

    console.log("[FRAME] Captured frame");
    scannerLockedRef.current = true;
    yoloLockRef.current = true;
    capturedFrameRef.current = blob;
    console.log("[SCAN] Frame LOCKED");

    const currentSessionId = ++scanSessionIdRef.current;
    console.log("[YOLO] Sending locked frame");

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
      console.log("[YOLO] Response completed");
      const rawDetections = result.detections || [];
      const detections = rawDetections.map(d => ({ ...d, yoloTimeMs: tYoloMs }));
      console.log(`[YOLO] Detection count: ${detections.length}`);
      console.log(`[TRACK] Creating tracks for ${detections.length} detections`);

      updateTracks(detections, currentSessionId);
      return result;
    } catch (e) {
      console.error("[YOLO] request error", e);
      scannerLockedRef.current = false;
      throw e;
    } finally {
      yoloLockRef.current = false;
    }
  };

  const isBoxHandled = (box) =>
    handledObjectsRef.current.some(
      (h) => computeIoU(box, h.box) > HANDLED_IOU_THRESHOLD
    );

  const enqueueTrack = (trackId, detection, sessionId) => {
    if (queuedTrackIdsRef.current.has(trackId))   return;
    if (activeTrackIdsRef.current.has(trackId))   return;
    if (matchedTrackIdsRef.current.has(trackId))  return;
    if (processedTrackIdsRef.current.has(trackId)) return;
    if (isBoxHandled(detection.box))              return;

    queuedTrackIdsRef.current.add(trackId);
    queueRef.current.push({ trackId, detection, sessionId });
    console.log(`[AI QUEUE] Track ${trackId} added`);
  };

  const updateTracks = (detections, sessionId) => {
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
        registry.set(bestId, info);

        console.log(`[TRACK] Track ${bestId} updated with new detection`);
        if (!isBoxHandled(curBox)) {
          enqueueTrack(bestId, info.detection, sessionId);
        }
      } else {
        const newId = trackIdCounterRef.current++;
        console.log(`[TRACK] Track ${newId} detected`);
        registry.set(newId, {
          trackId:   newId,
          detection: { ...det, box: curBox },
          state:     "DETECTED",
          createdAt: now,
          lastSeen:  now,
          sessionId: sessionId,
        });

        console.log(`[TRACK] Creating new track ${newId}`);
        if (isBoxHandled(curBox)) {
          console.log(`[TRACK] Track ${newId} already handled — skipping`);
        } else {
          enqueueTrack(newId, { ...det, box: curBox }, sessionId);
        }
      }
    });

    for (const [id, info] of registry.entries()) {
      if (now - info.lastSeen > TRACK_STALE_MS) {
        registry.delete(id);
        queuedTrackIdsRef.current.delete(id);
        activeTrackIdsRef.current.delete(id);
        processedTrackIdsRef.current.delete(id);
        matchedTrackIdsRef.current.delete(id);
        beepedTracksRef.current.delete(id);
      }
    }

    const frameCount      = detections.length;
    const activeCount     = registry.size;
    const queuedCount     = queuedTrackIdsRef.current.size;
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
      const { trackId, detection, sessionId } = item;
      queuedTrackIdsRef.current.delete(trackId);

      activeTrackIdsRef.current.add(trackId);
      console.log(`[AI QUEUE] Track ${trackId} processing`);

      runPipelineForTrack(trackId, detection, sessionId);
    }
  };

  const runPipelineForTrack = async (trackId, detection, sessionId) => {
    const tStart = performance.now();
    const yoloTimeMs = detection.yoloTimeMs || 0;
    let tOcrMs = 0, tVlmMs = 0, tEmbedMs = 0, tFaissMs = 0, tDbMs = 0;

    try {
      const blob = capturedFrameRef.current || captureVideoFrame();
      if (!blob) return;

      // Crop directly from frozen captured frame image
      let frameImageSource = frameCanvasRef.current;
      if (capturedFrameRef.current) {
        const imgUrl = URL.createObjectURL(capturedFrameRef.current);
        const img = new Image();
        img.src = imgUrl;
        await new Promise((res) => { img.onload = res; img.onerror = res; });
        frameImageSource = img;
        URL.revokeObjectURL(imgUrl);
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

      const tOcrStart = performance.now();
      const ocrResp = await fetch("/api/ai/ocr", {
        method: "POST",
        body: (() => {
          const fd = new FormData();
          fd.append("image", cropBlob, "crop.jpg");
          return fd;
        })(),
      });
      tOcrMs = Math.round(performance.now() - tOcrStart);
      if (!ocrResp.ok) throw new Error(`OCR request failed: ${ocrResp.status}`);
      const ocrResult = await ocrResp.json();
      const ocrText = ocrResult?.ocr?.text || "";

      if (sessionId && sessionId !== scanSessionIdRef.current) {
        console.log(`[AI] Ignoring stale session: ${sessionId}`);
        return;
      }

      const tVlmStart = performance.now();
      const vlmResp = await fetch("/api/ai/vlm", {
        method: "POST",
        body: (() => {
          const fd = new FormData();
          fd.append("image", cropBlob, "crop.jpg");
          return fd;
        })(),
      });
      tVlmMs = Math.round(performance.now() - tVlmStart);
      if (!vlmResp.ok) throw new Error(`VLM request failed: ${vlmResp.status}`);
      const vlmResult = await vlmResp.json();

      if (sessionId && sessionId !== scanSessionIdRef.current) {
        console.log(`[AI] Ignoring stale session: ${sessionId}`);
        return;
      }

      const tEmbedStart = performance.now();
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
      const cleanOcr = extractCleanTokens(ocrText);

      const searchableText = [
        cleanBrand, cleanProduct, cleanFlavor, cleanWeight, cleanCategory, cleanOcr,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      const embedResp = await fetch("/api/ai/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: searchableText || "retail product" }),
      });
      tEmbedMs = Math.round(performance.now() - tEmbedStart);
      if (!embedResp.ok) throw new Error(`Embedding request failed: ${embedResp.status}`);
      const embedResult = await embedResp.json();
      const embeddingVector = embedResult?.embedding || [];

      if (sessionId && sessionId !== scanSessionIdRef.current) {
        console.log(`[AI] Ignoring stale session: ${sessionId}`);
        return;
      }

      if (embeddingVector.length !== 384) {
        console.error(`[EMBED] Dimension mismatch: expected 384, got ${embeddingVector.length}`);
        return;
      }

      console.log(`[FAISS] Track ${trackId} searching`);
      const tFaissStart = performance.now();
      const faissResp = await fetch("/api/ai/faiss/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embedding: embeddingVector,
          vlm: vlmPayload,
          ocr_text: ocrText,
          threshold: 0.30,
        }),
      });
      tFaissMs = Math.round(performance.now() - tFaissStart);
      if (!faissResp.ok) throw new Error(`FAISS request failed: ${faissResp.status}`);
      const faissResult = await faissResp.json();
      const match = faissResult?.match || {};
      const similarity = match.similarity || 0;

      if (sessionId && sessionId !== scanSessionIdRef.current) {
        console.log(`[AI] Ignoring stale session: ${sessionId}`);
        return;
      }

      const isMatched = match.matched && similarity >= 0.30 && match.product_id;

      if (isMatched) {
        const mongoId = String(match.product_id);
        console.log(`[FAISS] Track ${trackId} matched product: ${mongoId}`);
        matchedTrackIdsRef.current.add(trackId);

        const tDbStart = performance.now();
        const prodResp = await fetch(`/api/products/${mongoId}`);
        tDbMs = Math.round(performance.now() - tDbStart);

        if (!prodResp.ok) {
          console.warn(`[DB] Product not found: ${mongoId}`);
          return;
        }

        const prodData = await prodResp.json();
        const dbProduct = prodData?.product;

        if (!dbProduct || !dbProduct._id) {
          console.warn(`[DB] Product not found: ${mongoId}`);
          return;
        }

        if (sessionId && sessionId !== scanSessionIdRef.current) {
          console.log(`[AI] Ignoring stale session: ${sessionId}`);
          return;
        }

        const actualProductName = dbProduct.name || "Unknown Product";
        console.log(`[DB] Track ${trackId} product loaded: ${actualProductName}`);

        if (!beepedTracksRef.current.has(trackId)) {
          beepedTracksRef.current.add(trackId);
          console.log(`[CONFIRM] Track ${trackId} product: ${actualProductName}`);
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
          similarity: similarity,
          box: detection.box,
          trackId: trackId,
        };

        setPendingProducts((prev) => {
          if (prev.some((p) => p.trackId === trackId)) return prev;
          const updated = [...prev, pendingData];
          console.log(`[CONFIRM] Track ${trackId} added to confirmation queue`);
          return updated;
        });

        setScannerStateSync("CONFIRMING");
      } else {
        console.log(`[FAISS] No matching catalog product for track ${trackId}`);
      }
    } catch (e) {
      console.error(`[PIPELINE] error for track ${trackId}:`, e);
    } finally {
      const tTotalMs = Math.round(performance.now() - tStart) + yoloTimeMs;
      console.log(`[PERF] Track ${trackId} YOLO: ${yoloTimeMs} ms`);
      console.log(`[PERF] Track ${trackId} OCR: ${tOcrMs} ms`);
      console.log(`[PERF] Track ${trackId} VLM: ${tVlmMs} ms`);
      console.log(`[PERF] Track ${trackId} EMBEDDING: ${tEmbedMs} ms`);
      console.log(`[PERF] Track ${trackId} FAISS: ${tFaissMs} ms`);
      console.log(`[PERF] Track ${trackId} DB: ${tDbMs} ms`);
      console.log(`[PERF] Track ${trackId} TOTAL: ${tTotalMs} ms`);

      activeTrackIdsRef.current.delete(trackId);
      processedTrackIdsRef.current.add(trackId);

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

    if (scannerLockedRef.current || yoloLockRef.current) {
      console.log("[SCAN] Frame locked - skipping scan");
      scheduleNextScan(150);
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
          // All products from this frame handled – now clear frame and unlock scanner
          capturedFrameRef.current = null;
          console.log("[FRAME] Captured frame cleared after final product");
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

    // Do NOT clear captured frame here; wait until all items are processed

    setPendingProducts((prev) => {
      const updated = prev.filter((p) => p.trackId !== item.trackId);
      if (updated.length === 0) {
        // All items handled – clear frame and unlock scanner
        capturedFrameRef.current = null;
        console.log("[FRAME] Captured frame cleared after final cancellation");
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
};

export default CameraView;

