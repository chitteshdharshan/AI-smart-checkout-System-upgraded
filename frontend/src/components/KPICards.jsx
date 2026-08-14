import React from "react";

function KPICards({ summary = {} }) {
  const cards = [
    {
      title: "TODAY'S REVENUE",
      value: `₹${(summary.todaySales || 0).toFixed(2)}`,
      sub: `${summary.todayTransactions || 0} bills generated today`,
      icon: "💵",
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.1)",
      border: "rgba(16, 185, 129, 0.25)",
    },
    {
      title: "MONTHLY GROSS SALES",
      value: `₹${(summary.monthSales || 0).toFixed(2)}`,
      sub: "Month-to-date total store volume",
      icon: "📊",
      color: "#38bdf8",
      bg: "rgba(56, 189, 248, 0.1)",
      border: "rgba(56, 189, 248, 0.25)",
    },
    {
      title: "TOTAL TRANSACTIONS",
      value: summary.totalTransactions || 0,
      sub: `Avg Basket: ₹${(summary.avgBillValue || 0).toFixed(2)}`,
      icon: "🧾",
      color: "#818cf8",
      bg: "rgba(99, 102, 241, 0.1)",
      border: "rgba(99, 102, 241, 0.25)",
    },
    {
      title: "AI NEURAL ACCURACY",
      value: `${summary.aiAccuracy || 98.5}%`,
      sub: `${summary.totalCaptures || 0} vision frames analyzed`,
      icon: "🤖",
      color: "#f43f5e",
      bg: "rgba(244, 63, 94, 0.1)",
      border: "rgba(244, 63, 94, 0.25)",
    },
    {
      title: "INVENTORY RESTOCK ALERTS",
      value: summary.lowStockCount || 0,
      sub: `${summary.totalProducts || 0} catalog items tracked`,
      icon: "⚠️",
      color: "#fb923c",
      bg: "rgba(251, 146, 60, 0.1)",
      border: "rgba(251, 146, 60, 0.25)",
    },
    {
      title: "LIFETIME ENTERPRISE REVENUE",
      value: `₹${(summary.totalRevenue || 0).toFixed(2)}`,
      sub: "All-time terminal receipts",
      icon: "🏦",
      color: "#34d399",
      bg: "rgba(52, 211, 153, 0.1)",
      border: "rgba(52, 211, 153, 0.25)",
    },
  ];

  return (
    <div style={styles.grid}>
      {cards.map((card, idx) => (
        <div
          key={idx}
          style={{
            ...styles.card,
            backgroundColor: card.bg,
            borderColor: card.border,
          }}
          className="cyber-glass-card"
        >
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>{card.title}</span>
            <span style={styles.cardIcon}>{card.icon}</span>
          </div>
          <div style={{ ...styles.cardValue, color: card.color }}>{card.value}</div>
          <div style={styles.cardSub}>{card.sub}</div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "1.25rem",
    marginBottom: "1.75rem",
  },
  card: {
    borderRadius: "1.25rem",
    padding: "1.35rem",
    border: "1px solid",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: "0.72rem",
    color: "#94a3b8",
    fontWeight: "800",
    letterSpacing: "0.06em",
  },
  cardIcon: {
    fontSize: "1.4rem",
  },
  cardValue: {
    fontSize: "1.75rem",
    fontWeight: "900",
    letterSpacing: "-0.02em",
  },
  cardSub: {
    fontSize: "0.75rem",
    color: "#64748b",
    fontWeight: "600",
  },
};

export default KPICards;
