import React, { useState, useEffect } from "react";
import axios from "axios";
import CartTable from "../components/CartTable";
import BillSummary from "../components/BillSummary";
import ReceiptModal from "../components/ReceiptModal";

function Billing({ cartItems, setCartItems, onBackToScanner }) {
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  const [paymentMethod, setPaymentMethod] = useState("AI-Scan");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [activeBill, setActiveBill] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Recalculate totals whenever cartItems or discount changes
  useEffect(() => {
    let sub = 0;
    cartItems.forEach((item) => {
      sub += (item.price || 0) * (item.quantity || 1);
    });

    const taxAmount = (Math.max(0, sub - discount) * 0.05);
    const total = Math.max(0, sub - discount) + taxAmount;

    setSubtotal(Number(sub.toFixed(2)));
    setTax(Number(taxAmount.toFixed(2)));
    setGrandTotal(Number(total.toFixed(2)));
  }, [cartItems, discount]);

  const handleUpdateQuantity = (index, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }

    const updated = [...cartItems];
    updated[index].quantity = newQty;
    setCartItems(updated);
  };

  const handleRemoveItem = (index) => {
    const updated = cartItems.filter((_, i) => i !== index);
    setCartItems(updated);
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setError("");
    setProcessing(true);

    try {
      const payload = {
        items: cartItems,
        discount: discount,
        paymentMethod: paymentMethod,
      };

      const res = await axios.post("http://localhost:5001/api/billing/checkout", payload);

      if (res.data.success) {
        setActiveBill(res.data.bill);
        setShowReceipt(true);
        setCartItems([]); // Clear active cart on success
      } else {
        setError(res.data.message || "Checkout failed");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError(err.response?.data?.message || err.message || "Checkout failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Header Bar */}
      <div style={styles.topHeader}>
        <div>
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            AUTONOMOUS SMART BILLING
          </div>
          <h2 style={styles.pageTitle}>Digital Cart & Instant Checkout</h2>
          <p style={styles.pageSubtitle}>
            Review verified items, choose your preferred payment method, and complete your order
          </p>
        </div>

        {onBackToScanner && (
          <button onClick={onBackToScanner} style={styles.backBtn} className="touch-btn">
            📹 ← Back to Scanner
          </button>
        )}
      </div>

      <div style={styles.grid}>
        {/* Cart Table Column */}
        <div style={{ flex: 1 }}>
          <CartTable
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
          />
        </div>

        {/* Financial Summary Column */}
        <div style={{ width: "100%", maxWidth: "420px" }}>
          <BillSummary
            items={cartItems}
            subtotal={subtotal}
            tax={tax}
            discount={discount}
            grandTotal={grandTotal}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            onCheckout={handleCheckout}
            processing={processing}
            error={error}
          />
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        bill={activeBill}
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        onNewShopping={onBackToScanner}
      />
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "0.5rem 0 2.5rem",
  },
  topHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.7rem",
    fontWeight: "800",
    letterSpacing: "0.08em",
    color: "#38bdf8",
    background: "rgba(56, 189, 248, 0.1)",
    border: "1px solid rgba(56, 189, 248, 0.25)",
    padding: "0.3rem 0.85rem",
    borderRadius: "2rem",
    marginBottom: "0.5rem",
  },
  badgeDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#38bdf8",
    boxShadow: "0 0 8px #38bdf8",
  },
  pageTitle: {
    fontSize: "1.85rem",
    fontWeight: "900",
    color: "#f8fafc",
    letterSpacing: "-0.02em",
  },
  pageSubtitle: {
    fontSize: "0.88rem",
    color: "#94a3b8",
    marginTop: "0.2rem",
  },
  backBtn: {
    padding: "0.65rem 1.25rem",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    color: "#f8fafc",
    borderRadius: "0.75rem",
    fontSize: "0.85rem",
    fontWeight: "700",
    cursor: "pointer",
  },
  grid: {
    display: "flex",
    gap: "1.75rem",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
};

export default Billing;
