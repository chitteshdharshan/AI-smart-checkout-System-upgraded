import React, { useState, useEffect } from "react";
import axios from "axios";
import ReceiptModal from "../../components/ReceiptModal";

function OwnerTransactions() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedBill, setSelectedBill] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5001/api/billing/history");
      if (res.data.success) {
        setBills(res.data.bills || []);
      }
    } catch (err) {
      console.error("Failed to load billing history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Compute metrics
  const totalRevenue = bills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
  const totalInvoices = bills.length;
  const totalItemsSold = bills.reduce(
    (sum, b) => sum + (b.items ? b.items.reduce((s, it) => s + (it.quantity || 1), 0) : 0),
    0
  );
  const avgTicketValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  // Filter bills
  const filteredBills = bills.filter((b) => {
    if (paymentFilter !== "all") {
      const method = (b.paymentMethod || "").toLowerCase();
      if (!method.includes(paymentFilter.toLowerCase())) return false;
    }

    if (keyword.trim()) {
      const q = keyword.toLowerCase();
      const matchInv = (b.billNumber || "").toLowerCase().includes(q);
      const matchUser = (b.user?.name || "").toLowerCase().includes(q);
      const matchItems = (b.items || []).some((it) => (it.name || "").toLowerCase().includes(q));
      if (!matchInv && !matchUser && !matchItems) return false;
    }

    return true;
  });

  const handleViewReceipt = (bill) => {
    setSelectedBill(bill);
    setShowReceipt(true);
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.topBar}>
        <div>
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            AUDIT INVOICES & REVENUE LEDGER
          </div>
          <h2 style={styles.pageTitle}>Transaction History</h2>
          <p style={styles.pageSubtitle}>
            Complete customer checkout logs, digital tax receipts, payment gateways, and order breakdowns
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            onClick={() => window.open("http://localhost:5001/api/analytics/export/csv", "_blank")}
            style={styles.exportBtn}
            className="touch-btn"
          >
            📥 Export CSV
          </button>
          <button onClick={fetchTransactions} style={styles.refreshBtn} className="touch-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard} className="cyber-glass-card">
          <div style={styles.kpiIconBlue}>💰</div>
          <div>
            <div style={styles.kpiLabel}>TOTAL SETTLED SALES</div>
            <div style={styles.kpiVal}>₹{totalRevenue.toFixed(2)}</div>
            <div style={styles.kpiSub}>Across {totalInvoices} Invoices</div>
          </div>
        </div>

        <div style={styles.kpiCard} className="cyber-glass-card">
          <div style={styles.kpiIconGreen}>🧾</div>
          <div>
            <div style={styles.kpiLabel}>COMPLETED CHECKOUTS</div>
            <div style={{ ...styles.kpiVal, color: "#34d399" }}>{totalInvoices}</div>
            <div style={styles.kpiSub}>100% Verified</div>
          </div>
        </div>

        <div style={styles.kpiCard} className="cyber-glass-card">
          <div style={styles.kpiIconIndigo}>🛍️</div>
          <div>
            <div style={styles.kpiLabel}>PRODUCTS SOLD</div>
            <div style={{ ...styles.kpiVal, color: "#818cf8" }}>{totalItemsSold}</div>
            <div style={styles.kpiSub}>Total Units Dispensed</div>
          </div>
        </div>

        <div style={styles.kpiCard} className="cyber-glass-card">
          <div style={styles.kpiIconYellow}>📊</div>
          <div>
            <div style={styles.kpiLabel}>AVG TRANSACTION VALUE</div>
            <div style={{ ...styles.kpiVal, color: "#fbbf24" }}>₹{avgTicketValue.toFixed(2)}</div>
            <div style={styles.kpiSub}>Average Ticket Size</div>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div style={styles.filterCard} className="cyber-glass">
        <div style={styles.filterRow}>
          <div style={{ flex: 1, minWidth: "220px" }}>
            <label style={styles.filterLabel}>🔍 SEARCH INVOICE # OR PRODUCT</label>
            <input
              type="text"
              placeholder="Search by invoice number (e.g. INV-2026...) or product..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={styles.filterInput}
              className="touch-btn"
            />
          </div>

          <div style={{ width: "220px" }}>
            <label style={styles.filterLabel}>💳 PAYMENT METHOD</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              style={styles.filterSelect}
              className="touch-btn"
            >
              <option value="all">All Payment Methods</option>
              <option value="AI-Scan">AI-Scan / Digital</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="Card">Credit / Debit Card</option>
              <option value="Cash">Cash at Counter</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div style={styles.tableCard} className="cyber-glass">
        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "#38bdf8" }}>
            <div className="spinner" style={{ width: "32px", height: "32px" }}></div>
            <div style={{ marginTop: "1rem", fontWeight: "700" }}>LOADING AUDIT TRANSACTIONS...</div>
          </div>
        ) : filteredBills.length === 0 ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>💳</div>
            <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "1.1rem" }}>
              No transactions found
            </div>
            <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Customer checkouts will appear here immediately after completion.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Invoice #</th>
                  <th style={styles.th}>Date & Time</th>
                  <th style={styles.th}>Items Count</th>
                  <th style={styles.th}>Subtotal</th>
                  <th style={styles.th}>GST (5%)</th>
                  <th style={styles.th}>Grand Total</th>
                  <th style={styles.th}>Payment</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.thRight}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((b) => {
                  const itemCount = b.items
                    ? b.items.reduce((acc, it) => acc + (it.quantity || 1), 0)
                    : 0;
                  const dateFormatted = new Date(b.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={b._id} style={styles.tr}>
                      <td style={styles.td}>
                        <code style={styles.invCode}>{b.billNumber || b._id}</code>
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{dateFormatted}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontWeight: "700", color: "#f8fafc" }}>{itemCount}</span> items
                      </td>
                      <td style={styles.td}>₹{(b.subtotal || 0).toFixed(2)}</td>
                      <td style={styles.td}>₹{(b.tax || 0).toFixed(2)}</td>
                      <td style={styles.td}>
                        <span style={{ color: "#34d399", fontWeight: "900", fontSize: "1rem" }}>
                          ₹{(b.grandTotal || 0).toFixed(2)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.paymentTag}>{b.paymentMethod || "AI-Scan"}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.statusTag}>✓ {b.paymentStatus || "Paid"}</span>
                      </td>
                      <td style={styles.tdRight}>
                        <button
                          onClick={() => handleViewReceipt(b)}
                          style={styles.viewReceiptBtn}
                          className="touch-btn"
                          title="View detailed digital invoice"
                        >
                          📄 View Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        bill={selectedBill}
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
      />
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
  },
  topBar: {
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
    marginTop: "0.25rem",
  },
  exportBtn: {
    padding: "0.65rem 1.25rem",
    backgroundColor: "rgba(2, 132, 199, 0.8)",
    color: "#ffffff",
    border: "1px solid #38bdf8",
    borderRadius: "0.75rem",
    fontSize: "0.85rem",
    fontWeight: "800",
    cursor: "pointer",
  },
  refreshBtn: {
    padding: "0.65rem 1rem",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    color: "#cbd5e1",
    borderRadius: "0.75rem",
    fontSize: "0.85rem",
    fontWeight: "700",
    cursor: "pointer",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.25rem",
    marginBottom: "1.75rem",
  },
  kpiCard: {
    padding: "1.25rem",
    borderRadius: "1.25rem",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    border: "1px solid rgba(56, 189, 248, 0.2)",
  },
  kpiIconBlue: {
    width: "44px",
    height: "44px",
    borderRadius: "0.75rem",
    backgroundColor: "rgba(2, 132, 199, 0.15)",
    color: "#38bdf8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.3rem",
    border: "1px solid rgba(56, 189, 248, 0.3)",
  },
  kpiIconGreen: {
    width: "44px",
    height: "44px",
    borderRadius: "0.75rem",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#34d399",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.3rem",
    border: "1px solid rgba(16, 185, 129, 0.3)",
  },
  kpiIconIndigo: {
    width: "44px",
    height: "44px",
    borderRadius: "0.75rem",
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    color: "#818cf8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.3rem",
    border: "1px solid rgba(99, 102, 241, 0.3)",
  },
  kpiIconYellow: {
    width: "44px",
    height: "44px",
    borderRadius: "0.75rem",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    color: "#fbbf24",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.3rem",
    border: "1px solid rgba(245, 158, 11, 0.3)",
  },
  kpiLabel: {
    fontSize: "0.68rem",
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: "0.06em",
  },
  kpiVal: {
    fontSize: "1.6rem",
    fontWeight: "900",
    color: "#f8fafc",
    lineHeight: "1.1",
    marginTop: "0.15rem",
  },
  kpiSub: {
    fontSize: "0.72rem",
    color: "#94a3b8",
    marginTop: "0.15rem",
  },
  filterCard: {
    padding: "1.25rem",
    borderRadius: "1.25rem",
    marginBottom: "1.5rem",
    border: "1px solid rgba(56, 189, 248, 0.18)",
  },
  filterRow: {
    display: "flex",
    gap: "1.25rem",
    alignItems: "flex-end",
    flexWrap: "wrap",
  },
  filterLabel: {
    fontSize: "0.7rem",
    color: "#38bdf8",
    display: "block",
    marginBottom: "0.4rem",
    fontWeight: "800",
    letterSpacing: "0.06em",
  },
  filterInput: {
    width: "100%",
    padding: "0.75rem 1rem",
    backgroundColor: "rgba(11, 18, 32, 0.85)",
    border: "1px solid rgba(51, 65, 85, 0.8)",
    borderRadius: "0.75rem",
    color: "#f8fafc",
    outline: "none",
    fontSize: "0.9rem",
    minHeight: "44px",
  },
  filterSelect: {
    width: "100%",
    padding: "0.75rem 1rem",
    backgroundColor: "rgba(11, 18, 32, 0.85)",
    border: "1px solid rgba(51, 65, 85, 0.8)",
    borderRadius: "0.75rem",
    color: "#f8fafc",
    outline: "none",
    fontSize: "0.85rem",
    minHeight: "44px",
    cursor: "pointer",
  },
  tableCard: {
    borderRadius: "1.25rem",
    overflow: "hidden",
    border: "1px solid rgba(56, 189, 248, 0.2)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  thRow: {
    backgroundColor: "rgba(11, 18, 32, 0.9)",
    borderBottom: "1px solid rgba(51, 65, 85, 0.8)",
  },
  th: {
    padding: "1rem 1.25rem",
    fontSize: "0.75rem",
    color: "#94a3b8",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  thRight: {
    padding: "1rem 1.25rem",
    fontSize: "0.75rem",
    color: "#94a3b8",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    textAlign: "right",
  },
  tr: {
    borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
    transition: "background-color 0.2s ease",
  },
  td: {
    padding: "1rem 1.25rem",
    fontSize: "0.9rem",
    color: "#cbd5e1",
    verticalAlign: "middle",
  },
  tdRight: {
    padding: "1rem 1.25rem",
    verticalAlign: "middle",
    textAlign: "right",
  },
  invCode: {
    backgroundColor: "rgba(11, 18, 32, 0.8)",
    padding: "0.3rem 0.6rem",
    borderRadius: "0.35rem",
    color: "#38bdf8",
    fontSize: "0.82rem",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    fontFamily: "monospace",
    fontWeight: "700",
  },
  paymentTag: {
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    color: "#cbd5e1",
    padding: "0.25rem 0.6rem",
    borderRadius: "0.4rem",
    fontSize: "0.78rem",
    border: "1px solid rgba(71, 85, 105, 0.6)",
  },
  statusTag: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#34d399",
    padding: "0.25rem 0.6rem",
    borderRadius: "0.4rem",
    fontSize: "0.78rem",
    fontWeight: "800",
    border: "1px solid rgba(16, 185, 129, 0.35)",
  },
  viewReceiptBtn: {
    padding: "0.45rem 0.85rem",
    backgroundColor: "rgba(2, 132, 199, 0.2)",
    border: "1px solid rgba(56, 189, 248, 0.4)",
    color: "#38bdf8",
    borderRadius: "0.5rem",
    fontSize: "0.82rem",
    fontWeight: "700",
    cursor: "pointer",
    minHeight: "36px",
  },
};

export default OwnerTransactions;
