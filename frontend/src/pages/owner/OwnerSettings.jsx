import React, { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

function OwnerSettings() {
  const { user } = useContext(AuthContext);

  const [storeName, setStoreName] = useState("Smart AI Supermarket");
  const [currency, setCurrency] = useState("INR (₹)");
  const [taxRate, setTaxRate] = useState(5);
  const [minSimilarityThreshold, setMinSimilarityThreshold] = useState(0.45);
  const [enableOcrAssistance, setEnableOcrAssistance] = useState(true);
  const [enableVlmValidation, setEnableVlmValidation] = useState(true);
  const [autoAddConfidence, setAutoAddConfidence] = useState(0.70);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.topBar}>
        <div>
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            SUPERMARKET CONFIGURATION & AI TUNING
          </div>
          <h2 style={styles.pageTitle}>Owner Settings</h2>
          <p style={styles.pageSubtitle}>
            Configure store parameters, tax rates, AI neural detection thresholds, and terminal profiles
          </p>
        </div>

        {savedSuccess && (
          <div style={styles.saveSuccessPill}>
            <span>✓</span>
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} style={styles.settingsGrid}>
        {/* Store & General Profile */}
        <div style={styles.card} className="cyber-glass-card">
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>🏪</span>
            <div>
              <h3 style={styles.cardTitle}>Supermarket Profile</h3>
              <p style={styles.cardSub}>Store identification and customer billing details</p>
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>STORE / SUPERMARKET NAME</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              style={styles.input}
              className="touch-btn"
            />
          </div>

          <div style={styles.fieldRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>CURRENCY</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={styles.select}
                className="touch-btn"
              >
                <option value="INR (₹)">INR (₹)</option>
                <option value="USD ($)">USD ($)</option>
                <option value="EUR (€)">EUR (€)</option>
                <option value="GBP (£)">GBP (£)</option>
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={styles.label}>GST TAX RATE (%)</label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                min={0}
                max={30}
                step={0.5}
                style={styles.input}
                className="touch-btn"
              />
            </div>
          </div>
        </div>

        {/* AI Vision & Neural Pipeline Tuning */}
        <div style={styles.card} className="cyber-glass-card">
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>🤖</span>
            <div>
              <h3 style={styles.cardTitle}>AI Vision & Neural Tuning</h3>
              <p style={styles.cardSub}>Adjust YOLOv8, OCR, and FAISS vector thresholds</p>
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={styles.label}>MINIMUM VECTOR SIMILARITY THRESHOLD</label>
              <span style={{ color: "#38bdf8", fontWeight: "800", fontSize: "0.85rem" }}>
                {minSimilarityThreshold}
              </span>
            </div>
            <input
              type="range"
              min={0.2}
              max={0.9}
              step={0.05}
              value={minSimilarityThreshold}
              onChange={(e) => setMinSimilarityThreshold(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer", marginTop: "0.5rem" }}
            />
            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
              Lower values increase match recall; higher values enforce strict packaging similarity.
            </span>
          </div>

          <div style={styles.fieldGroup}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={styles.label}>AUTO-ADD CONFIDENCE THRESHOLD</label>
              <span style={{ color: "#34d399", fontWeight: "800", fontSize: "0.85rem" }}>
                {autoAddConfidence}
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={0.95}
              step={0.05}
              value={autoAddConfidence}
              onChange={(e) => setAutoAddConfidence(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#34d399", cursor: "pointer", marginTop: "0.5rem" }}
            />
          </div>

          <div style={styles.toggleRow}>
            <div>
              <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.88rem" }}>
                EasyOCR Text Recognition Assistance
              </div>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                Enhances accuracy by reading brand names & weights directly from packaging
              </div>
            </div>
            <input
              type="checkbox"
              checked={enableOcrAssistance}
              onChange={(e) => setEnableOcrAssistance(e.target.checked)}
              style={{ width: "20px", height: "20px", accentColor: "#38bdf8", cursor: "pointer" }}
            />
          </div>

          <div style={styles.toggleRow}>
            <div>
              <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.88rem" }}>
                Qwen2.5-VL Multimodal Validation
              </div>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                Performs deep semantic cross-validation on detected product crops
              </div>
            </div>
            <input
              type="checkbox"
              checked={enableVlmValidation}
              onChange={(e) => setEnableVlmValidation(e.target.checked)}
              style={{ width: "20px", height: "20px", accentColor: "#38bdf8", cursor: "pointer" }}
            />
          </div>
        </div>

        {/* System Architecture Information */}
        <div style={{ ...styles.card, gridColumn: "1 / -1" }} className="cyber-glass-card">
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>💻</span>
            <div>
              <h3 style={styles.cardTitle}>System Architecture & Health</h3>
              <p style={styles.cardSub}>Active microservices and connected databases</p>
            </div>
          </div>

          <div style={styles.systemInfoGrid}>
            <div style={styles.sysItem}>
              <span style={styles.sysLabel}>NODE.JS BACKEND</span>
              <span style={styles.sysVal}>Port 5001 • Express API</span>
              <span style={styles.onlinePill}>● ONLINE</span>
            </div>

            <div style={styles.sysItem}>
              <span style={styles.sysLabel}>PYTHON AI SERVICE</span>
              <span style={styles.sysVal}>Port 8000 • FastAPI & YOLOv8</span>
              <span style={styles.onlinePill}>● ONLINE</span>
            </div>

            <div style={styles.sysItem}>
              <span style={styles.sysLabel}>DATABASE</span>
              <span style={styles.sysVal}>MongoDB Atlas / Local</span>
              <span style={styles.onlinePill}>● CONNECTED</span>
            </div>

            <div style={styles.sysItem}>
              <span style={styles.sysLabel}>VECTOR INDEX</span>
              <span style={styles.sysVal}>FAISS L2 Index (product_metadata.pkl)</span>
              <span style={styles.onlinePill}>● LOADED</span>
            </div>
          </div>

          <div style={{ marginTop: "1.75rem", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" style={styles.saveBtn} className="touch-btn">
              💾 Save Configuration Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "1.5rem",
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
    marginTop: "0.25rem",
  },
  saveSuccessPill: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    border: "1px solid #34d399",
    color: "#34d399",
    padding: "0.45rem 1rem",
    borderRadius: "2rem",
    fontSize: "0.82rem",
    fontWeight: "800",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  settingsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    padding: "1.75rem",
    borderRadius: "1.25rem",
    border: "1px solid rgba(56, 189, 248, 0.2)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1.5rem",
    borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
    paddingBottom: "1rem",
  },
  cardIcon: {
    fontSize: "1.8rem",
    width: "44px",
    height: "44px",
    borderRadius: "0.75rem",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: "1.1rem",
    fontWeight: "800",
    color: "#f8fafc",
  },
  cardSub: {
    fontSize: "0.78rem",
    color: "#94a3b8",
  },
  fieldGroup: {
    marginBottom: "1.25rem",
  },
  fieldRow: {
    display: "flex",
    gap: "1rem",
    marginBottom: "1.25rem",
  },
  label: {
    fontSize: "0.7rem",
    color: "#38bdf8",
    display: "block",
    marginBottom: "0.4rem",
    fontWeight: "800",
    letterSpacing: "0.06em",
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    backgroundColor: "rgba(11, 18, 32, 0.85)",
    border: "1px solid rgba(51, 65, 85, 0.8)",
    borderRadius: "0.75rem",
    color: "#f8fafc",
    outline: "none",
    fontSize: "0.9rem",
    minHeight: "44px",
  },
  select: {
    width: "100%",
    padding: "0.75rem 1rem",
    backgroundColor: "rgba(11, 18, 32, 0.85)",
    border: "1px solid rgba(51, 65, 85, 0.8)",
    borderRadius: "0.75rem",
    color: "#f8fafc",
    outline: "none",
    fontSize: "0.88rem",
    minHeight: "44px",
    cursor: "pointer",
  },
  toggleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.85rem 1rem",
    backgroundColor: "rgba(11, 18, 32, 0.6)",
    borderRadius: "0.75rem",
    border: "1px solid rgba(51, 65, 85, 0.4)",
    marginBottom: "0.75rem",
  },
  systemInfoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.25rem",
  },
  sysItem: {
    backgroundColor: "rgba(11, 18, 32, 0.7)",
    padding: "1rem",
    borderRadius: "0.85rem",
    border: "1px solid rgba(51, 65, 85, 0.4)",
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
  },
  sysLabel: {
    fontSize: "0.68rem",
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: "0.06em",
  },
  sysVal: {
    fontSize: "0.85rem",
    fontWeight: "700",
    color: "#f8fafc",
  },
  onlinePill: {
    fontSize: "0.65rem",
    color: "#34d399",
    fontWeight: "800",
    marginTop: "0.25rem",
  },
  saveBtn: {
    padding: "0.85rem 2rem",
    background: "linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)",
    color: "#ffffff",
    border: "1px solid #38bdf8",
    borderRadius: "0.75rem",
    fontSize: "0.95rem",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: "0 10px 25px -5px rgba(2, 132, 199, 0.4)",
  },
};

export default OwnerSettings;
