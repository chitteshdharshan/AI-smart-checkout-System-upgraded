import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import KPICards from "../components/KPICards";
import SalesChart from "../components/SalesChart";
import LowStockCard from "../components/LowStockCard";

function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const [summary, setSummary] = useState({});
  const [trends, setTrends] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, trendRes, stockRes] = await Promise.all([
        axios.get("http://localhost:5001/api/analytics/summary"),
        axios.get("http://localhost:5001/api/analytics/sales-trends"),
        axios.get("http://localhost:5001/api/analytics/low-stock"),
      ]);

      if (sumRes.data.success) setSummary(sumRes.data.summary);
      if (trendRes.data.success) setTrends(trendRes.data.trends);
      if (stockRes.data.success) setLowStock(stockRes.data.products);
    } catch (err) {
      console.error("Error loading analytics dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleExportCSV = () => {
    window.open("http://localhost:5001/api/analytics/export/csv", "_blank");
  };

  return (
    <div style={styles.container}>
      {/* Executive Header */}
      <div style={styles.topHeader}>
        <div>
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            SUPERMARKET OPERATIONS SUITE
          </div>
          <h2 style={styles.pageTitle}>SMART AI RETAIL OPERATIONS</h2>
          <p style={styles.pageSubtitle}>
            Live revenue telemetry, AI neural accuracy metrics, and stock replenishments
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={handleExportCSV} style={styles.exportBtn} className="touch-btn">
            📥 Export Sales CSV
          </button>
          <button onClick={fetchDashboardData} style={styles.refreshBtn} className="touch-btn" title="Refresh metrics">
            🔄 Refresh
          </button>
          <button onClick={logout} style={styles.logoutBtn} className="touch-btn">
            🚪 Logout
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#38bdf8" }}>
          <div className="spinner" style={{ width: "32px", height: "32px" }}></div>
          <div style={{ marginTop: "1rem", fontWeight: "700" }}>LOADING OPERATIONS TELEMETRY...</div>
        </div>
      ) : (
        <>
          {/* KPI Metric Cards */}
          <KPICards summary={summary} />

          {/* Analytics Charts & Low Stock Alerts */}
          <div style={styles.grid}>
            <div style={{ flex: "1 1 500px" }}>
              <SalesChart trends={trends} />
            </div>
            <div style={{ flex: "1 1 340px" }}>
              <LowStockCard lowStockItems={lowStock} />
            </div>
          </div>

          {/* Cashier & Profile Information */}
          <div style={styles.profileBox} className="cyber-glass-card">
            <h3 style={styles.sectionTitle}>👤 Terminal Operator Session Profile</h3>
            <div style={styles.profileGrid}>
              <div style={styles.profileItem}>
                <span style={styles.profileLabel}>OPERATOR NAME:</span>
                <span style={styles.profileVal}>{user?.name}</span>
              </div>
              <div style={styles.profileItem}>
                <span style={styles.profileLabel}>STAFF EMAIL:</span>
                <span style={styles.profileVal}>{user?.email}</span>
              </div>
              <div style={styles.profileItem}>
                <span style={styles.profileLabel}>SECURITY ROLE:</span>
                <span style={styles.roleTag}>{user?.role || "Staff Operator"}</span>
              </div>
              <div style={styles.profileItem}>
                <span style={styles.profileLabel}>SESSION AUTH:</span>
                <span style={{ color: "#34d399", fontWeight: "700" }}>✓ Active JWT Bearer</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "0.5rem 0 3rem",
  },
  topHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "1.75rem",
    flexWrap: "wrap",
    gap: "1.25rem",
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
  exportBtn: {
    padding: "0.65rem 1.25rem",
    backgroundColor: "rgba(2, 132, 199, 0.8)",
    color: "#ffffff",
    border: "1px solid #38bdf8",
    borderRadius: "0.75rem",
    fontSize: "0.85rem",
    fontWeight: "800",
    cursor: "pointer",
  },
  refreshBtn: {
    padding: "0.65rem 1rem",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    color: "#cbd5e1",
    border: "1px solid rgba(51, 65, 85, 0.8)",
    borderRadius: "0.75rem",
    fontSize: "0.85rem",
    fontWeight: "700",
    cursor: "pointer",
  },
  logoutBtn: {
    padding: "0.65rem 1.25rem",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#fca5a5",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "0.75rem",
    fontSize: "0.85rem",
    fontWeight: "800",
    cursor: "pointer",
  },
  grid: {
    display: "flex",
    gap: "1.5rem",
    marginBottom: "1.75rem",
    flexWrap: "wrap",
  },
  profileBox: {
    padding: "1.5rem",
    borderRadius: "1.25rem",
    border: "1px solid rgba(56, 189, 248, 0.2)",
  },
  sectionTitle: {
    fontSize: "1.05rem",
    fontWeight: "800",
    marginBottom: "1rem",
    color: "#f8fafc",
  },
  profileGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.25rem",
  },
  profileItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  profileLabel: {
    fontSize: "0.68rem",
    color: "#64748b",
    fontWeight: "800",
    letterSpacing: "0.06em",
  },
  profileVal: {
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "#f8fafc",
  },
  roleTag: {
    display: "inline-block",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    padding: "0.2rem 0.6rem",
    borderRadius: "0.35rem",
    fontSize: "0.8rem",
    fontWeight: "800",
    width: "fit-content",
    border: "1px solid rgba(56, 189, 248, 0.3)",
  },
};

export default Dashboard;
