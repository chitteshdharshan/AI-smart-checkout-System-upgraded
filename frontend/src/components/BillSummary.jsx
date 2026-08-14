import React from "react";

function BillSummary({ items, subtotal, tax, discount, grandTotal, paymentMethod, setPaymentMethod, onCheckout, processing, error }) {
  const itemCount = items.reduce((acc, curr) => acc + (curr.quantity || 1), 0);

  const methods = [
    { id: "AI-Scan", label: "⚡ AI-Scan", desc: "Face / Biometric" },
    { id: "UPI", label: "📱 UPI / QR", desc: "Instant Scan & Pay" },
    { id: "Card", label: "💳 Card", desc: "Tap & Pay NFC" },
    { id: "Cash", label: "💵 Cash", desc: "Terminal Dispenser" },
  ];

  return (
    <div style={styles.card} className="cyber-glass">
      <div style={styles.header}>
        <h3 style={styles.title}>ORDER SUMMARY</h3>
        <span style={styles.badge}>{itemCount} {itemCount === 1 ? "Item" : "Items"}</span>
      </div>

      {/* Financial Breakdown Rows */}
      <div style={styles.rows}>
        <div style={styles.row}>
          <span style={styles.label}>Items Subtotal</span>
          <span style={styles.val}>₹{subtotal.toFixed(2)}</span>
        </div>

        <div style={styles.row}>
          <span style={styles.label}>GST Tax (5%)</span>
          <span style={styles.val}>+ ₹{tax.toFixed(2)}</span>
        </div>

        {discount > 0 && (
          <div style={styles.row}>
            <span style={styles.label}>Promotional Discount</span>
            <span style={styles.discountVal}>- ₹{discount.toFixed(2)}</span>
          </div>
        )}

        <div style={styles.divider}></div>

        {/* Hero Total Card */}
        <div style={styles.totalBlock}>
          <span style={styles.totalLabel}>TOTAL TO PAY</span>
          <span style={styles.totalVal}>₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Method Selector Grid */}
      <div style={styles.paymentSection}>
        <label style={styles.paymentLabel}>SELECT PAYMENT METHOD</label>
        <div style={styles.methodsGrid}>
          {methods.map((method) => {
            const isSelected = paymentMethod === method.id;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => setPaymentMethod(method.id)}
                style={isSelected ? styles.methodActive : styles.methodBtn}
                className="touch-btn"
              >
                <div style={{ fontWeight: "800", fontSize: "0.88rem" }}>{method.label}</div>
                <div style={{ fontSize: "0.68rem", opacity: isSelected ? 0.9 : 0.6, marginTop: "0.15rem" }}>
                  {method.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {error && <div style={styles.errorBox}>❌ {error}</div>}

      {/* Primary Checkout Button */}
      <button
        onClick={onCheckout}
        disabled={processing || items.length === 0}
        style={items.length === 0 ? styles.checkoutDisabled : styles.checkoutBtn}
        className="touch-btn"
      >
        {processing ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="spinner" />
            <span>PROCESSING PAYMENT...</span>
          </div>
        ) : (
          `✔ PAY ₹${grandTotal.toFixed(2)} & FINISH`
        )}
      </button>

      <div style={styles.securityNote}>
        <span>🔒 256-Bit Encrypted Autonomous Checkout</span>
      </div>
    </div>
  );
}

const styles = {
  card: {
    borderRadius: "1.5rem",
    padding: "1.75rem",
    border: "1px solid rgba(56, 189, 248, 0.2)",
    color: "#f8fafc",
    boxShadow: "0 20px 45px -15px rgba(0, 0, 0, 0.7)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.25rem",
    paddingBottom: "0.75rem",
    borderBottom: "1px solid rgba(56, 189, 248, 0.15)",
  },
  title: {
    fontSize: "1.2rem",
    fontWeight: "900",
    color: "#f8fafc",
    letterSpacing: "0.03em",
  },
  badge: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    fontSize: "0.75rem",
    fontWeight: "800",
    padding: "0.25rem 0.65rem",
    borderRadius: "2rem",
    border: "1px solid rgba(56, 189, 248, 0.3)",
  },
  rows: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.92rem",
  },
  label: {
    color: "#94a3b8",
    fontWeight: "500",
  },
  val: {
    color: "#f8fafc",
    fontWeight: "700",
  },
  discountVal: {
    color: "#34d399",
    fontWeight: "800",
  },
  divider: {
    height: "1px",
    backgroundColor: "rgba(51, 65, 85, 0.6)",
    margin: "0.5rem 0",
  },
  totalBlock: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(11, 18, 32, 0.8)",
    padding: "1rem 1.25rem",
    borderRadius: "1rem",
    border: "1px solid rgba(16, 185, 129, 0.3)",
  },
  totalLabel: {
    fontSize: "0.95rem",
    fontWeight: "900",
    color: "#f8fafc",
    letterSpacing: "0.04em",
  },
  totalVal: {
    fontSize: "1.75rem",
    fontWeight: "900",
    color: "#34d399",
  },
  paymentSection: {
    marginTop: "1.5rem",
    marginBottom: "1.5rem",
  },
  paymentLabel: {
    fontSize: "0.75rem",
    color: "#38bdf8",
    fontWeight: "800",
    letterSpacing: "0.08em",
    display: "block",
    marginBottom: "0.75rem",
  },
  methodsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.65rem",
  },
  methodBtn: {
    padding: "0.75rem",
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    border: "1px solid rgba(51, 65, 85, 0.8)",
    color: "#cbd5e1",
    borderRadius: "0.75rem",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    minHeight: "58px",
    transition: "all 0.2s ease",
  },
  methodActive: {
    padding: "0.75rem",
    backgroundColor: "rgba(2, 132, 199, 0.25)",
    border: "1.5px solid #38bdf8",
    color: "#ffffff",
    borderRadius: "0.75rem",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    minHeight: "58px",
    boxShadow: "0 0 15px rgba(56, 189, 248, 0.25)",
  },
  errorBox: {
    backgroundColor: "rgba(69, 26, 26, 0.8)",
    border: "1px solid #f87171",
    color: "#fca5a5",
    padding: "0.75rem",
    borderRadius: "0.65rem",
    fontSize: "0.85rem",
    marginBottom: "1rem",
  },
  checkoutBtn: {
    width: "100%",
    padding: "1rem",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#ffffff",
    border: "1px solid #34d399",
    borderRadius: "0.85rem",
    fontSize: "1.05rem",
    fontWeight: "900",
    letterSpacing: "0.03em",
    cursor: "pointer",
    boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.5)",
    minHeight: "52px",
  },
  checkoutDisabled: {
    width: "100%",
    padding: "1rem",
    backgroundColor: "rgba(51, 65, 85, 0.5)",
    color: "#64748b",
    border: "1px solid rgba(71, 85, 105, 0.5)",
    borderRadius: "0.85rem",
    fontSize: "1rem",
    fontWeight: "800",
    cursor: "not-allowed",
    minHeight: "52px",
  },
  securityNote: {
    textAlign: "center",
    marginTop: "0.85rem",
    fontSize: "0.72rem",
    color: "#64748b",
  },
};

export default BillSummary;
