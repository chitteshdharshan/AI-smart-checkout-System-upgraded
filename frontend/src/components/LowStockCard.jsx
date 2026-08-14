import React from "react";

function LowStockCard({ lowStockItems = [], onRestock }) {
  if (!lowStockItems || lowStockItems.length === 0) {
    return (
      <div style={styles.card} className="cyber-glass">
        <h3 style={styles.title}>INVENTORY ALERTS</h3>
        <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", color: "#34d399", fontSize: "0.95rem", fontWeight: "700" }}>
          ✅ All catalog products are well stocked!
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card} className="cyber-glass">
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>INVENTORY ALERTS</h3>
          <p style={styles.subtitle}>{lowStockItems.length} items require restocking</p>
        </div>
        <span style={styles.badge}>Action Required</span>
      </div>

      <div style={styles.list}>
        {lowStockItems.map((item) => (
          <div key={item._id} style={styles.row} className="cyber-glass-card">
            <div>
              <div style={styles.name}>{item.name}</div>
              <div style={styles.sub}>
                Price: ₹{item.price?.toFixed(2)} | SKU: {item.barcode || "N/A"}
              </div>
            </div>

            <div style={styles.rightGroup}>
              <span style={styles.stockBadge}>
                {item.stock} left
              </span>
              {onRestock && (
                <button onClick={() => onRestock(item._id)} style={styles.restockBtn} className="touch-btn">
                  + Restock
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  card: {
    borderRadius: "1.25rem",
    padding: "1.5rem",
    border: "1px solid rgba(56, 189, 248, 0.2)",
    height: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.25rem",
  },
  title: {
    fontSize: "1.05rem",
    fontWeight: "900",
    color: "#f8fafc",
    letterSpacing: "0.03em",
  },
  subtitle: {
    fontSize: "0.78rem",
    color: "#94a3b8",
    marginTop: "0.2rem",
  },
  badge: {
    backgroundColor: "rgba(251, 146, 60, 0.15)",
    color: "#fb923c",
    padding: "0.25rem 0.65rem",
    borderRadius: "2rem",
    fontSize: "0.72rem",
    fontWeight: "800",
    border: "1px solid rgba(251, 146, 60, 0.3)",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    maxHeight: "280px",
    overflowY: "auto",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.85rem 1rem",
    borderRadius: "0.75rem",
  },
  name: {
    fontWeight: "800",
    fontSize: "0.9rem",
    color: "#f8fafc",
  },
  sub: {
    fontSize: "0.75rem",
    color: "#94a3b8",
    marginTop: "0.2rem",
  },
  rightGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  stockBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#fca5a5",
    padding: "0.25rem 0.6rem",
    borderRadius: "0.4rem",
    fontSize: "0.75rem",
    fontWeight: "800",
  },
  restockBtn: {
    padding: "0.35rem 0.75rem",
    backgroundColor: "rgba(2, 132, 199, 0.8)",
    color: "#ffffff",
    border: "1px solid #38bdf8",
    borderRadius: "0.5rem",
    fontSize: "0.75rem",
    fontWeight: "800",
    cursor: "pointer",
    minHeight: "32px",
  },
};

export default LowStockCard;
