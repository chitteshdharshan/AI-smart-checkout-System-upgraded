import React, { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner" style={{ width: "36px", height: "36px", borderWidth: "3px" }}></div>
        <div style={styles.loadingText}>VERIFYING OWNER CREDENTIALS...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/owner/login" state={{ from: location }} replace />;
  }

  return children;
}

const styles = {
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "75vh",
    gap: "1.25rem",
  },
  loadingText: {
    color: "#38bdf8",
    fontSize: "1.1rem",
    fontWeight: "800",
    letterSpacing: "0.06em",
  },
};

export default ProtectedRoute;
