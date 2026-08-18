import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

// Customer components & pages
import CustomerLayout from "./components/CustomerLayout";
import Welcome from "./pages/Welcome";
import Camera from "./pages/Camera";
import Billing from "./pages/Billing";

// Owner components & pages
import ProtectedRoute from "./components/ProtectedRoute";
import OwnerLayout from "./components/OwnerLayout";
import OwnerLogin from "./pages/owner/OwnerLogin";
import OwnerRegister from "./pages/owner/OwnerRegister";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerProducts from "./pages/owner/OwnerProducts";
import OwnerInventory from "./pages/owner/OwnerInventory";
import OwnerTransactions from "./pages/owner/OwnerTransactions";
import OwnerAnalytics from "./pages/owner/OwnerAnalytics";
import OwnerSettings from "./pages/owner/OwnerSettings";

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <div style={styles.appContainer}>
            <Routes>
              {/* ========================================================= */}
              {/* 1. CUSTOMER SIDE (Public - Direct Access, NO Login)       */}
              {/* ========================================================= */}
              <Route element={<CustomerLayout />}>
                <Route path="/" element={<Welcome />} />
                <Route path="/checkout" element={<Camera />} />
                <Route path="/checkout/cart" element={<Billing />} />
                <Route path="/checkout/payment" element={<Billing />} />
                <Route path="/checkout/receipt" element={<Billing />} />

                {/* Legacy / convenient redirects */}
                <Route path="/cart" element={<Navigate to="/checkout/cart" replace />} />
                <Route path="/billing" element={<Navigate to="/checkout/cart" replace />} />
              </Route>

              {/* ========================================================= */}
              {/* 2. OWNER AUTHENTICATION (Public Auth Views)               */}
              {/* ========================================================= */}
              <Route path="/owner/login" element={<OwnerLogin />} />
              <Route path="/owner/register" element={<OwnerRegister />} />

              {/* Helpful aliases */}
              <Route path="/login" element={<Navigate to="/owner/login" replace />} />
              <Route path="/register" element={<Navigate to="/owner/register" replace />} />

              {/* ========================================================= */}
              {/* 3. OWNER / ADMIN SIDE (Protected - Requires Owner Auth)   */}
              {/* ========================================================= */}
              <Route
                path="/owner"
                element={
                  <ProtectedRoute>
                    <OwnerLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/owner/dashboard" replace />} />
                <Route path="dashboard" element={<OwnerDashboard />} />
                <Route path="products" element={<OwnerProducts />} />
                <Route path="inventory" element={<OwnerInventory />} />
                <Route path="transactions" element={<OwnerTransactions />} />
                <Route path="analytics" element={<OwnerAnalytics />} />
                <Route path="settings" element={<OwnerSettings />} />
              </Route>

              {/* ========================================================= */}
              {/* 4. CATCH-ALL REDIRECT                                     */}
              {/* ========================================================= */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

const styles = {
  appContainer: {
    minHeight: "100vh",
    backgroundColor: "#070b12",
    color: "#f8fafc",
    padding: "1rem 1.5rem",
  },
};

export default App;
