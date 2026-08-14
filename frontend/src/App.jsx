import React, { useState, useContext, useEffect } from "react";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Camera from "./pages/Camera";
import Billing from "./pages/Billing";

function MainContent() {
  const { user, loading, logout } = useContext(AuthContext);
  const [view, setView] = useState("login"); // "login" | "register"
  const [activeTab, setActiveTab] = useState("welcome"); // "welcome" | "camera" | "billing" | "products" | "dashboard"
  const [cartItems, setCartItems] = useState([]);
  const [cartBadgeAnimate, setCartBadgeAnimate] = useState(false);

  // Auto-add & merge AI detected products into active shopping cart
  const handleAddDetectionsToCart = (input) => {
    if (!input) return;

    // Trigger cart badge pop animation
    setCartBadgeAnimate(true);
    setTimeout(() => setCartBadgeAnimate(false), 400);

    setCartItems((prevItems) => {
      const newCart = [...prevItems];

      // Handle single product item object
      if (!Array.isArray(input) && typeof input === "object") {
        const name = input.name || "Unknown Product";
        const price = input.price !== undefined ? input.price : 20.0;
        const brand = input.brand || "Generic";
        const category = input.category || "General";
        const similarity = input.similarity !== undefined ? input.similarity : 1.0;
        const productId = input.product || input.productId || input._id || null;

        const existingIdx = newCart.findIndex(
          (item) => item.name.toLowerCase() === name.toLowerCase() || (productId && item.product === productId)
        );

        if (existingIdx >= 0) {
          newCart[existingIdx].quantity += (input.quantity || 1);
        } else {
          newCart.push({
            product: productId,
            name,
            brand,
            price,
            quantity: input.quantity || 1,
            similarity,
            category,
            status: input.status || "Match Confirmed",
          });
        }
        return newCart;
      }

      // Handle array of detections
      const detections = Array.isArray(input) ? input : [];
      const validDetections = detections.filter((det) => det.match && det.match.matched);
      if (validDetections.length === 0) return newCart;

      validDetections.forEach((det) => {
        const matchData = det.match || {};
        const vlmData = det.vlm || {};
        const name = matchData.name || vlmData.product_name || det.class_name || "Unknown Product";
        const price = matchData.price !== undefined ? matchData.price : 20.0;
        const brand = matchData.brand || vlmData.brand || "Generic";
        const category = matchData.category || vlmData.category || "General";
        const similarity = matchData.similarity !== undefined ? matchData.similarity : 1.0;
        const productId = matchData.product_id || matchData.productId || null;

        const existingIdx = newCart.findIndex(
          (item) => item.name.toLowerCase() === name.toLowerCase()
        );

        if (existingIdx >= 0) {
          newCart[existingIdx].quantity += 1;
        } else {
          newCart.push({
            product: productId,
            name,
            brand,
            price,
            quantity: 1,
            similarity,
            category,
            status: matchData.status || "Match Confirmed",
          });
        }
      });

      return newCart;
    });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", gap: "1rem" }}>
        <div className="spinner" style={{ width: "32px", height: "32px", borderWidth: "3px" }}></div>
        <div style={{ color: "#38bdf8", fontSize: "1.1rem", fontWeight: "700", letterSpacing: "0.05em" }}>
          INITIALIZING SMART TERMINAL...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "85vh" }}>
        {view === "login" ? (
          <Login onSwitchToRegister={() => setView("register")} />
        ) : (
          <Register onSwitchToLogin={() => setView("login")} />
        )}
      </div>
    );
  }

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div>
      {/* Top Navigation Bar */}
      <header style={navStyles.bar}>
        {/* Brand Identity */}
        <div style={navStyles.brandGroup} onClick={() => setActiveTab("welcome")} role="button" tabIndex={0}>
          <div style={navStyles.logoBadge}>🛒</div>
          <div>
            <div style={navStyles.brandTitle}>AI SMART CHECKOUT</div>
            <div style={navStyles.brandSub}>COMMERCIAL SUPERMARKET TERMINAL</div>
          </div>
        </div>

        {/* Navigation Mode Tabs */}
        <nav style={navStyles.tabsWrapper}>
          {/* Customer Experience Tabs */}
          <div style={navStyles.tabGroup}>
            <button
              onClick={() => setActiveTab("welcome")}
              style={activeTab === "welcome" ? navStyles.activeTab : navStyles.tab}
              className="touch-btn"
            >
              <span>🏠</span>
              <span>Home</span>
            </button>
            <button
              onClick={() => setActiveTab("camera")}
              style={activeTab === "camera" ? navStyles.activeTab : navStyles.tab}
              className="touch-btn"
            >
              <span>📹</span>
              <span>Smart Scanner</span>
            </button>
            <button
              onClick={() => setActiveTab("billing")}
              style={activeTab === "billing" ? navStyles.activeTab : navStyles.tab}
              className="touch-btn"
            >
              <span>🛒</span>
              <span>Smart Cart</span>
              {totalCartCount > 0 && (
                <span
                  style={{
                    ...navStyles.cartBadge,
                    transform: cartBadgeAnimate ? "scale(1.3)" : "scale(1)",
                  }}
                  className={cartBadgeAnimate ? "cart-pop" : ""}
                >
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>

          <div style={navStyles.groupDivider}></div>

          {/* Staff & Admin Experience Tabs */}
          <div style={navStyles.tabGroup}>
            <button
              onClick={() => setActiveTab("products")}
              style={activeTab === "products" ? navStyles.activeTab : navStyles.tab}
              className="touch-btn"
            >
              <span>📦</span>
              <span>Inventory</span>
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              style={activeTab === "dashboard" ? navStyles.activeTab : navStyles.tab}
              className="touch-btn"
            >
              <span>📊</span>
              <span>Dashboard</span>
            </button>
          </div>
        </nav>

        {/* User Session & Logout */}
        <div style={navStyles.userGroup}>
          <div style={navStyles.onlineDot}></div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#f8fafc", fontWeight: "700", fontSize: "0.85rem" }}>{user.name}</span>
            <span style={navStyles.roleBadge}>{user.role || "Retail Staff"}</span>
          </div>
          <button
            onClick={logout}
            style={navStyles.logoutMiniBtn}
            title="Sign out of terminal"
          >
            🚪
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main style={{ minHeight: "calc(100vh - 120px)" }}>
        {activeTab === "welcome" ? (
          <Welcome
            onStartShopping={() => setActiveTab("camera")}
            onGoToInventory={() => setActiveTab("products")}
            onGoToDashboard={() => setActiveTab("dashboard")}
          />
        ) : activeTab === "camera" ? (
          <Camera
            onAddToCart={handleAddDetectionsToCart}
            cartCount={totalCartCount}
            onGoToCart={() => setActiveTab("billing")}
          />
        ) : activeTab === "billing" ? (
          <Billing
            cartItems={cartItems}
            setCartItems={setCartItems}
            onBackToScanner={() => setActiveTab("camera")}
          />
        ) : activeTab === "products" ? (
          <Products />
        ) : (
          <Dashboard />
        )}
      </main>
    </div>
  );
}

const navStyles = {
  bar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    backdropFilter: "blur(20px)",
    padding: "0.75rem 1.5rem",
    borderRadius: "1.25rem",
    marginBottom: "1.5rem",
    border: "1px solid rgba(56, 189, 248, 0.2)",
    boxShadow: "0 15px 35px -10px rgba(0, 0, 0, 0.7)",
    flexWrap: "wrap",
    gap: "1rem",
  },
  brandGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.85rem",
    cursor: "pointer",
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
  groupDivider: {
    width: "1px",
    height: "24px",
    backgroundColor: "rgba(51, 65, 85, 0.6)",
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
    minHeight: "42px",
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
    minHeight: "42px",
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
  userGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    backgroundColor: "rgba(11, 18, 32, 0.7)",
    padding: "0.4rem 0.85rem",
    borderRadius: "0.85rem",
    border: "1px solid rgba(51, 65, 85, 0.6)",
  },
  onlineDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#10b981",
    boxShadow: "0 0 8px #10b981",
  },
  roleBadge: {
    fontSize: "0.65rem",
    fontWeight: "800",
    color: "#38bdf8",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  logoutMiniBtn: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#fca5a5",
    padding: "0.35rem 0.6rem",
    borderRadius: "0.5rem",
    cursor: "pointer",
    fontSize: "0.85rem",
    transition: "all 0.2s ease",
  },
};

function App() {
  return (
    <AuthProvider>
      <div style={{ minHeight: "100vh", backgroundColor: "#070b12", color: "#f8fafc", padding: "1.25rem 1.75rem" }}>
        <MainContent />
      </div>
    </AuthProvider>
  );
}

export default App;
