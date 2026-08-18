import React, { useState, useEffect } from "react";
import { getProducts, getCategories } from "../../services/productApi";
import EditProductModal from "../../components/EditProductModal";

function OwnerInventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // "all" | "in_stock" | "low_stock" | "out_of_stock"
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingProduct, setEditingProduct] = useState(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      setProducts(data.products || []);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    getCategories()
      .then((data) => setCategories(data.categories || []))
      .catch((err) => console.error(err));
  }, []);

  // Compute Inventory KPI metrics
  const totalProducts = products.length;
  const inStockCount = products.filter((p) => (p.stock || 0) >= 10).length;
  const lowStockCount = products.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) < 10).length;
  const outOfStockCount = products.filter((p) => (p.stock || 0) === 0).length;
  const totalStockUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalInventoryValue = products.reduce(
    (sum, p) => sum + (p.price || 0) * (p.stock || 0),
    0
  );

  // Filter products based on active filters
  const filteredProducts = products.filter((p) => {
    const stock = p.stock || 0;
    if (stockFilter === "in_stock" && stock < 10) return false;
    if (stockFilter === "low_stock" && (stock === 0 || stock >= 10)) return false;
    if (stockFilter === "out_of_stock" && stock > 0) return false;

    if (categoryFilter !== "all") {
      const catId = p.category?._id || p.category;
      if (catId !== categoryFilter) return false;
    }

    if (keyword.trim()) {
      const q = keyword.toLowerCase();
      const matchName = (p.name || "").toLowerCase().includes(q);
      const matchBarcode = (p.barcode || "").toLowerCase().includes(q);
      const matchAiClass = (p.aiClassId || "").toLowerCase().includes(q);
      if (!matchName && !matchBarcode && !matchAiClass) return false;
    }

    return true;
  });

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.topBar}>
        <div>
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            REAL-TIME INVENTORY & STOCK TRACKING
          </div>
          <h2 style={styles.pageTitle}>Inventory Management</h2>
          <p style={styles.pageSubtitle}>
            Monitor store stock levels, replenishment thresholds, stock values, and AI binding states
          </p>
        </div>

        <button onClick={fetchInventory} style={styles.refreshBtn} className="touch-btn">
          🔄 Refresh Stock Data
        </button>
      </div>

      {/* Inventory KPI Counters */}
      <div style={styles.kpiGrid}>
        <div
          style={{
            ...styles.kpiCard,
            borderColor: stockFilter === "all" ? "#38bdf8" : "rgba(56, 189, 248, 0.2)",
          }}
          className="cyber-glass-card"
          onClick={() => setStockFilter("all")}
          role="button"
          tabIndex={0}
        >
          <div style={styles.kpiIconWrapBlue}>📦</div>
          <div>
            <div style={styles.kpiLabel}>TOTAL PRODUCTS</div>
            <div style={styles.kpiVal}>{totalProducts}</div>
            <div style={styles.kpiSub}>{totalStockUnits} Total Units</div>
          </div>
        </div>

        <div
          style={{
            ...styles.kpiCard,
            borderColor: stockFilter === "in_stock" ? "#34d399" : "rgba(56, 189, 248, 0.2)",
          }}
          className="cyber-glass-card"
          onClick={() => setStockFilter("in_stock")}
          role="button"
          tabIndex={0}
        >
          <div style={styles.kpiIconWrapGreen}>✓</div>
          <div>
            <div style={styles.kpiLabel}>ADEQUATE STOCK (≥10)</div>
            <div style={{ ...styles.kpiVal, color: "#34d399" }}>{inStockCount}</div>
            <div style={styles.kpiSub}>Healthy Inventory</div>
          </div>
        </div>

        <div
          style={{
            ...styles.kpiCard,
            borderColor: stockFilter === "low_stock" ? "#fbbf24" : "rgba(56, 189, 248, 0.2)",
          }}
          className="cyber-glass-card"
          onClick={() => setStockFilter("low_stock")}
          role="button"
          tabIndex={0}
        >
          <div style={styles.kpiIconWrapYellow}>⚠️</div>
          <div>
            <div style={styles.kpiLabel}>LOW STOCK (&lt;10)</div>
            <div style={{ ...styles.kpiVal, color: "#fbbf24" }}>{lowStockCount}</div>
            <div style={styles.kpiSub}>Replenish Needed</div>
          </div>
        </div>

        <div
          style={{
            ...styles.kpiCard,
            borderColor: stockFilter === "out_of_stock" ? "#ef4444" : "rgba(56, 189, 248, 0.2)",
          }}
          className="cyber-glass-card"
          onClick={() => setStockFilter("out_of_stock")}
          role="button"
          tabIndex={0}
        >
          <div style={styles.kpiIconWrapRed}>🚨</div>
          <div>
            <div style={styles.kpiLabel}>OUT OF STOCK (0)</div>
            <div style={{ ...styles.kpiVal, color: "#f87171" }}>{outOfStockCount}</div>
            <div style={styles.kpiSub}>Critical Alert</div>
          </div>
        </div>
      </div>

      {/* Filter and Inventory Table */}
      <div style={styles.filterCard} className="cyber-glass">
        <div style={styles.filterRow}>
          <div style={{ flex: 1, minWidth: "220px" }}>
            <label style={styles.filterLabel}>🔍 SEARCH BY PRODUCT, SKU, BARCODE</label>
            <input
              type="text"
              placeholder="Search product inventory..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={styles.filterInput}
              className="touch-btn"
            />
          </div>

          <div style={{ width: "200px" }}>
            <label style={styles.filterLabel}>🏷️ CATEGORY</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={styles.filterSelect}
              className="touch-btn"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: "190px" }}>
            <label style={styles.filterLabel}>📊 STOCK STATUS</label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              style={styles.filterSelect}
              className="touch-btn"
            >
              <option value="all">All Statuses ({totalProducts})</option>
              <option value="in_stock">In Stock ({inStockCount})</option>
              <option value="low_stock">Low Stock ({lowStockCount})</option>
              <option value="out_of_stock">Out of Stock ({outOfStockCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Stock Table */}
      <div style={styles.tableCard} className="cyber-glass">
        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "#38bdf8" }}>
            <div className="spinner" style={{ width: "32px", height: "32px" }}></div>
            <div style={{ marginTop: "1rem", fontWeight: "700" }}>LOADING INVENTORY DATA...</div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📋</div>
            <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "1.1rem" }}>
              No inventory items match filter
            </div>
            <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Try clearing your filters or search keywords.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Product Details</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Unit Price</th>
                  <th style={styles.th}>Stock Available</th>
                  <th style={styles.th}>Stock Status</th>
                  <th style={styles.th}>AI Recognition</th>
                  <th style={styles.thRight}>Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((prod) => {
                  const stock = prod.stock || 0;
                  const isHealthy = stock >= 10;
                  const isLow = stock > 0 && stock < 10;
                  const isOut = stock === 0;

                  return (
                    <tr key={prod._id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: "800", color: "#f8fafc", fontSize: "0.95rem" }}>
                          {prod.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.15rem" }}>
                          SKU / Barcode: <code>{prod.barcode || "N/A"}</code>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.categoryBadge}>
                          {prod.category?.name || "General"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: "#38bdf8", fontWeight: "800", fontSize: "0.95rem" }}>
                          ₹{prod.price?.toFixed(2)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontWeight: "800", fontSize: "1.05rem", color: "#f8fafc" }}>
                          {stock}
                        </span>{" "}
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>units</span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            padding: "0.3rem 0.75rem",
                            borderRadius: "1rem",
                            fontSize: "0.75rem",
                            fontWeight: "800",
                            backgroundColor: isHealthy
                              ? "rgba(16, 185, 129, 0.15)"
                              : isLow
                              ? "rgba(245, 158, 11, 0.15)"
                              : "rgba(239, 68, 68, 0.15)",
                            color: isHealthy ? "#34d399" : isLow ? "#fbbf24" : "#f87171",
                            border: isHealthy
                              ? "1px solid rgba(16, 185, 129, 0.35)"
                              : isLow
                              ? "1px solid rgba(245, 158, 11, 0.35)"
                              : "1px solid rgba(239, 68, 68, 0.35)",
                          }}
                        >
                          {isHealthy ? "● IN STOCK" : isLow ? "⚠️ LOW STOCK" : "🚨 OUT OF STOCK"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.aiBadge}>
                          {prod.aiClassId ? `✓ Bound (${prod.aiClassId})` : "⚡ Auto-Detect"}
                        </span>
                      </td>
                      <td style={styles.tdRight}>
                        <button
                          onClick={() => setEditingProduct(prod)}
                          style={styles.editStockBtn}
                          className="touch-btn"
                          title="Update stock or details"
                        >
                          ✏️ Update Stock
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

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={!!editingProduct}
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onProductUpdated={fetchInventory}
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
  refreshBtn: {
    padding: "0.65rem 1.25rem",
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
    cursor: "pointer",
    border: "1px solid rgba(56, 189, 248, 0.2)",
  },
  kpiIconWrapBlue: {
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
  kpiIconWrapGreen: {
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
  kpiIconWrapYellow: {
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
  kpiIconWrapRed: {
    width: "44px",
    height: "44px",
    borderRadius: "0.75rem",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.3rem",
    border: "1px solid rgba(239, 68, 68, 0.3)",
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
  categoryBadge: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    padding: "0.25rem 0.6rem",
    borderRadius: "0.4rem",
    fontSize: "0.78rem",
    color: "#cbd5e1",
    border: "1px solid rgba(71, 85, 105, 0.6)",
  },
  aiBadge: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    color: "#a5b4fc",
    padding: "0.25rem 0.6rem",
    borderRadius: "0.4rem",
    fontSize: "0.75rem",
    fontWeight: "700",
    border: "1px solid rgba(99, 102, 241, 0.3)",
  },
  editStockBtn: {
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

export default OwnerInventory;
