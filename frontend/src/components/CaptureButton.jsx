import React from "react";

function CaptureButton({ onCapture, disabled }) {
  return (
    <div style={styles.wrapper}>
      <button
        onClick={onCapture}
        disabled={disabled}
        style={styles.outerRing}
        title="Capture Checkout Image"
      >
        <div style={styles.innerCircle}></div>
      </button>
      <span style={styles.label}>📸 Capture Frame</span>
    </div>
  );
}

const styles = {
  wrapper: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" },
  outerRing: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    backgroundColor: "transparent",
    border: "4px solid #38bdf8",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    padding: "0",
    transition: "transform 0.15s ease, border-color 0.2s ease",
    boxShadow: "0 0 20px rgba(56, 189, 248, 0.4)",
  },
  innerCircle: {
    width: "54px",
    height: "54px",
    borderRadius: "50%",
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
  },
  label: { fontSize: "0.85rem", color: "#e2e8f0", fontWeight: "600" },
};

export default CaptureButton;
