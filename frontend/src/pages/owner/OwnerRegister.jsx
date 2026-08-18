import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

function OwnerRegister() {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(name, email, password);
      navigate("/owner/dashboard", { replace: true });
    } catch (err) {
      const backendMessage = err.response?.data?.message;
      setError(backendMessage ? `Registration failed: ${backendMessage}` : "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card} className="cyber-glass-card">
        {/* Brand Header */}
        <div style={styles.brandHeader}>
          <div style={styles.logoBadge}>👑</div>
          <h2 style={styles.title}>REGISTER STORE OWNER</h2>
          <p style={styles.subtitle}>Create an Administrative Store Account</p>
        </div>

        {error && <div style={styles.errorBox}>❌ {error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>FULL NAME</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Store Administrator"
              required
              style={styles.input}
              className="touch-btn"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>OWNER EMAIL ADDRESS</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@supermarket.ai"
              required
              style={styles.input}
              className="touch-btn"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>PASSWORD (MIN 6 CHARACTERS)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
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
                <span>CREATING ACCOUNT...</span>
              </div>
            ) : (
              "REGISTER OWNER ACCOUNT →"
            )}
          </button>
        </form>

        <div style={styles.footerWrap}>
          <p style={styles.footerText}>
            Already registered as Owner?{" "}
            <Link to="/owner/login" style={styles.link}>
              Sign In here
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
    background: "linear-gradient(135deg, #10b981, #0284c7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.8rem",
    boxShadow: "0 0 25px rgba(16, 185, 129, 0.4)",
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
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#ffffff",
    border: "1px solid #34d399",
    borderRadius: "0.75rem",
    fontSize: "0.92rem",
    fontWeight: "900",
    cursor: "pointer",
    boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.5)",
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

export default OwnerRegister;
