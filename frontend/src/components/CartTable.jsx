import React from "react";

function CartTable({ items, onUpdateQuantity, onRemoveItem, onClearCart }) {
  const totalCount = items ? items.reduce((a, b) => a + (b.quantity || 1), 0) : 0;

  if (!items || items.length === 0) {
    return (
      <div style={styles.emptyCard} className="cyber-glass">
        <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>🛒</div>
        <div style={{ fontSize: "1.3rem", fontWeight: "900", color: "#f8fafc" }}>
          Your Smart Trolley is Empty
        </div>
        <p style={{ fontSize: "0.9rem", color: "#94a3b8", marginTop: "0.5rem", maxWidth: "380px", margin: "0.5rem auto 0", lineHeight: "1.5" }}>
          Scan items using the AI Vision Scanner Station or select products from store inventory.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container} className="cyber-glass">
      {/* Header Bar */}
      <div style={styles.headerRow}>
        <div>
          <h3 style={styles.title}>YOUR SMART CART</h3>
          <div style={styles.subtitle}>🛒 {totalCount} {totalCount === 1 ? "ITEM" : "ITEMS"} IN TROLLEY</div>
        </div>

        <button onClick={onClearCart} style={styles.clearBtn} className="touch-btn">
          <span>🗑</span>
          <span>Clear Trolley</span>
        </button>
      </div>

      {/* Cart Items List */}
      <div style={styles.itemsList}>
        {items.map((item, index) => {
          const unitPrice = item.price || 0;
          const qty = item.quantity || 1;
          const lineTotal = (unitPrice * qty).toFixed(2);
          const isHighConfidence = (item.similarity || 1) >= 0.7;

          return (
            <div key={index} style={styles.itemCard} className="cyber-glass-card">
              {/* Product Visual Icon / Box */}
              <div style={styles.itemIconBox}>
                📦
              </div>

              {/* Product Info */}
              <div style={styles.itemInfo}>
                <div style={styles.itemName}>{item.name}</div>
                <div style={styles.itemMeta}>
                  <span>Brand: <strong style={{ color: "#cbd5e1" }}>{item.brand || "Generic"}</strong></span>
                  <span style={styles.metaDot}>•</span>
                  <span>Category: <strong style={{ color: "#cbd5e1" }}>{item.category || "General"}</strong></span>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem", alignItems: "center" }}>
                  <span style={{
                    ...styles.confBadge,
                    backgroundColor: isHighConfidence ? "rgba(6, 95, 70, 0.3)" : "rgba(124, 45, 18, 0.3)",
                    color: isHighConfidence ? "#34d399" : "#fdba74",
                    border: isHighConfidence ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(234, 88, 12, 0.3)",
                  }}>
                    ✓ AI Match {( (item.similarity || 1) * 100 ).toFixed(0)}%
                  </span>
                  <span style={styles.unitPriceText}>₹{unitPrice.toFixed(2)} each</span>
                </div>
              </div>

              {/* Quantity Stepper (48px touch friendly) */}
              <div style={styles.stepperWrap}>
                <div style={styles.stepper}>
                  <button
                    onClick={() => onUpdateQuantity(index, qty - 1)}
                    style={styles.stepBtn}
                    className="touch-btn"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span style={styles.qtyText}>{qty}</span>
                  <button
                    onClick={() => onUpdateQuantity(index, qty + 1)}
                    style={styles.stepBtn}
                    className="touch-btn"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Line Item Total & Delete */}
              <div style={styles.itemRight}>
                <div style={styles.linePrice}>₹{lineTotal}</div>
                <button
                  onClick={() => onRemoveItem(index)}
                  style={styles.removeBtn}
                  title="Remove item"
                  aria-label="Remove item"
                  className="touch-btn"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  container: {
    borderRadius: "1.5rem",
    padding: "1.75rem",
    border: "1px solid rgba(56, 189, 248, 0.2)",
    boxShadow: "0 20px 45px -15px rgba(0, 0, 0, 0.7)",
  },
  emptyCard: {
    borderRadius: "1.5rem",
    padding: "4.5rem 2rem",
    textAlign: "center",
    border: "1px solid rgba(56, 189, 248, 0.2)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid rgba(56, 189, 248, 0.15)",
  },
  title: {
    fontSize: "1.3rem",
    fontWeight: "900",
    color: "#f8fafc",
    letterSpacing: "0.02em",
  },
  subtitle: {
    fontSize: "0.78rem",
    color: "#38bdf8",
    fontWeight: "800",
    letterSpacing: "0.08em",
    marginTop: "0.2rem",
  },
  clearBtn: {
    padding: "0.5rem 1rem",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#fca5a5",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "0.65rem",
    fontSize: "0.82rem",
    cursor: "pointer",
    fontWeight: "800",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    minHeight: "40px",
  },
  itemsList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
  },
  itemCard: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem",
    padding: "1.1rem 1.25rem",
    borderRadius: "1rem",
    flexWrap: "wrap",
  },
  itemIconBox: {
    width: "48px",
    height: "48px",
    borderRadius: "0.75rem",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    border: "1px solid rgba(56, 189, 248, 0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.4rem",
  },
  itemInfo: {
    flex: "2 1 200px",
  },
  itemName: {
    fontWeight: "900",
    color: "#f8fafc",
    fontSize: "1.05rem",
  },
  itemMeta: {
    fontSize: "0.78rem",
    color: "#94a3b8",
    marginTop: "0.2rem",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
  },
  metaDot: {
    color: "#475569",
  },
  confBadge: {
    padding: "0.15rem 0.5rem",
    borderRadius: "0.35rem",
    fontSize: "0.72rem",
    fontWeight: "800",
  },
  unitPriceText: {
    fontSize: "0.75rem",
    color: "#94a3b8",
  },
  stepperWrap: {
    display: "flex",
    alignItems: "center",
  },
  stepper: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "rgba(11, 18, 32, 0.8)",
    borderRadius: "0.65rem",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    overflow: "hidden",
  },
  stepBtn: {
    width: "36px",
    height: "36px",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    border: "none",
    color: "#f8fafc",
    fontWeight: "900",
    fontSize: "1.1rem",
    cursor: "pointer",
    minHeight: "36px",
  },
  qtyText: {
    padding: "0 0.85rem",
    fontWeight: "900",
    fontSize: "0.95rem",
    color: "#f8fafc",
  },
  itemRight: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem",
    marginLeft: "auto",
  },
  linePrice: {
    fontWeight: "900",
    color: "#34d399",
    fontSize: "1.2rem",
  },
  removeBtn: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.25)",
    color: "#ef4444",
    width: "32px",
    height: "32px",
    borderRadius: "0.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.85rem",
    cursor: "pointer",
    minHeight: "32px",
  },
};

export default CartTable;
