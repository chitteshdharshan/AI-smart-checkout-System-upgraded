import React, { useState, useEffect } from "react";
import { getProducts, deleteProduct, getCategories } from "../../services/productApi";
import AddProductModal from "../../components/AddProductModal";
import CategoryDropdown from "../../components/CategoryDropdown";
import AddCategoryModal from "../../components/AddCategoryModal";
import EditProductModal from "../../components/EditProductModal";

function OwnerProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [aiClassId, setAiClassId] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [typedCategoryName, setTypedCategoryName] = useState("");

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (keyword) params.keyword = keyword;
      if (selectedCategory) params.category = selectedCategory;
      if (inStockOnly) params.inStock = "true";

      const data = await getProducts(params);
      setProducts(data.products || []);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [keyword, selectedCategory, inStockOnly]);

  useEffect(() => {
    getCategories()
      .then((data) => setCategories(data.categories || []))
      .catch((err) => console.error(err));
  }, []);

  const handleResetFilters = () => {
    setKeyword("");
    setSelectedCategory("");
    setAiClassId("");
    setInStockOnly(false);
  };

  const hasActiveFilters = Boolean(keyword || selectedCategory || aiClassId || inStockOnly);

  const displayedProducts = products.filter((prod) => {
    if (aiClassId.trim()) {
      const target = (prod.aiClassId || "").toLowerCase();
      if (!target.includes(aiClassId.trim().toLowerCase())) return false;
    }
    return true;
  });

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteProduct(id);
        fetchProducts();
      } catch (err) {
        alert("Failed to delete product: " + (err.response?.data?.message || err.message));
      }
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.topBar}>
        <div>
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            STORE INVENTORY & AI CATALOGUE
          </div>
          <h2 style={styles.pageTitle}>Product Management</h2>
          <p style={styles.pageSubtitle}>
            Configure supermarket items, prices, barcodes, AI visual class IDs, and FAISS embeddings
          </p>
        </div>

        <button onClick={() => setIsAddOpen(true)} style={styles.addBtn} className="touch-btn">
          ➕ Add New Product
        </button>
      </div>

      {/* Filter & Search Card */}
      <div style={styles.filterCard} className="cyber-glass">
        <div style={styles.filterHeader}>
          <span style={styles.filterSectionTitle}>⚡ PRODUCT SEARCH & FILTERS</span>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              style={styles.resetBtn}
              className="touch-btn"
              title="Clear all active filters"
            >
              🔄 Reset Filters
            </button>
          )}
        </div>

        <div style={styles.filterGrid}>
          {/* 1. Category Filter */}
          <div style={styles.categoryFilterGroup}>
            <label style={styles.filterLabel}>🏷️ CATEGORY FILTER</label>
            <CategoryDropdown
              categories={categories}
              selectedCategory={selectedCategory}
              onChange={(catId) => setSelectedCategory(catId)}
              onAddNewCategory={(initialTypedName) => {
                setTypedCategoryName(initialTypedName);
                setIsAddCategoryOpen(true);
              }}
            />
          </div>

          {/* 2. AI Class ID Filter */}
          <div style={styles.aiClassFilterGroup}>
            <label style={styles.filterLabel}>🤖 AI CLASS ID</label>
            <input
              type="text"
              placeholder="Filter by AI Class ID (e.g. voyage...)"
              value={aiClassId}
              onChange={(e) => setAiClassId(e.target.value)}
              style={styles.filterInput}
              className="touch-btn"
            />
          </div>

          {/* 3. Search Product / SKU */}
          <div style={styles.searchGroup}>
            <label style={styles.filterLabel}>🔍 SEARCH PRODUCT OR SKU</label>
            <input
              type="text"
              placeholder="Search by name, SKU, or brand..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={styles.filterInput}
              className="touch-btn"
            />
          </div>

          {/* 4. In Stock Checkbox */}
          <div style={styles.checkboxGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "#38bdf8", cursor: "pointer" }}
              />
              <span>In Stock Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Product Table Dashboard */}
      <div style={styles.tableCard} className="cyber-glass">
        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "#38bdf8" }}>
            <div className="spinner" style={{ width: "32px", height: "32px" }}></div>
            <div style={{ marginTop: "1rem", fontWeight: "700" }}>LOADING STORE PRODUCTS...</div>
          </div>
        ) : displayedProducts.length === 0 ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📦</div>
            <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "1.1rem" }}>No products found</div>
            <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Try adjusting your search keyword or category filter.</div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                style={{ ...styles.resetBtn, marginTop: "1rem", display: "inline-block" }}
                className="touch-btn"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Image</th>
                  <th style={styles.th}>Product Details</th>
                  <th style={styles.th}>Barcode / SKU</th>
                  <th style={styles.th}>Price</th>
                  <th style={styles.th}>Inventory Stock</th>
                  <th style={styles.th}>AI Class ID</th>
                  <th style={styles.thRight}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedProducts.map((prod) => (
                  <tr key={prod._id} style={styles.tr}>
                    <td style={styles.td}>
                      {prod.images && prod.images.length > 0 ? (() => {
                        const img = prod.images[0];
                        const src = img?.url || (typeof img === "string" ? (img.startsWith("http") ? img : `http://localhost:5001${img}`) : "");
                        return src ? (
                          <img src={src} alt={prod.name} style={styles.productThumb} />
                        ) : (
                          <div style={styles.noImgThumb}>📦</div>
                        );
                      })() : (
                        <div style={styles.noImgThumb}>📦</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "800", color: "#f8fafc", fontSize: "0.95rem" }}>{prod.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.15rem" }}>
                        Category: <strong style={{ color: "#cbd5e1" }}>{prod.category?.name || "Uncategorized"}</strong>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <code style={styles.barcodeTag}>{prod.barcode || "N/A"}</code>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: "#34d399", fontWeight: "800", fontSize: "1rem" }}>₹{prod.price?.toFixed(2)}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        padding: "0.25rem 0.65rem",
                        borderRadius: "1rem",
                        fontSize: "0.78rem",
                        fontWeight: "800",
                        backgroundColor: prod.stock > 10 ? "rgba(6, 95, 70, 0.4)" : prod.stock > 0 ? "rgba(124, 45, 18, 0.4)" : "rgba(127, 29, 29, 0.4)",
                        color: prod.stock > 10 ? "#34d399" : prod.stock > 0 ? "#fdba74" : "#fca5a5",
                        border: prod.stock > 10 ? "1px solid rgba(16, 185, 129, 0.4)" : prod.stock > 0 ? "1px solid rgba(234, 88, 12, 0.4)" : "1px solid rgba(239, 68, 68, 0.4)",
                      }}>
                        {prod.stock > 0 ? `${prod.stock} in stock` : "Out of stock"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.aiTag}>{prod.aiClassId || "Unlabeled"}</span>
                    </td>
                    <td style={styles.tdRight}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button onClick={() => setEditingProduct(prod)} style={styles.editBtn} className="touch-btn">
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDelete(prod._id, prod.name)} style={styles.deleteBtn} className="touch-btn">
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals for Add & Edit */}
      <AddProductModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onProductAdded={fetchProducts}
      />

      <EditProductModal
        isOpen={!!editingProduct}
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onProductUpdated={fetchProducts}
      />

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        initialName={typedCategoryName}
        existingCategories={categories}
        onCategoryCreated={(newCategory) => {
          setCategories((prev) => [...prev, newCategory]);
          setSelectedCategory(newCategory._id);
          setIsAddCategoryOpen(false);
        }}
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
  addBtn: {
    padding: "0.75rem 1.5rem",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#ffffff",
    border: "1px solid #34d399",
    borderRadius: "0.75rem",
    fontSize: "0.92rem",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.4)",
  },
  filterCard: {
    padding: "1.25rem 1.5rem",
    borderRadius: "1.25rem",
    marginBottom: "1.75rem",
    border: "1px solid rgba(56, 189, 248, 0.2)",
    position: "relative",
    zIndex: 20,
    overflow: "visible",
  },
  filterHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
    borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
    paddingBottom: "0.6rem",
  },
  filterSectionTitle: {
    fontSize: "0.78rem",
    fontWeight: "800",
    letterSpacing: "0.08em",
    color: "#38bdf8",
  },
  resetBtn: {
    padding: "0.3rem 0.75rem",
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "#94a3b8",
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    border: "1px solid rgba(71, 85, 105, 0.6)",
    borderRadius: "0.5rem",
    cursor: "pointer",
  },
  filterGrid: {
    display: "flex",
    gap: "1.25rem",
    alignItems: "flex-end",
    flexWrap: "wrap",
    position: "relative",
  },
  categoryFilterGroup: {
    flex: "1 1 220px",
    minWidth: "200px",
    position: "relative",
    zIndex: 50,
  },
  aiClassFilterGroup: {
    flex: "1 1 220px",
    minWidth: "200px",
    position: "relative",
    zIndex: 1,
  },
  searchGroup: {
    flex: "1.5 1 240px",
    minWidth: "220px",
    position: "relative",
    zIndex: 1,
  },
  checkboxGroup: {
    paddingBottom: "0.65rem",
    display: "flex",
    alignItems: "center",
    minWidth: "120px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    cursor: "pointer",
    fontSize: "0.9rem",
    color: "#cbd5e1",
    fontWeight: "600",
  },
  filterLabel: {
    fontSize: "0.72rem",
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
    boxSizing: "border-box",
  },
  tableCard: {
    borderRadius: "1.25rem",
    overflow: "hidden",
    border: "1px solid rgba(56, 189, 248, 0.2)",
    position: "relative",
    zIndex: 1,
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
  productThumb: {
    width: "48px",
    height: "48px",
    objectFit: "cover",
    borderRadius: "0.5rem",
    border: "1px solid rgba(56, 189, 248, 0.2)",
  },
  noImgThumb: {
    width: "48px",
    height: "48px",
    backgroundColor: "rgba(11, 18, 32, 0.8)",
    border: "1px dashed rgba(51, 65, 85, 0.8)",
    borderRadius: "0.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.3rem",
  },
  barcodeTag: {
    backgroundColor: "rgba(11, 18, 32, 0.8)",
    padding: "0.3rem 0.6rem",
    borderRadius: "0.35rem",
    color: "#fbbf24",
    fontSize: "0.8rem",
    border: "1px solid rgba(251, 191, 36, 0.3)",
    fontFamily: "monospace",
  },
  aiTag: {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    color: "#a5b4fc",
    padding: "0.3rem 0.6rem",
    borderRadius: "0.35rem",
    fontSize: "0.75rem",
    fontWeight: "700",
    border: "1px solid rgba(99, 102, 241, 0.35)",
  },
  editBtn: {
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
  deleteBtn: {
    padding: "0.45rem 0.85rem",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    color: "#fca5a5",
    borderRadius: "0.5rem",
    fontSize: "0.82rem",
    fontWeight: "700",
    cursor: "pointer",
    minHeight: "36px",
  },
};

export default OwnerProducts;
