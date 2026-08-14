import React from "react";

function SalesChart({ trends = [] }) {
  if (!trends || trends.length === 0) return null;

  const maxSales = Math.max(...trends.map((t) => t.sales || 0), 100);

  return (
    <div style={styles.card} className="cyber-glass">
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>SALES & REVENUE TRENDS</h3>
          <p style={styles.subtitle}>Daily gross revenue & transaction cadence</p>
        </div>
        <div style={styles.badge}>Live Analytics</div>
      </div>

      <div style={styles.chartWrapper}>
        <svg style={styles.svg} viewBox="0 0 500 180">
          {/* Background Grid Lines */}
          <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(51, 65, 85, 0.4)" strokeDasharray="4 4" />
          <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(51, 65, 85, 0.4)" strokeDasharray="4 4" />
          <line x1="0" y1="130" x2="500" y2="130" stroke="rgba(51, 65, 85, 0.4)" strokeDasharray="4 4" />

          {/* Bar Charts */}
          {trends.map((item, idx) => {
            const barWidth = 32;
            const x = 30 + idx * 65;
            const height = ((item.sales || 0) / maxSales) * 105;
            const y = 140 - height;

            return (
              <g key={idx}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(6, height)}
                  rx="6"
                  fill="url(#gradientSalesCommercial)"
                />
                {/* Label Date */}
                <text x={x + barWidth / 2} y="162" fill="#94a3b8" fontSize="10" fontWeight="600" textAnchor="middle">
                  {item.date}
                </text>
                {/* Value tooltip */}
                <text x={x + barWidth / 2} y={y - 8} fill="#38bdf8" fontSize="11" fontWeight="800" textAnchor="middle">
                  ₹{item.sales}
                </text>
              </g>
            );
          })}

          <defs>
            <linearGradient id="gradientSalesCommercial" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
        </svg>
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
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    padding: "0.25rem 0.65rem",
    borderRadius: "2rem",
    fontSize: "0.72rem",
    fontWeight: "800",
    border: "1px solid rgba(56, 189, 248, 0.3)",
  },
  chartWrapper: {
    width: "100%",
    overflowX: "auto",
  },
  svg: {
    width: "100%",
    height: "180px",
  },
};

export default SalesChart;
