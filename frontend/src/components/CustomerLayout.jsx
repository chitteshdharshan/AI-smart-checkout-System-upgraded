import React from "react";
import { Outlet, Link } from "react-router-dom";
import CustomerNavbar from "./CustomerNavbar";

function CustomerLayout() {
  return (
    <div style={styles.layout}>
      <CustomerNavbar />

      <main style={styles.mainContent}>
        <Outlet />
      </main>

      {/* Customer Experience Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerBrand}>
            <div style={styles.footerLogo}>🛒</div>
            <div>
              <div style={styles.footerTitle}>SMART AI CHECKOUT SYSTEM</div>
              <div style={styles.footerDesc}>
                Autonomous Neural Vision Terminal • Instant Automated Billing • Zero Queue Retail
              </div>
            </div>
          </div>

          <div style={styles.footerRight}>
            <div style={styles.footerLinks}>
              <Link to="/" style={styles.footerLink}>Home</Link>
              <span style={styles.footerDivider}>•</span>
              <Link to="/checkout" style={styles.footerLink}>AI Scanner</Link>
              <span style={styles.footerDivider}>•</span>
              <Link to="/checkout/cart" style={styles.footerLink}>Smart Cart</Link>
            </div>

            <div style={styles.ownerLinkWrap}>
              <Link to="/owner/login" style={styles.ownerPortalBtn}>
                <span>🔐</span>
                <span>Owner & Staff Portal</span>
              </Link>
            </div>
          </div>
        </div>

        <div style={styles.footerCopyright}>
          © {new Date().getFullYear()} AI Smart Checkout Technologies. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

const styles = {
  layout: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
  mainContent: {
    flex: 1,
    width: "100%",
  },
  footer: {
    marginTop: "4rem",
    paddingTop: "2rem",
    borderTop: "1px solid rgba(56, 189, 248, 0.15)",
    backgroundColor: "rgba(11, 18, 32, 0.6)",
    borderRadius: "1.5rem 1.5rem 0 0",
    padding: "2rem 1.5rem 1.5rem",
  },
  footerInner: {
    maxWidth: "1280px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "1.5rem",
    paddingBottom: "1.5rem",
    borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
  },
  footerBrand: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  footerLogo: {
    width: "38px",
    height: "38px",
    borderRadius: "0.75rem",
    background: "linear-gradient(135deg, #0284c7, #6366f1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.2rem",
  },
  footerTitle: {
    fontSize: "0.95rem",
    fontWeight: "900",
    color: "#f8fafc",
    letterSpacing: "0.04em",
  },
  footerDesc: {
    fontSize: "0.75rem",
    color: "#94a3b8",
    marginTop: "0.2rem",
  },
  footerRight: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
    flexWrap: "wrap",
  },
  footerLinks: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  footerLink: {
    color: "#94a3b8",
    textDecoration: "none",
    fontSize: "0.82rem",
    fontWeight: "700",
    transition: "color 0.2s ease",
  },
  footerDivider: {
    color: "#475569",
    fontSize: "0.8rem",
  },
  ownerLinkWrap: {
    display: "flex",
    alignItems: "center",
  },
  ownerPortalBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.45rem",
    padding: "0.45rem 0.9rem",
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    border: "1px solid rgba(56, 189, 248, 0.25)",
    borderRadius: "0.6rem",
    color: "#38bdf8",
    fontSize: "0.78rem",
    fontWeight: "800",
    textDecoration: "none",
    transition: "all 0.2s ease",
  },
  footerCopyright: {
    textAlign: "center",
    paddingTop: "1.25rem",
    fontSize: "0.75rem",
    color: "#64748b",
  },
};

export default CustomerLayout;
