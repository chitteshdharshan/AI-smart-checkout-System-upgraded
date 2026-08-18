import React, { useContext, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function OwnerLayout() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/owner/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/owner/dashboard", icon: "📊" },
    { label: "Products", path: "/owner/products", icon: "📦" },
    { label: "Inventory", path: "/owner/inventory", icon: "📋" },
    { label: "Transactions", path: "/owner/transactions", icon: "💳" },
    { label: "Analytics", path: "/owner/analytics", icon: "📈" },
  ];

  const aiSystemItems = [
    { label: "Vision Detection", engine: "YOLOv8 Real-time", status: "Active", icon: "🎯" },
    { label: "OCR Recognition", engine: "EasyOCR Neural", status: "Active", icon: "🔤" },
    { label: "Qwen2.5-VL", engine: "Multimodal AI", status: "Active", icon: "🧠" },
    { label: "Vector Search", engine: "FAISS Index", status: "Active", icon: "⚡" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div style={styles.container}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div style={styles.mobileOverlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Owner Sidebar */}
      <aside
        style={{
          ...styles.sidebar,
          ...(sidebarOpen ? styles.sidebarMobileOpen : {}),
        }}
        className="cyber-glass"
      >
        {/* Brand Header */}
        <div style={styles.brandHeader}>
          <div style={styles.logoBadge}>🛒</div>
          <div>
            <div style={styles.brandTitle}>SMART AI CHECKOUT</div>
            <div style={styles.brandSubtitle}>OWNER & ADMIN PORTAL</div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div style={styles.navSectionsWrapper}>
          {/* Main Operations Section */}
          <div style={styles.sectionHeader}>MANAGEMENT & OPS</div>
          <div style={styles.navGroup}>
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={active ? styles.navItemActive : styles.navItem}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span style={styles.navIcon}>{item.icon}</span>
                  <span style={styles.navLabel}>{item.label}</span>
                  {active && <span style={styles.activeDot} />}
                </Link>
              );
            })}
          </div>

          <div style={styles.divider} />

          {/* AI System Status Section */}
          <div style={styles.sectionHeader}>
            <span>AI SYSTEM PIPELINE</span>
            <span style={styles.pipelineLive}>LIVE</span>
          </div>

          <div style={styles.aiStatusList}>
            {aiSystemItems.map((ai, idx) => (
              <div key={idx} style={styles.aiStatusItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.95rem" }}>{ai.icon}</span>
                  <div>
                    <div style={styles.aiName}>{ai.label}</div>
                    <div style={styles.aiEngine}>{ai.engine}</div>
                  </div>
                </div>
                <div style={styles.aiOnlinePill}>
                  <span style={styles.onlineDot} />
                  <span>{ai.status}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.divider} />

          {/* Settings & Links Section */}
          <div style={styles.sectionHeader}>SYSTEM & CONFIG</div>
          <div style={styles.navGroup}>
            <Link
              to="/owner/settings"
              style={isActive("/owner/settings") ? styles.navItemActive : styles.navItem}
              onClick={() => setSidebarOpen(false)}
            >
              <span style={styles.navIcon}>⚙️</span>
              <span style={styles.navLabel}>Settings</span>
              {isActive("/owner/settings") && <span style={styles.activeDot} />}
            </Link>

            <Link
              to="/checkout"
              style={styles.customerSwitchItem}
              target="_blank"
              rel="noopener noreferrer"
              title="Launch Customer Self-Checkout Terminal"
            >
              <span style={styles.navIcon}>🛒</span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: "800", color: "#38bdf8" }}>Customer Checkout</span>
                <span style={{ fontSize: "0.68rem", color: "#64748b" }}>Open terminal view ↗</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Sidebar Footer User Info & Logout */}
        <div style={styles.sidebarFooter}>
          <div style={styles.userInfoBox}>
            <div style={styles.userAvatar}>
              {(user?.name || "O").charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.userName}>{user?.name || "Store Owner"}</div>
              <div style={styles.userRole}>{user?.role || "Administrator"}</div>
            </div>
            <button
              onClick={handleLogout}
              style={styles.logoutBtn}
              title="Sign out of owner portal"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={styles.mainArea}>
        {/* Top Header Bar */}
        <header style={styles.topNav} className="cyber-glass">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              style={styles.mobileMenuToggle}
              aria-label="Toggle Navigation Sidebar"
            >
              ☰
            </button>

            <div>
              <div style={styles.topNavTitle}>
                {navItems.find((item) => isActive(item.path))?.label ||
                  (location.pathname === "/owner/settings" ? "Settings" : "Owner Portal")}
              </div>
              <div style={styles.topNavSubtitle}>
                AI Smart Supermarket Operational Management System
              </div>
            </div>
          </div>

          <div style={styles.topNavRight}>
            <div style={styles.serverStatusTag}>
              <span style={styles.serverPulse} />
              <span>AI BACKEND ONLINE</span>
            </div>

            <Link to="/checkout" style={styles.launchTerminalBtn} className="touch-btn">
              <span>🛒 Open Customer Terminal</span>
            </Link>

            <button onClick={handleLogout} style={styles.topLogoutBtn} className="touch-btn">
              <span>🚪 Logout</span>
            </button>
          </div>
        </header>

        {/* Render Active Owner Sub-Page */}
        <main style={styles.contentBody}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#070b12",
    color: "#f8fafc",
    position: "relative",
  },
  sidebar: {
    width: "280px",
    minWidth: "280px",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid rgba(56, 189, 248, 0.18)",
    backgroundColor: "rgba(11, 18, 32, 0.95)",
    backdropFilter: "blur(20px)",
    height: "100vh",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  sidebarMobileOpen: {
    transform: "translateX(0)",
  },
  mobileOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    backdropFilter: "blur(4px)",
    zIndex: 99,
  },
  brandHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.85rem",
    padding: "1.25rem 1.25rem 1rem",
    borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
  },
  logoBadge: {
    width: "42px",
    height: "42px",
    borderRadius: "0.75rem",
    background: "linear-gradient(135deg, #0284c7, #6366f1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.3rem",
    boxShadow: "0 0 15px rgba(56, 189, 248, 0.35)",
    flexShrink: 0,
  },
  brandTitle: {
    fontSize: "1.05rem",
    fontWeight: "900",
    letterSpacing: "0.03em",
    background: "linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  brandSubtitle: {
    fontSize: "0.62rem",
    color: "#64748b",
    fontWeight: "800",
    letterSpacing: "0.1em",
  },
  navSectionsWrapper: {
    flex: 1,
    overflowY: "auto",
    padding: "1rem 0.85rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  sectionHeader: {
    fontSize: "0.68rem",
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: "0.08em",
    padding: "0.4rem 0.6rem 0.2rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pipelineLive: {
    fontSize: "0.6rem",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#34d399",
    padding: "0.1rem 0.4rem",
    borderRadius: "0.3rem",
    fontWeight: "800",
    border: "1px solid rgba(16, 185, 129, 0.3)",
  },
  navGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.65rem 0.85rem",
    borderRadius: "0.75rem",
    color: "#94a3b8",
    textDecoration: "none",
    fontSize: "0.88rem",
    fontWeight: "700",
    transition: "all 0.2s ease",
  },
  navItemActive: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.65rem 0.85rem",
    borderRadius: "0.75rem",
    background: "linear-gradient(135deg, rgba(2, 132, 199, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%)",
    border: "1px solid rgba(56, 189, 248, 0.4)",
    color: "#ffffff",
    textDecoration: "none",
    fontSize: "0.88rem",
    fontWeight: "800",
    boxShadow: "0 0 15px rgba(2, 132, 199, 0.2)",
    position: "relative",
  },
  activeDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#38bdf8",
    marginLeft: "auto",
    boxShadow: "0 0 8px #38bdf8",
  },
  navIcon: {
    fontSize: "1.1rem",
  },
  navLabel: {
    flex: 1,
  },
  divider: {
    height: "1px",
    backgroundColor: "rgba(51, 65, 85, 0.4)",
    margin: "0.6rem 0.5rem",
  },
  aiStatusList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  aiStatusItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(11, 18, 32, 0.5)",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.65rem",
    border: "1px solid rgba(51, 65, 85, 0.3)",
  },
  aiName: {
    fontSize: "0.78rem",
    fontWeight: "700",
    color: "#cbd5e1",
  },
  aiEngine: {
    fontSize: "0.65rem",
    color: "#64748b",
  },
  aiOnlinePill: {
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
    fontSize: "0.65rem",
    fontWeight: "800",
    color: "#34d399",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    padding: "0.15rem 0.45rem",
    borderRadius: "0.4rem",
  },
  onlineDot: {
    width: "5px",
    height: "5px",
    borderRadius: "50%",
    backgroundColor: "#10b981",
  },
  customerSwitchItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.65rem 0.85rem",
    borderRadius: "0.75rem",
    backgroundColor: "rgba(2, 132, 199, 0.1)",
    border: "1px dashed rgba(56, 189, 248, 0.35)",
    textDecoration: "none",
    fontSize: "0.85rem",
    marginTop: "0.25rem",
  },
  sidebarFooter: {
    padding: "0.85rem 1rem",
    borderTop: "1px solid rgba(51, 65, 85, 0.4)",
    backgroundColor: "rgba(11, 18, 32, 0.8)",
  },
  userInfoBox: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  userAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "0.6rem",
    background: "linear-gradient(135deg, #0284c7, #38bdf8)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "0.95rem",
  },
  userName: {
    fontSize: "0.85rem",
    fontWeight: "800",
    color: "#f8fafc",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  userRole: {
    fontSize: "0.68rem",
    color: "#38bdf8",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  logoutBtn: {
    padding: "0.4rem 0.55rem",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#fca5a5",
    borderRadius: "0.5rem",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  mainArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    overflowX: "hidden",
  },
  topNav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.85rem 1.75rem",
    borderBottom: "1px solid rgba(56, 189, 248, 0.15)",
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    backdropFilter: "blur(20px)",
    position: "sticky",
    top: 0,
    zIndex: 90,
    flexWrap: "wrap",
    gap: "1rem",
  },
  mobileMenuToggle: {
    display: "none",
    background: "none",
    border: "1px solid rgba(51, 65, 85, 0.6)",
    color: "#cbd5e1",
    fontSize: "1.2rem",
    padding: "0.3rem 0.6rem",
    borderRadius: "0.5rem",
    cursor: "pointer",
  },
  topNavTitle: {
    fontSize: "1.15rem",
    fontWeight: "900",
    color: "#f8fafc",
    letterSpacing: "-0.01em",
  },
  topNavSubtitle: {
    fontSize: "0.72rem",
    color: "#94a3b8",
  },
  topNavRight: {
    display: "flex",
    alignItems: "center",
    gap: "0.85rem",
    flexWrap: "wrap",
  },
  serverStatusTag: {
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
  serverPulse: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#10b981",
    boxShadow: "0 0 8px #10b981",
  },
  launchTerminalBtn: {
    padding: "0.5rem 1rem",
    background: "linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)",
    color: "#ffffff",
    border: "1px solid #38bdf8",
    borderRadius: "0.65rem",
    fontSize: "0.82rem",
    fontWeight: "800",
    textDecoration: "none",
    boxShadow: "0 4px 15px rgba(2, 132, 199, 0.3)",
    minHeight: "36px",
  },
  topLogoutBtn: {
    padding: "0.5rem 0.95rem",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    color: "#fca5a5",
    borderRadius: "0.65rem",
    fontSize: "0.82rem",
    fontWeight: "800",
    cursor: "pointer",
    minHeight: "36px",
  },
  contentBody: {
    flex: 1,
    padding: "1.5rem 1.75rem 3rem",
    maxWidth: "1400px",
    width: "100%",
    margin: "0 auto",
  },
};

export default OwnerLayout;
