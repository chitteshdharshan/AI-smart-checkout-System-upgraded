import React from "react";

function ReceiptModal({ bill, isOpen, onClose, onNewShopping }) {
  if (!isOpen || !bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleStartNew = () => {
    onClose();
    if (onNewShopping) onNewShopping();
  };

  const invoiceId = bill.billNumber || `INV-${Math.floor(100000 + Math.random() * 900000)}`;
  const txnId = bill.transactionId || `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;

  return (
    <div style={styles.overlay}>
      <div style={styles.modalScroll}>
        <div style={styles.card} className="cyber-glass-card">
          {/* Payment Success Hero Banner */}
          <div style={styles.successBanner}>
            <div style={styles.checkCircle} className="success-check-anim">
              <span style={{ fontSize: "2rem", color: "#10b981", fontWeight: "900" }}>✓</span>
            </div>
            <h2 style={styles.successTitle}>PAYMENT SUCCESSFUL</h2>
            <div style={styles.successAmount}>₹{bill.grandTotal?.toFixed(2)}</div>
            <p style={styles.successSub}>Thank you for shopping with AI Smart Checkout!</p>
            <div style={styles.txnBadge}>Transaction ID: <strong>{txnId}</strong></div>
          </div>

          {/* Authentic Printable Thermal Receipt Card */}
          <div style={styles.receiptPaper} id="printable-receipt">
            {/* Store Header */}
            <div style={styles.storeHeader}>
              <div style={styles.storeName}>🛒 AI SMART SUPERMARKET</div>
              <div style={styles.storeSub}>Autonomous AI Vision Checkout Terminal #04</div>
              <div style={styles.storeSub}>GSTIN: 33AAAAA0000A1Z5</div>
              <div style={styles.receiptDivider}></div>
              <div style={styles.invMeta}>
                <div><strong>Invoice:</strong> {invoiceId}</div>
                <div><strong>Date:</strong> {new Date(bill.createdAt || Date.now()).toLocaleString()}</div>
              </div>
            </div>

            <div style={styles.receiptDivider}></div>

            {/* Itemized Table */}
            <table style={styles.receiptTable}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={{ textAlign: "left", width: "45%" }}>ITEM</th>
                  <th style={{ textAlign: "center", width: "15%" }}>QTY</th>
                  <th style={{ textAlign: "right", width: "20%" }}>PRICE</th>
                  <th style={{ textAlign: "right", width: "20%" }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {bill.items?.map((item, idx) => (
                  <tr key={idx} style={styles.tr}>
                    <td style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: "700" }}>{item.name}</div>
                      <div style={{ fontSize: "0.68rem", color: "#64748b" }}>{item.brand || "Standard"}</div>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: "700" }}>{item.quantity}</td>
                    <td style={{ textAlign: "right" }}>₹{item.price?.toFixed(2)}</td>
                    <td style={{ textAlign: "right", fontWeight: "700" }}>
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={styles.receiptDivider}></div>

            {/* Financial Summary Breakdown */}
            <div style={styles.totalsSection}>
              <div style={styles.row}>
                <span>Subtotal:</span>
                <span>₹{bill.subtotal?.toFixed(2)}</span>
              </div>
              <div style={styles.row}>
                <span>GST Tax (5%):</span>
                <span>₹{bill.tax?.toFixed(2)}</span>
              </div>
              {bill.discount > 0 && (
                <div style={styles.row}>
                  <span>Discount Savings:</span>
                  <span style={{ color: "#059669" }}>- ₹{bill.discount?.toFixed(2)}</span>
                </div>
              )}
              <div style={styles.grandTotalRow}>
                <span>TOTAL PAID:</span>
                <span>₹{bill.grandTotal?.toFixed(2)}</span>
              </div>
            </div>

            <div style={styles.receiptDivider}></div>

            {/* Verification Footer */}
            <div style={styles.footerMsg}>
              <div style={{ fontWeight: "700", color: "#0f172a" }}>
                Payment Method: {bill.paymentMethod || "AI-Scan"} (Verified)
              </div>
              <div style={styles.aiBadge}>✓ 100% AI Autonomous Checkout</div>
              <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "0.4rem" }}>
                Keep this digital receipt for warranty & returns.
              </div>
            </div>
          </div>

          {/* Action Buttons (48px touch targets) */}
          <div style={styles.actions}>
            <button onClick={handlePrint} style={styles.printBtn} className="touch-btn">
              🖨 Print Invoice
            </button>
            <button onClick={handleStartNew} style={styles.doneBtn} className="touch-btn">
              ✔ Start New Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(7, 11, 20, 0.88)",
    backdropFilter: "blur(12px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3000,
    padding: "1rem",
  },
  modalScroll: {
    maxHeight: "92vh",
    overflowY: "auto",
    width: "100%",
    maxWidth: "460px",
  },
  card: {
    borderRadius: "1.5rem",
    padding: "1.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  successBanner: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.4rem",
  },
  checkCircle: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    border: "2px solid #10b981",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 25px rgba(16, 185, 129, 0.4)",
    marginBottom: "0.25rem",
  },
  successTitle: {
    fontSize: "1.3rem",
    fontWeight: "900",
    color: "#f8fafc",
    letterSpacing: "0.04em",
  },
  successAmount: {
    fontSize: "2rem",
    fontWeight: "900",
    color: "#34d399",
  },
  successSub: {
    fontSize: "0.85rem",
    color: "#94a3b8",
  },
  txnBadge: {
    fontSize: "0.75rem",
    color: "#38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    padding: "0.25rem 0.65rem",
    borderRadius: "0.5rem",
    border: "1px solid rgba(56, 189, 248, 0.25)",
    marginTop: "0.25rem",
  },
  receiptPaper: {
    backgroundColor: "#ffffff",
    color: "#0f172a",
    padding: "1.5rem",
    borderRadius: "0.75rem",
    fontFamily: "'Inter', monospace, sans-serif",
    fontSize: "0.82rem",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
  },
  storeHeader: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "0.2rem",
  },
  storeName: {
    fontWeight: "900",
    fontSize: "1.1rem",
    color: "#0f172a",
    letterSpacing: "0.02em",
  },
  storeSub: {
    fontSize: "0.7rem",
    color: "#64748b",
  },
  invMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.72rem",
    color: "#475569",
    marginTop: "0.35rem",
  },
  receiptDivider: {
    borderTop: "1px dashed #cbd5e1",
    margin: "0.75rem 0",
  },
  receiptTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.78rem",
  },
  thRow: {
    borderBottom: "1px solid #94a3b8",
    color: "#475569",
    fontSize: "0.7rem",
    fontWeight: "800",
    paddingBottom: "0.35rem",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  totalsSection: {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
    fontSize: "0.8rem",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    color: "#475569",
  },
  grandTotalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "1.15rem",
    fontWeight: "900",
    color: "#0f172a",
    marginTop: "0.4rem",
    paddingTop: "0.4rem",
    borderTop: "1px solid #0f172a",
  },
  footerMsg: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
  },
  aiBadge: {
    display: "inline-block",
    backgroundColor: "#ecfdf5",
    color: "#059669",
    fontWeight: "800",
    fontSize: "0.72rem",
    padding: "0.2rem 0.6rem",
    borderRadius: "0.35rem",
    border: "1px solid #a7f3d0",
    marginTop: "0.25rem",
  },
  actions: {
    display: "flex",
    gap: "0.75rem",
  },
  printBtn: {
    flex: 1,
    padding: "0.85rem",
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    color: "#ffffff",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    borderRadius: "0.75rem",
    fontWeight: "800",
    fontSize: "0.88rem",
    cursor: "pointer",
    minHeight: "48px",
  },
  doneBtn: {
    flex: 1.2,
    padding: "0.85rem",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#ffffff",
    border: "1px solid #34d399",
    borderRadius: "0.75rem",
    fontWeight: "900",
    fontSize: "0.92rem",
    cursor: "pointer",
    boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)",
    minHeight: "48px",
  },
};

export default ReceiptModal;
