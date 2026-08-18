import React, { useState, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

function OwnerLogin() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || "/owner/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card} className="cyber-glass-card">
        {/* Brand Header */}
        <div style={styles.brandHeader}>
          <div style={styles.logoBadge}>🔐</div>
          <h2 style={styles.title}>OWNER PORTAL LOGIN</h2>
          <p style={styles.subtitle}>Supermarket Administration & Analytics Suite</p>
        </div>

        {error && <div style={styles.errorBox}>❌ {error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>OWNER / ADMIN EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@supermarket.ai"
              required
              style={styles.input}
              className="touch-btn"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
              className="touch-btn"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={loading ? styles.buttonDisabled : styles.button}
            className="touch-btn"
          >
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="spinner" />
                <span>AUTHENTICATING...</span>
              </div>
            ) : (
              "SIGN IN TO OWNER DASHBOARD →"
            )}
          </button>
        </form>

        <div style={styles.footerWrap}>
          <p style={styles.footerText}>
            Need a new Owner account?{" "}
            <Link to="/owner/register" style={styles.link}>
              Register Store Account
            </Link>
          </p>

          <div style={{ marginTop: "1rem" }}>
            <Link to="/" style={styles.customerLink}>
              ← Back to Customer Terminal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    minHeight: "85vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "1rem",
  },
  card: {
    padding: "2.5rem 2rem",
    borderRadius: "1.5rem",
    width: "100%",
    maxWidth: "450px",
    border: "1px solid rgba(56, 189, 248, 0.25)",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
  },
  brandHeader: {
    textAlign: "center",
    marginBottom: "1.75rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  logoBadge: {
    width: "56px",
    height: "56px",
    borderRadius: "1rem",
    background: "linear-gradient(135deg, #0284c7, #6366f1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.8rem",
    boxShadow: "0 0 25px rgba(56, 189, 248, 0.4)",
    marginBottom: "0.75rem",
  },
  title: {
    fontSize: "1.35rem",
    fontWeight: "900",
    color: "#f8fafc",
    letterSpacing: "0.04em",
    background: "linear-gradient(90deg, #38bdf8, #818cf8)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "0.8rem",
    color: "#94a3b8",
    marginTop: "0.25rem",
  },
  errorBox: {
    backgroundColor: "rgba(69, 26, 26, 0.8)",
    border: "1px solid #f87171",
    color: "#fca5a5",
    padding: "0.75rem",
    borderRadius: "0.75rem",
    marginBottom: "1.25rem",
    fontSize: "0.85rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  label: {
    fontSize: "0.72rem",
    color: "#38bdf8",
    fontWeight: "800",
    letterSpacing: "0.06em",
  },
  input: {
    padding: "0.85rem 1rem",
    backgroundColor: "rgba(11, 18, 32, 0.85)",
    border: "1px solid rgba(51, 65, 85, 0.8)",
    borderRadius: "0.75rem",
    color: "#f8fafc",
    fontSize: "0.95rem",
    outline: "none",
    width: "100%",
    minHeight: "48px",
  },
  button: {
    padding: "0.95rem",
    background: "linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)",
    color: "#ffffff",
    border: "1px solid #38bdf8",
    borderRadius: "0.75rem",
    fontSize: "0.92rem",
    fontWeight: "900",
    cursor: "pointer",
    boxShadow: "0 10px 25px -5px rgba(2, 132, 199, 0.5)",
    marginTop: "0.5rem",
    minHeight: "48px",
  },
  buttonDisabled: {
    padding: "0.95rem",
    backgroundColor: "rgba(51, 65, 85, 0.5)",
    color: "#64748b",
    border: "1px solid rgba(71, 85, 105, 0.5)",
    borderRadius: "0.75rem",
    fontSize: "0.92rem",
    fontWeight: "800",
    cursor: "not-allowed",
    marginTop: "0.5rem",
    minHeight: "48px",
  },
  footerWrap: {
    marginTop: "1.75rem",
    textAlign: "center",
    borderTop: "1px solid rgba(51, 65, 85, 0.5)",
    paddingTop: "1rem",
  },
  footerText: {
    fontSize: "0.85rem",
    color: "#94a3b8",
  },
  link: {
    color: "#38bdf8",
    textDecoration: "none",
    fontWeight: "800",
    marginLeft: "0.25rem",
  },
  customerLink: {
    fontSize: "0.78rem",
    color: "#64748b",
    textDecoration: "none",
    fontWeight: "700",
  },
};

export default OwnerLogin;
