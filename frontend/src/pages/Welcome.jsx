import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import heroVideo from "../assets/aismart.mp4";

function Welcome({ onStartShopping, onGoToCart }) {
  const navigate = useNavigate();
  const [videoError, setVideoError] = useState(false);

  const handleStartShopping = () => {
    if (onStartShopping) {
      onStartShopping();
    } else {
      navigate("/checkout");
    }
  };

  const handleGoToCart = () => {
    if (onGoToCart) {
      onGoToCart();
    } else {
      navigate("/checkout/cart");
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.heroContent}>
          <div style={styles.badgePill}>
            <span style={styles.pulseDot}></span>
            <span>NEXT-GEN AUTONOMOUS RETAIL PLATFORM</span>
          </div>

          <h1 style={styles.heroHeading}>
            WELCOME TO <br />
            <span style={styles.gradientText}>SMART AI CHECKOUT</span>
          </h1>

          <p style={styles.heroSubtext}>
            Shop smarter. Skip the queue. Real-time multi-product vision recognition, instant automated billing, and zero-wait checkout.
          </p>

          <div style={styles.ctaGroup}>
            <button
              onClick={handleStartShopping}
              style={styles.primaryCta}
              className="touch-btn"
            >
              <span>START SHOPPING</span>
              <span style={{ fontSize: "1.2rem", marginLeft: "0.5rem" }}>→</span>
            </button>

            <button
              onClick={() => scrollToSection("how-it-works")}
              style={styles.secondaryCta}
              className="touch-btn"
            >
              <span>HOW IT WORKS</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div style={styles.heroMetrics}>
            <div style={styles.metricItem}>
              <span style={styles.metricNum}>&lt;300ms</span>
              <span style={styles.metricLabel}>AI Recognition</span>
            </div>
            <div style={styles.metricDivider}></div>
            <div style={styles.metricItem}>
              <span style={styles.metricNum}>98.5%</span>
              <span style={styles.metricLabel}>Match Accuracy</span>
            </div>
            <div style={styles.metricDivider}></div>
            <div style={styles.metricItem}>
              <span style={styles.metricNum}>100%</span>
              <span style={styles.metricLabel}>Touchless & Autonomous</span>
            </div>
          </div>
        </div>

        {/* Video Hero Visual Showcase */}
        <div style={styles.heroVisual}>
          <div style={styles.videoCard} className="cyber-glass-card">
            {/* Top HUD Badge Overlay */}
            <div style={styles.videoTopOverlay}>
              <div style={styles.videoStatusBadge}>
                <span style={styles.livePulseDot}></span>
                <span>AI VISION ACTIVE</span>
              </div>
              <div style={styles.videoStreamBadge}>1080P PRO DEMO</div>
            </div>

            {/* Subtle Scanning Laser Line Overlay */}
            <div className="laser-line" style={{ opacity: 0.6 }} />

            {/* Video Player */}
            {!videoError ? (
              <video
                autoPlay
                muted
                loop
                playsInline
                onError={() => setVideoError(true)}
                style={styles.heroVideo}
              >
                <source src={heroVideo} type="video/mp4" />
                <source src="/videos/aismart.mp4" type="video/mp4" />
                Your browser does not support video playback.
              </video>
            ) : (
              <div style={styles.videoFallback}>
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📹</div>
                <div style={{ fontWeight: "800", color: "#f8fafc" }}>AI SMART CHECKOUT DEMO</div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.25rem" }}>Autonomous Vision Terminal</div>
              </div>
            )}

            {/* Bottom HUD Bar Overlay */}
            <div style={styles.videoBottomOverlay}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "#38bdf8", fontWeight: "800", fontSize: "0.78rem" }}>AI CHECKOUT SYSTEM</span>
                <span style={{ color: "#64748b", fontSize: "0.75rem" }}>•</span>
                <span style={{ color: "#cbd5e1", fontSize: "0.75rem" }}>Live Object Tracking</span>
              </div>
              <span style={{ color: "#34d399", fontWeight: "800", fontSize: "0.8rem" }}>✓ VERIFIED</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionSub}>AUTONOMOUS ARCHITECTURE</div>
          <h2 style={styles.sectionTitle}>How Smart AI Checkout Works</h2>
          <p style={styles.sectionDesc}>
            Experience a completely touchless shopping journey from vision capture to paperless receipt.
          </p>
        </div>

        <div style={styles.stepsGrid}>
          <div style={styles.stepCard} className="cyber-glass-card">
            <div style={styles.stepIconWrap}>
              <span style={styles.stepNumber}>01</span>
              <span style={styles.stepIcon}>📹</span>
            </div>
            <h3 style={styles.stepTitle}>Place In Vision Zone</h3>
            <p style={styles.stepBody}>
              Present your items in front of the camera terminal. No barcode orientation required—multi-angle vision detects products instantly.
            </p>
          </div>

          <div style={styles.stepCard} className="cyber-glass-card">
            <div style={styles.stepIconWrap}>
              <span style={styles.stepNumber}>02</span>
              <span style={styles.stepIcon}>🤖</span>
            </div>
            <h3 style={styles.stepTitle}>AI Neural Recognition</h3>
            <p style={styles.stepBody}>
              High-speed YOLOv8 object detection paired with VLM brand analysis and FAISS vector embeddings verifies the product in milliseconds.
            </p>
          </div>

          <div style={styles.stepCard} className="cyber-glass-card">
            <div style={styles.stepIconWrap}>
              <span style={styles.stepNumber}>03</span>
              <span style={styles.stepIcon}>🛒</span>
            </div>
            <h3 style={styles.stepTitle}>Instant Smart Cart</h3>
            <p style={styles.stepBody}>
              Item details, pricing, and live inventory levels sync in real-time. Quantities update smoothly with automated discounts applied.
            </p>
          </div>

          <div style={styles.stepCard} className="cyber-glass-card">
            <div style={styles.stepIconWrap}>
              <span style={styles.stepNumber}>04</span>
              <span style={styles.stepIcon}>💳</span>
            </div>
            <h3 style={styles.stepTitle}>1-Click Fast Checkout</h3>
            <p style={styles.stepBody}>
              Pay effortlessly via UPI, contactless Card, or Cash. Receive an itemized digital GST tax invoice and skip all checkout queues.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionSub}>ENTERPRISE SUPERMARKET TECH</div>
          <h2 style={styles.sectionTitle}>Built for High-Volume Commercial Retail</h2>
        </div>

        <div style={styles.featuresGrid}>
          <div style={styles.featureCard} className="cyber-glass">
            <div style={styles.featureHeader}>
              <div style={styles.featureIconBadge}>⚡</div>
              <h4 style={styles.featureTitle}>Multi-Product Concurrency</h4>
            </div>
            <p style={styles.featureText}>
              Scan individual or clustered grocery items simultaneously without confusing adjacent objects or customer hands.
            </p>
          </div>

          <div style={styles.featureCard} className="cyber-glass">
            <div style={styles.featureHeader}>
              <div style={styles.featureIconBadge}>🔒</div>
              <h4 style={styles.featureTitle}>Loss Prevention & Audit</h4>
            </div>
            <p style={styles.featureText}>
              Vector embedding cross-matching ensures scanned packaging matches store inventory databases with high confidence.
            </p>
          </div>

          <div style={styles.featureCard} className="cyber-glass">
            <div style={styles.featureHeader}>
              <div style={styles.featureIconBadge}>📊</div>
              <h4 style={styles.featureTitle}>Staff Operations Suite</h4>
            </div>
            <p style={styles.featureText}>
              Separate staff portal for real-time inventory management, stock thresholds, sales trends, and transaction history.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Call To Action Banner */}
      <section style={styles.bottomCtaSection}>
        <div style={styles.bottomCtaCard} className="cyber-glass-card">
          <div style={{ maxWidth: "600px" }}>
            <h2 style={styles.ctaTitle}>Ready to experience the future of checkout?</h2>
            <p style={styles.ctaSubtitle}>Launch the terminal scanner and experience touchless checkout right now.</p>
          </div>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button onClick={handleStartShopping} style={styles.primaryCta} className="touch-btn">
              LAUNCH CHECKOUT CAMERA →
            </button>
            <button onClick={handleGoToCart} style={styles.secondaryCta} className="touch-btn">
              VIEW SMART CART 🛒
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "1rem 0 3rem",
  },
  heroSection: {
    display: "grid",
    gridTemplateColumns: "1.05fr 0.95fr",
    gap: "2.5rem",
    alignItems: "center",
    minHeight: "75vh",
    padding: "1.5rem 0 2.5rem",
  },
  heroContent: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  badgePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.6rem",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    padding: "0.45rem 1rem",
    borderRadius: "2rem",
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "#38bdf8",
    letterSpacing: "0.06em",
    width: "fit-content",
  },
  pulseDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#38bdf8",
    boxShadow: "0 0 10px #38bdf8",
  },
  heroHeading: {
    fontSize: "3rem",
    fontWeight: "900",
    lineHeight: "1.15",
    color: "#f8fafc",
    letterSpacing: "-0.02em",
  },
  gradientText: {
    background: "linear-gradient(90deg, #38bdf8 0%, #818cf8 50%, #34d399 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  heroSubtext: {
    fontSize: "1.1rem",
    color: "#94a3b8",
    lineHeight: "1.6",
    maxWidth: "540px",
  },
  ctaGroup: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    marginTop: "0.5rem",
  },
  primaryCta: {
    padding: "0.85rem 2rem",
    background: "linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)",
    color: "#ffffff",
    border: "1px solid #38bdf8",
    borderRadius: "0.75rem",
    fontSize: "1rem",
    fontWeight: "800",
    letterSpacing: "0.03em",
    boxShadow: "0 10px 25px -5px rgba(2, 132, 199, 0.5)",
  },
  secondaryCta: {
    padding: "0.85rem 1.75rem",
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    color: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    borderRadius: "0.75rem",
    fontSize: "0.95rem",
    fontWeight: "700",
  },
  heroMetrics: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
    paddingTop: "1.5rem",
    borderTop: "1px solid rgba(51, 65, 85, 0.5)",
    marginTop: "1rem",
  },
  metricItem: {
    display: "flex",
    flexDirection: "column",
  },
  metricNum: {
    fontSize: "1.4rem",
    fontWeight: "800",
    color: "#f8fafc",
  },
  metricLabel: {
    fontSize: "0.75rem",
    color: "#64748b",
    fontWeight: "600",
  },
  metricDivider: {
    width: "1px",
    height: "28px",
    backgroundColor: "rgba(51, 65, 85, 0.8)",
  },
  heroVisual: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  videoCard: {
    position: "relative",
    width: "100%",
    maxWidth: "520px",
    height: "380px",
    borderRadius: "1.75rem",
    border: "1px solid rgba(56, 189, 248, 0.28)",
    boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.15)",
    overflow: "hidden",
    backgroundColor: "#050811",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  heroVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  videoFallback: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    color: "#94a3b8",
  },
  videoTopOverlay: {
    position: "absolute",
    top: "1rem",
    left: "1rem",
    right: "1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 15,
    pointerEvents: "none",
  },
  videoStatusBadge: {
    backgroundColor: "rgba(11, 18, 32, 0.85)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(56, 189, 248, 0.35)",
    padding: "0.35rem 0.75rem",
    borderRadius: "2rem",
    fontSize: "0.72rem",
    fontWeight: "800",
    color: "#38bdf8",
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.4)",
  },
  livePulseDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#34d399",
    boxShadow: "0 0 8px #34d399",
  },
  videoStreamBadge: {
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(51, 65, 85, 0.6)",
    padding: "0.25rem 0.6rem",
    borderRadius: "0.5rem",
    fontSize: "0.68rem",
    fontWeight: "700",
    color: "#94a3b8",
  },
  videoBottomOverlay: {
    position: "absolute",
    bottom: "0.85rem",
    left: "0.85rem",
    right: "0.85rem",
    backgroundColor: "rgba(11, 18, 32, 0.88)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(56, 189, 248, 0.2)",
    padding: "0.55rem 1rem",
    borderRadius: "0.75rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 15,
    pointerEvents: "none",
  },
  section: {
    padding: "4.5rem 0 2rem",
  },
  sectionHeader: {
    textAlign: "center",
    marginBottom: "3rem",
  },
  sectionSub: {
    fontSize: "0.8rem",
    color: "#38bdf8",
    fontWeight: "800",
    letterSpacing: "0.1em",
    marginBottom: "0.5rem",
  },
  sectionTitle: {
    fontSize: "2.2rem",
    fontWeight: "800",
    color: "#f8fafc",
  },
  sectionDesc: {
    fontSize: "1rem",
    color: "#94a3b8",
    maxWidth: "580px",
    margin: "0.75rem auto 0",
  },
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "1.5rem",
  },
  stepCard: {
    padding: "1.75rem",
    borderRadius: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
  },
  stepIconWrap: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepNumber: {
    fontSize: "1.4rem",
    fontWeight: "900",
    color: "rgba(56, 189, 248, 0.35)",
    fontFamily: "monospace",
  },
  stepIcon: {
    fontSize: "1.8rem",
  },
  stepTitle: {
    fontSize: "1.15rem",
    fontWeight: "800",
    color: "#f8fafc",
  },
  stepBody: {
    fontSize: "0.88rem",
    color: "#94a3b8",
    lineHeight: "1.5",
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1.5rem",
  },
  featureCard: {
    padding: "1.75rem",
    borderRadius: "1.25rem",
  },
  featureHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.85rem",
    marginBottom: "0.75rem",
  },
  featureIconBadge: {
    width: "36px",
    height: "36px",
    borderRadius: "0.5rem",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#38bdf8",
    fontSize: "1.1rem",
  },
  featureTitle: {
    fontSize: "1.05rem",
    fontWeight: "800",
    color: "#f8fafc",
  },
  featureText: {
    fontSize: "0.88rem",
    color: "#94a3b8",
    lineHeight: "1.5",
  },
  bottomCtaSection: {
    marginTop: "4rem",
  },
  bottomCtaCard: {
    padding: "2.5rem",
    borderRadius: "1.5rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "1.5rem",
  },
  ctaTitle: {
    fontSize: "1.75rem",
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: "0.5rem",
  },
  ctaSubtitle: {
    fontSize: "0.95rem",
    color: "#94a3b8",
  },
};

export default Welcome;
