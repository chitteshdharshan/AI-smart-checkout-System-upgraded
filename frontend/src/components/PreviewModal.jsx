import React, { useState, useRef, useEffect } from "react";
import { uploadCapturedImage } from "../services/cameraService";

function PreviewModal({ imageSrc, isOpen, onRetake, onUploadSuccess, onAddToCart, isScanning }) {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  // Scanning mode is controlled by parent component via isScanning prop
  const [cartAddedDebounced, setCartAddedDebounced] = useState(false);
  const autoAddedRef = useRef(false);

  const isProcessingRef = useRef(false);
  const scanTimerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Auto‑start upload when the modal opens in continuous scanning mode
  useEffect(() => {
    if (isOpen && isScanning && !aiResult && !uploading) {
      handleUpload();
    }
  }, [isOpen, isScanning]);



  // Convert base64 data URL to Blob (Step 3.5 Quality Processing)
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

  const handleUpload = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setError("");
    setUploading(true);
    setProgress(10);

    try {
      const blob = dataURLtoBlob(imageSrc);
      const res = await uploadCapturedImage(blob, (percent) => {
        setProgress(percent);
      });

      setAiResult(res);
      if (onUploadSuccess) {
        onUploadSuccess(res);
      }

      // Schedule next scan iteration if continuous scanning is active (prop driven)
      if (isScanning) {
        scanTimerRef.current = setTimeout(() => {
          isProcessingRef.current = false;
          if (onRetake) onRetake();
        }, 800);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.response?.data?.message || err.message || "Image upload failed");
    } finally {
      setUploading(false);
      isProcessingRef.current = false;
    }
  };

  // Scanning toggle is handled by parent; this function removed

  const handleAddToCart = () => {
    if (cartAddedDebounced) return;
    if (onAddToCart && aiResult?.detections) {
      onAddToCart(aiResult.detections);
      setCartAddedDebounced(true);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        setCartAddedDebounced(false);
      }, 2500);
    }
  };

  // Auto‑add detections to cart when in scanning mode and a match is found
  useEffect(() => {
    // No guard needed here
    if (!isScanning) return;
    if (!aiResult || !aiResult.detections) return;
    const hasMatch = aiResult.detections.some(det => det.match && det.match.matched);
    if (hasMatch && !autoAddedRef.current) {
      // Add to cart automatically
      if (onAddToCart) onAddToCart(aiResult.detections);
      autoAddedRef.current = true;
      // Schedule retake for next frame after a short pause
      setTimeout(() => {
        if (onRetake) onRetake();
        // Reset flag for next detection cycle
        autoAddedRef.current = false;
      }, 800);
    }
  }, [aiResult, isScanning]);

  if (!isOpen || !imageSrc) {
  return null;
}
return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h3 style={styles.title}>📸 Frame Preview & Quality Check (Step 3.12)</h3>
          <button onClick={onRetake} disabled={uploading} style={styles.closeBtn}>✕</button>
        </div>

        {/* Captured Frame Image Display */}
        <div style={styles.imageWrapper}>
          <img 
            src={aiResult?.annotatedImage ? `http://localhost:8000${aiResult.annotatedImage}` : imageSrc} 
            alt="Captured Checkout Frame" 
            style={styles.previewImg} 
          />
          <div style={styles.aspectBadge}>
            {aiResult?.annotatedImage ? "YOLO Detections" : "1280x720 (JPEG)"}
          </div>
        </div>

        {error && <div style={styles.errorBox}>❌ {error}</div>}

        {/* Progress Bar (Step 3.6) */}
        {uploading && (
          <div style={styles.progressContainer}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#38bdf8", marginBottom: "0.25rem" }}>
              <span>Uploading frame to AI Backend...</span>
              <span>{progress}%</span>
            </div>
            <div style={styles.progressBarTrack}>
              <div style={{ ...styles.progressBarFill, width: `${progress}%` }}></div>
            </div>
          </div>
        )}

        {aiResult && (
          <div style={styles.resultsContainer}>
            <div style={styles.successBox}>
              <div style={{ fontWeight: "700", fontSize: "1rem" }}>🎉 Detection Complete</div>
                <ul style={{ marginTop: "0.35rem", fontSize: "0.85rem", color: "#a7f3d0", listStyle: "none", paddingLeft: 0 }}>
                  {(() => {
                    const stages = aiResult.stages || {};
                    const isStageDone = (stageVal, fallbackCheck) => {
                      if (typeof stageVal === "boolean") return stageVal;
                      if (stageVal && typeof stageVal === "object") return Boolean(stageVal.completed);
                      return Boolean(fallbackCheck);
                    };
                    const steps = [
                      { label: "Image captured", done: true },
                      { label: "Uploading", done: true },
                      { label: "YOLO detection", done: isStageDone(stages.yolo, (aiResult.detections || []).length > 0) },
                      { label: "OCR processing", done: isStageDone(stages.ocr, (aiResult.detections || []).every(det => det.ocr)) },
                      { label: "VLM analysis", done: isStageDone(stages.vlm, (aiResult.detections || []).every(det => det.vlm)) },
                      { label: "Catalog matching", done: isStageDone(stages.faiss, (aiResult.detections || []).every(det => det.match)) },
                    ];
                    return steps.map((step, idx) => (
                      <li key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {step.done ? (
                          <span>✅</span>
                        ) : (
                          <span className="spinner" />
                        )}
                        <span>{step.label}</span>
                      </li>
                    ));
                  })()}
                </ul>
            </div>

            {aiResult.detections && aiResult.detections.length > 0 && (
              <div style={styles.detectionsSection}>
                <h4 style={styles.sectionTitle}>🍱 Cropped Product Detections (Step 4.10)</h4>
                <div style={styles.cropsGrid}>
                  {aiResult.detections.map((det, index) => {
                    const isFallback = det.source === "fallback_full_frame" || det.class_name === "full_frame";
                    return (
                      <div key={index} style={styles.cropCard}>
                        <img 
                          src={`http://localhost:8000${det.crop_path}`} 
                          alt={det.class_name} 
                          style={styles.cropImg} 
                        />
                        <div style={styles.cropMeta}>
                          <span style={styles.cropLabel} title={det.class_name}>
                            {isFallback ? "Full-Frame Candidate" : det.class_name}
                          </span>
                          <span style={{
                            ...styles.cropConf,
                            color: isFallback ? "#f59e0b" : "#34d399"
                          }}>
                            {isFallback ? "Source: AI Fallback" : `${(det.confidence * 100).toFixed(0)}%`}
                          </span>
                        </div>
                        {det.ocr && (
                          <div style={styles.ocrContainer}>
                            <div style={styles.ocrText}><strong>OCR:</strong> {det.ocr.text || "No text"}</div>
                            {det.ocr.lines && det.ocr.lines.length > 0 && (
                              <div style={styles.ocrLines}>Lines: {det.ocr.lines.join(", ")}</div>
                            )}
                          </div>
                        )}
                        {det.vlm && (
                          <div style={styles.vlmContainer}>
                            <div style={styles.vlmHeader}>
                              <span style={styles.vlmTitle}>🤖 VLM Analysis</span>
                              <span style={{
                                ...styles.vlmBadge,
                                backgroundColor: (det.vlm.confidence || 0) < 0.7 ? "#7f1d1d" : "#065f46",
                                color: (det.vlm.confidence || 0) < 0.7 ? "#fca5a5" : "#6ee7b7"
                              }}>
                                {(det.vlm.confidence * 100).toFixed(0)}% Match
                              </span>
                            </div>
                            <div style={styles.vlmRow}><strong>Brand:</strong> {det.vlm.brand}</div>
                            <div style={styles.vlmRow}><strong>Product:</strong> {det.vlm.product_name}</div>
                            {det.vlm.flavor && det.vlm.flavor !== "Standard" && (
                              <div style={styles.vlmRow}><strong>Flavor:</strong> {det.vlm.flavor}</div>
                            )}
                            {det.vlm.weight && det.vlm.weight !== "N/A" && (
                              <div style={styles.vlmRow}><strong>Net Vol:</strong> {det.vlm.weight}</div>
                            )}
                            <div style={styles.vlmRow}><strong>Category:</strong> {det.vlm.category}</div>
                          </div>
                        )}
                        {det.match && (
                          <div style={styles.matchContainer}>
                            <div style={styles.matchHeader}>
                              <span style={styles.matchTitle}>🎯 Catalog Match</span>
                              <span style={{
                                ...styles.vlmBadge,
                                backgroundColor: det.match.matched ? "#065f46" : "#7c2d12",
                                color: det.match.matched ? "#6ee7b7" : "#fdba74"
                              }}>
                                {(det.match.similarity * 100).toFixed(0)}% Vector Sim
                              </span>
                            </div>
                            <div style={styles.matchRow}><strong>Product:</strong> {det.match.name || "No Match"}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
                              <span style={styles.matchPrice}>₹{det.match.price?.toFixed(2) || "0.00"}</span>
                              <span style={{ fontSize: "0.65rem", color: det.match.matched ? "#34d399" : "#fb923c" }}>
                                {det.match.status}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={styles.actions}>
          <button onClick={onRetake} disabled={uploading} style={styles.retakeBtn}>
            ✖ Retake Frame
          </button>
          {!aiResult ? (
            <button onClick={handleUpload} disabled={uploading} style={styles.uploadBtn}>
              {uploading ? `Uploading (${progress}%)...` : "✔ Upload to AI Pipeline"}
            </button>
          ) : (
            <>
              {onAddToCart && aiResult.detections?.some((det) => det.match && det.match.matched) && (
                <button
                  onClick={handleAddToCart}
                  disabled={cartAddedDebounced}
                  style={{
                    ...styles.cartAddBtn,
                    opacity: cartAddedDebounced ? 0.6 : 1,
                    cursor: cartAddedDebounced ? "not-allowed" : "pointer"
                  }}
                >
                  {cartAddedDebounced ? "✓ Added!" : "🛒 Add Detections to Cart"}
                </button>
              )}
              <button onClick={onRetake} style={styles.doneBtn}>
                📸 Capture Next Frame
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000, padding: "1rem" },
  card: { backgroundColor: "#1e293b", padding: "1.5rem", borderRadius: "1rem", width: "100%", maxWidth: "840px", color: "#f8fafc", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  title: { fontSize: "1.2rem", color: "#f8fafc" },
  closeBtn: { background: "none", border: "none", color: "#94a3b8", fontSize: "1.25rem", cursor: "pointer" },
  imageWrapper: { position: "relative", width: "100%", borderRadius: "0.75rem", overflow: "hidden", backgroundColor: "#000", marginBottom: "1rem" },
  previewImg: { width: "100%", height: "auto", maxHeight: "400px", objectFit: "contain", display: "block" },
  aspectBadge: { position: "absolute", bottom: "0.75rem", right: "0.75rem", backgroundColor: "rgba(15,23,42,0.8)", color: "#34d399", padding: "0.25rem 0.6rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: "600" },
  errorBox: { backgroundColor: "#451a1a", border: "1px solid #f87171", color: "#fca5a5", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.85rem" },
  progressContainer: { marginBottom: "1rem" },
  progressBarTrack: { width: "100%", height: "8px", backgroundColor: "#0f172a", borderRadius: "4px", overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#38bdf8", transition: "width 0.2s ease" },
  successBox: { backgroundColor: "#064e3b", border: "1px solid #34d399", color: "#a7f3d0", padding: "0.75rem 1rem", borderRadius: "0.5rem" },
  resultsContainer: { display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" },
  detectionsSection: { backgroundColor: "#0f172a", borderRadius: "0.75rem", padding: "1rem", border: "1px solid #334155" },
  sectionTitle: { fontSize: "0.95rem", color: "#94a3b8", fontWeight: "600", marginBottom: "0.75rem", marginTop: 0 },
  cropsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "0.85rem", maxHeight: "320px", overflowY: "auto", paddingRight: "0.25rem" },
  cropCard: { backgroundColor: "#1e293b", borderRadius: "0.5rem", overflow: "hidden", border: "1px solid #334155", display: "flex", flexDirection: "column" },
  cropImg: { width: "100%", height: "90px", objectFit: "cover", backgroundColor: "#000" },
  cropMeta: { padding: "0.4rem 0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", borderBottom: "1px solid #334155" },
  cropLabel: { color: "#f8fafc", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "0.25rem" },
  cropConf: { color: "#34d399", fontWeight: "500", flexShrink: 0 },
  ocrContainer: { padding: "0.4rem 0.5rem", backgroundColor: "#0f172a", fontSize: "0.7rem", color: "#cbd5e1", borderBottom: "1px solid #334155" },
  ocrText: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  ocrLines: { fontSize: "0.65rem", color: "#94a3b8", marginTop: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  vlmContainer: { padding: "0.5rem", backgroundColor: "#182234", fontSize: "0.72rem", color: "#e2e8f0", borderBottom: "1px solid #334155" },
  vlmHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" },
  vlmTitle: { color: "#38bdf8", fontWeight: "700", fontSize: "0.75rem" },
  vlmBadge: { padding: "0.1rem 0.4rem", borderRadius: "0.25rem", fontSize: "0.65rem", fontWeight: "600" },
  vlmRow: { fontSize: "0.7rem", lineHeight: "1.25", marginTop: "0.15rem", color: "#cbd5e1" },
  matchContainer: { padding: "0.5rem", backgroundColor: "#064e3b22", fontSize: "0.72rem", color: "#ecfdf5" },
  matchHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" },
  matchTitle: { color: "#34d399", fontWeight: "700", fontSize: "0.75rem" },
  matchRow: { fontSize: "0.7rem", lineHeight: "1.25", marginTop: "0.15rem", color: "#f0fdf4" },
  matchPrice: { fontSize: "0.85rem", fontWeight: "800", color: "#34d399" },
  actions: { display: "flex", justifyContent: "flex-end", gap: "0.75rem" },
  retakeBtn: { padding: "0.75rem 1.25rem", backgroundColor: "#475569", color: "#ffffff", border: "none", borderRadius: "0.5rem", fontSize: "0.95rem", fontWeight: "600", cursor: "pointer" },
  cartAddBtn: { padding: "0.75rem 1.25rem", backgroundColor: "#10b981", color: "#ffffff", border: "none", borderRadius: "0.5rem", fontSize: "0.95rem", fontWeight: "600", cursor: "pointer" },
  uploadBtn: { padding: "0.75rem 1.5rem", backgroundColor: "#10b981", color: "#ffffff", border: "none", borderRadius: "0.5rem", fontSize: "0.95rem", fontWeight: "600", cursor: "pointer" },
  doneBtn: { padding: "0.75rem 1.5rem", backgroundColor: "#3b82f6", color: "#ffffff", border: "none", borderRadius: "0.5rem", fontSize: "0.95rem", fontWeight: "600", cursor: "pointer" },
};

export default PreviewModal;
