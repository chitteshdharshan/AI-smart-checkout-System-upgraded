// Camera.jsx – Streamlined Commercial AI Supermarket Vision Terminal
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CameraView from "../components/CameraView";
import glassStyles from "../components/GlassCard.module.css";
import { useCart } from "../context/CartContext";

function Camera({ onAddToCart, cartCount, onGoToCart }) {
  const navigate = useNavigate();
  const cartContext = useCart();
  const effectiveAddToCart = onAddToCart || cartContext.addToCart;
  const effectiveCartCount = cartCount !== undefined ? cartCount : cartContext.totalCount;
  const effectiveGoToCart = onGoToCart || (() => navigate("/checkout/cart"));

  const webcamRef = useRef(null);
  const [facingMode, setFacingMode] = useState("user");
  const [isScanning, setIsScanning] = useState(false);

  const toggleScanning = () => setIsScanning((prev) => !prev);

  return (
    <div style={styles.container}>
      {/* Top Terminal Status Header */}
      <div style={styles.topHeader}>
        <div>
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            AI AUTONOMOUS CHECKOUT TERMINAL
          </div>
          <h2 style={styles.pageTitle}>Vision Scanner Station</h2>
          <p style={styles.pageSubtitle}>
            Position products in the scanner vision zone for real-time neural identification
          </p>
        </div>

        <div style={styles.controlsGroup}>
          <button
            onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
            style={styles.switchBtn}
            aria-label="Switch camera"
            className="touch-btn"
          >
            📷 {facingMode === "user" ? "Front Lens" : "Rear Lens"}
          </button>

          <button
            onClick={toggleScanning}
            style={isScanning ? styles.activeScanBtn : styles.scanBtn}
            id={isScanning ? "pause-scanning-btn" : "start-scanning-btn"}
            className="touch-btn"
          >
            {isScanning ? "⏸ Pause AI Vision" : "⚡ Start AI Vision"}
          </button>
        </div>
      </div>

      {/* Main Camera Viewport */}
      <div className={`${glassStyles.glassCard} cyber-glass`}>
        {/* Sub-header inside camera card */}
        <div style={styles.cameraHeader}>
          <div style={styles.feedStatus}>
            <span style={styles.liveDot} />
            <span style={styles.feedTitle}>NEURAL VISION FEED (1080P)</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={isScanning ? styles.statusScanning : styles.statusStandby}>
              {isScanning ? "● SCANNING ACTIVE" : "● READY TO SCAN"}
            </div>

            {effectiveCartCount > 0 && (
              <button onClick={effectiveGoToCart} style={styles.viewCartMiniBtn} className="touch-btn">
                🛒 View Cart ({effectiveCartCount}) →
              </button>
            )}
          </div>
        </div>

        {/* Video & AI HUD Canvas */}
        <div style={styles.videoViewport}>
          <CameraView
            webcamRef={webcamRef}
            facingMode={facingMode}
            setFacingMode={setFacingMode}
            isScanning={isScanning}
            onAddToCart={effectiveAddToCart}
          />
        </div>

        {/* Bottom Helper Bar */}
        <div style={styles.cameraFooter}>
          <div style={styles.hintItem}>
            <span>💡</span>
            <span>Hold packaging steady within the frame for instant confirmation.</span>
          </div>
          <div style={styles.techPills}>
            <span style={styles.techPill}>YOLOv8 Vision</span>
            <span style={styles.techPill}>VLM Brand Verification</span>
            <span style={styles.techPill}>FAISS Vectors</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    maxWidth: "1120px",
    margin: "0 auto",
    padding: "0.5rem 0 2rem",
  },
  topHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "1.25rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.7rem",
    fontWeight: "800",
    letterSpacing: "0.08em",
    color: "#38bdf8",
    background: "rgba(56, 189, 248, 0.1)",
    border: "1px solid rgba(56, 189, 248, 0.25)",
    padding: "0.3rem 0.85rem",
    borderRadius: "2rem",
    marginBottom: "0.5rem",
  },
  badgeDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#38bdf8",
    boxShadow: "0 0 8px #38bdf8",
  },
  pageTitle: {
    fontSize: "1.85rem",
    fontWeight: "900",
    color: "#f8fafc",
    letterSpacing: "-0.02em",
  },
  pageSubtitle: {
    fontSize: "0.88rem",
    color: "#94a3b8",
    marginTop: "0.2rem",
  },
  controlsGroup: {
    display: "flex",
    gap: "0.75rem",
    alignItems: "center",
    flexWrap: "wrap",
  },
  switchBtn: {
    padding: "0.65rem 1.25rem",
    borderRadius: "0.75rem",
    fontSize: "0.85rem",
    fontWeight: "700",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    color: "#cbd5e1",
    border: "1px solid rgba(56, 189, 248, 0.25)",
    transition: "all 0.2s ease",
  },
  scanBtn: {
    padding: "0.65rem 1.6rem",
    borderRadius: "0.75rem",
    fontSize: "0.9rem",
    fontWeight: "800",
    background: "linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)",
    color: "#ffffff",
    border: "1px solid rgba(56, 189, 248, 0.5)",
    boxShadow: "0 0 20px rgba(56, 189, 248, 0.35)",
    transition: "all 0.2s ease",
  },
  activeScanBtn: {
    padding: "0.65rem 1.6rem",
    borderRadius: "0.75rem",
    fontSize: "0.9rem",
    fontWeight: "800",
    background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
    color: "#ffffff",
    border: "1px solid rgba(253, 164, 175, 0.5)",
    boxShadow: "0 0 20px rgba(225, 29, 72, 0.4)",
    transition: "all 0.2s ease",
  },
  cameraCard: {
    width: "100%",
    borderRadius: "1.5rem",
    border: "1px solid rgba(56, 189, 248, 0.2)",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
    overflow: "hidden",
  },
  cameraHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.85rem 1.5rem",
    background: "rgba(11, 18, 32, 0.9)",
    borderBottom: "1px solid rgba(56, 189, 248, 0.12)",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  feedStatus: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  liveDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#ef4444",
    boxShadow: "0 0 8px #ef4444",
  },
  feedTitle: {
    fontSize: "0.75rem",
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: "0.06em",
  },
  statusScanning: {
    fontSize: "0.78rem",
    fontWeight: "800",
    color: "#34d399",
    letterSpacing: "0.05em",
  },
  statusStandby: {
    fontSize: "0.78rem",
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: "0.05em",
  },
  viewCartMiniBtn: {
    padding: "0.35rem 0.85rem",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    border: "1px solid rgba(56, 189, 248, 0.35)",
    color: "#38bdf8",
    borderRadius: "0.5rem",
    fontSize: "0.8rem",
    fontWeight: "800",
    minHeight: "34px",
  },
  videoViewport: {
    width: "100%",
    minHeight: "530px",
    backgroundColor: "#050811",
    position: "relative",
  },
  cameraFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem 1.5rem",
    background: "rgba(11, 18, 32, 0.85)",
    borderTop: "1px solid rgba(51, 65, 85, 0.5)",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  hintItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.8rem",
    color: "#94a3b8",
  },
  techPills: {
    display: "flex",
    gap: "0.5rem",
  },
  techPill: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    border: "1px solid rgba(51, 65, 85, 0.8)",
    color: "#64748b",
    fontSize: "0.68rem",
    fontWeight: "700",
    padding: "0.2rem 0.5rem",
    borderRadius: "0.35rem",
  },
};

export default Camera;
