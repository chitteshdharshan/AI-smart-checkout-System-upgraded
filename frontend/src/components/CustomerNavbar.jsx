import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";

function CustomerNavbar() {
  const location = useLocation();
  const { totalCount, cartBadgeAnimate } = useCart();
  const [showHelpModal, setShowHelpModal] = useState(false);

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      <header style={styles.bar}>
        {/* Brand Identity */}
        <Link to="/" style={styles.brandLink}>
          <div style={styles.logoBadge}>🛒</div>
          <div>
            <div style={styles.brandTitle}>AI SMART CHECKOUT</div>
            <div style={styles.brandSub}>AUTONOMOUS CUSTOMER TERMINAL</div>
          </div>
        </Link>

        {/* Customer Navigation Tabs */}
        <nav style={styles.tabsWrapper}>
          <div style={styles.tabGroup}>
            <Link
              to="/"
              style={isActive("/") && location.pathname === "/" ? styles.activeTab : styles.tab}
              className="touch-btn"
            >
              <span>🏠</span>
              <span>Home</span>
            </Link>

            <Link
              to="/checkout"
              style={isActive("/checkout") && location.pathname === "/checkout" ? styles.activeTab : styles.tab}
              className="touch-btn"
            >
              <span>📹</span>
              <span>AI Scanner</span>
            </Link>

            <Link
              to="/checkout/cart"
              style={isActive("/checkout/cart") || location.pathname === "/cart" || location.pathname === "/billing" ? styles.activeTab : styles.tab}
              className="touch-btn"
            >
              <span>🛒</span>
              <span>Smart Cart</span>
              {totalCount > 0 && (
                <span
                  style={{
                    ...styles.cartBadge,
                    transform: cartBadgeAnimate ? "scale(1.3)" : "scale(1)",
                  }}
                  className={cartBadgeAnimate ? "cart-pop" : ""}
                >
                  {totalCount}
                </span>
              )}
            </Link>
          </div>

          <button
            onClick={() => setShowHelpModal(true)}
            style={styles.helpBtn}
            className="touch-btn"
            title="How to use AI Smart Checkout"
          >
            <span>💡</span>
            <span>Help Guide</span>
          </button>
        </nav>

        {/* Live System Indicator */}
        <div style={styles.rightGroup}>
          <div style={styles.liveTag}>
            <span style={styles.liveDot} />
            <span>AI VISION READY</span>
          </div>

          <Link to="/checkout" style={styles.checkoutActionBtn} className="touch-btn">
            ⚡ Start Checkout
          </Link>
        </div>
      </header>

      {/* Help Modal */}
      {showHelpModal && (
        <div style={styles.modalOverlay} onClick={() => setShowHelpModal(false)}>
          <div
            style={styles.modalCard}
            className="cyber-glass-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "1.5rem" }}>💡</span>
                <h3 style={styles.modalTitle}>How to Use Smart AI Checkout</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                style={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <div style={styles.helpStepsList}>
              <div style={styles.helpStep}>
                <div style={styles.stepNum}>1</div>
                <div>
                  <h4 style={styles.stepHeader}>Launch Scanner</h4>
                  <p style={styles.stepText}>
                    Click <strong>"AI Scanner"</strong> and grant camera permission. Hold products steadily in front of the lens.
                  </p>
                </div>
              </div>

              <div style={styles.helpStep}>
                <div style={styles.stepNum}>2</div>
                <div>
                  <h4 style={styles.stepHeader}>Neural AI Product Verification</h4>
                  <p style={styles.stepText}>
                    The AI vision system detects packaging, reads text via OCR, verifies brand with Qwen2.5-VL, and identifies the exact inventory item.
                  </p>
                </div>
              </div>

              <div style={styles.helpStep}>
                <div style={styles.stepNum}>3</div>
                <div>
                  <h4 style={styles.stepHeader}>Instant Cart Sync</h4>
                  <p style={styles.stepText}>
                    Items are automatically added with price and quantity into your <strong>Smart Cart</strong>.
                  </p>
                </div>
              </div>

              <div style={styles.helpStep}>
                <div style={styles.stepNum}>4</div>
                <div>
                  <h4 style={styles.stepHeader}>Pay & Receive Digital Receipt</h4>
                  <p style={styles.stepText}>
                    Select your preferred payment method (UPI / Card / Cash) and generate your instant GST tax invoice.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowHelpModal(false)}
                style={styles.modalOkBtn}
                className="touch-btn"
              >
                Got It, Let's Shop!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  bar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    padding: "0.75rem 1.5rem",
    borderRadius: "1.25rem",
    marginBottom: "1.5rem",
    border: "1px solid rgba(56, 189, 248, 0.2)",
    boxShadow: "0 15px 35px -10px rgba(0, 0, 0, 0.7)",
    flexWrap: "wrap",
    gap: "1rem",
  },
  brandLink: {
    display: "flex",
    alignItems: "center",
    gap: "0.85rem",
    textDecoration: "none",
    userSelect: "none",
  },
  logoBadge: {
    width: "44px",
    height: "44px",
    borderRadius: "0.85rem",
    background: "linear-gradient(135deg, #0284c7, #6366f1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.4rem",
    boxShadow: "0 0 20px rgba(56, 189, 248, 0.4)",
  },
  brandTitle: {
    fontSize: "1.2rem",
    fontWeight: "900",
    letterSpacing: "0.04em",
    background: "linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    lineHeight: "1.1",
  },
  brandSub: {
    fontSize: "0.62rem",
    color: "#64748b",
    fontWeight: "800",
    letterSpacing: "0.12em",
  },
  tabsWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  tabGroup: {
    display: "flex",
    gap: "0.4rem",
    backgroundColor: "rgba(11, 18, 32, 0.6)",
    padding: "0.25rem",
    borderRadius: "0.85rem",
    border: "1px solid rgba(51, 65, 85, 0.4)",
  },
  tab: {
    padding: "0.55rem 1.1rem",
    backgroundColor: "transparent",
    border: "none",
    color: "#94a3b8",
    borderRadius: "0.65rem",
    fontSize: "0.85rem",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    textDecoration: "none",
    minHeight: "40px",
  },
  activeTab: {
    padding: "0.55rem 1.15rem",
    background: "linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)",
    border: "1px solid #38bdf8",
    color: "#ffffff",
    borderRadius: "0.65rem",
    fontSize: "0.85rem",
    fontWeight: "800",
    boxShadow: "0 0 15px rgba(2, 132, 199, 0.45)",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    textDecoration: "none",
    minHeight: "40px",
  },
  cartBadge: {
    backgroundColor: "#ef4444",
    color: "#ffffff",
    fontSize: "0.72rem",
    fontWeight: "800",
    padding: "0.12rem 0.5rem",
    borderRadius: "1rem",
    marginLeft: "0.2rem",
    transition: "transform 0.2s ease",
  },
  helpBtn: {
    padding: "0.55rem 0.95rem",
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    border: "1px solid rgba(51, 65, 85, 0.6)",
    color: "#cbd5e1",
    borderRadius: "0.65rem",
    fontSize: "0.82rem",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    cursor: "pointer",
    minHeight: "40px",
  },
  rightGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.85rem",
    flexWrap: "wrap",
  },
  liveTag: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    backgroundColor: "rgba(11, 18, 32, 0.7)",
    padding: "0.4rem 0.75rem",
    borderRadius: "0.75rem",
    border: "1px solid rgba(51, 65, 85, 0.6)",
    fontSize: "0.72rem",
    fontWeight: "800",
    color: "#34d399",
    letterSpacing: "0.05em",
  },
  liveDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#10b981",
    boxShadow: "0 0 8px #10b981",
  },
  checkoutActionBtn: {
    padding: "0.55rem 1.15rem",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#ffffff",
    border: "1px solid #34d399",
    borderRadius: "0.75rem",
    fontSize: "0.85rem",
    fontWeight: "800",
    textDecoration: "none",
    boxShadow: "0 4px 15px rgba(16, 185, 129, 0.35)",
    minHeight: "40px",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(8px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modalCard: {
    width: "100%",
    maxWidth: "520px",
    padding: "2rem",
    borderRadius: "1.5rem",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    borderBottom: "1px solid rgba(51, 65, 85, 0.5)",
    paddingBottom: "0.75rem",
  },
  modalTitle: {
    fontSize: "1.2rem",
    fontWeight: "800",
    color: "#f8fafc",
  },
  modalCloseBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "1.2rem",
    cursor: "pointer",
    padding: "0.25rem",
  },
  helpStepsList: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  helpStep: {
    display: "flex",
    gap: "1rem",
    alignItems: "flex-start",
    backgroundColor: "rgba(11, 18, 32, 0.6)",
    padding: "0.85rem 1rem",
    borderRadius: "0.85rem",
    border: "1px solid rgba(51, 65, 85, 0.4)",
  },
  stepNum: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    color: "#38bdf8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "0.85rem",
    flexShrink: 0,
  },
  stepHeader: {
    fontSize: "0.92rem",
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: "0.2rem",
  },
  stepText: {
    fontSize: "0.82rem",
    color: "#94a3b8",
    lineHeight: "1.4",
  },
  modalOkBtn: {
    padding: "0.65rem 1.5rem",
    background: "linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)",
    color: "#ffffff",
    border: "1px solid #38bdf8",
    borderRadius: "0.75rem",
    fontSize: "0.88rem",
    fontWeight: "800",
    cursor: "pointer",
  },
};

export default CustomerNavbar;
