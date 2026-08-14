import React, { useState, useEffect } from "react";
import { updateProduct, getCategories } from "../services/productApi";
import CategoryDropdown from "./CategoryDropdown";
import AddCategoryModal from "./AddCategoryModal";

// ── Helper: extract display URL from an image entry (old string or new {url} object)
const getImageUrl = (img) => {
  if (!img) return "";
  if (typeof img === "string") return img.startsWith("http") ? img : `http://localhost:5001${img}`;
  return img.url || "";
};

function EditProductModal({ isOpen, onClose, product, onProductUpdated }) {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  // existingImages: array of image objects kept from the product (may be strings or {url, publicId})
  const [existingImages, setExistingImages] = useState([]);
  // newFiles: File objects newly chosen by the owner
  const [newFiles, setNewFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [typedCategoryName, setTypedCategoryName] = useState("");

  useEffect(() => {
    if (isOpen && product) {
      setName(product.name || "");
      setPrice(product.price || "");
      setStock(product.stock || 0);
      setCategory(product.category?._id || product.category || "");
      setDescription(product.description || "");
      // Normalise images: ensure each is at least { url, publicId }
      const normalised = (product.images || []).map((img) =>
        typeof img === "string" ? { url: img, publicId: "" } : img
      );
      setExistingImages(normalised);
      setNewFiles([]);
      setError("");

      getCategories()
        .then((data) => setCategories(data.categories || []))
        .catch(() => setError("Failed to load categories"));
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const totalImages = existingImages.length + newFiles.length;

  const handleNewFileChange = (e) => {
    setError("");
    const selected = Array.from(e.target.files);

    const valid = selected.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return ["jpg", "jpeg", "png", "webp"].includes(ext);
    });

    if (valid.length !== selected.length) {
      setError("Only JPG, JPEG, PNG, or WEBP files are allowed.");
      return;
    }

    const combined = [...newFiles, ...valid];
    if (existingImages.length + combined.length > 5) {
      setError("Maximum 5 images allowed per product.");
      return;
    }

    setNewFiles(combined);
    e.target.value = "";
  };

  const handleRemoveExisting = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
    setError("");
  };

  const handleRemoveNew = (index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("price", price);
      formData.append("stock", stock);
      formData.append("category", category);
      formData.append("description", description);
      // Send existing images as JSON — backend uses publicId to delete removed ones
      formData.append("existingImages", JSON.stringify(existingImages));

      newFiles.forEach((file) => formData.append("images", file));

      await updateProduct(product._id, formData);
      onProductUpdated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>✏️ Edit Product</h2>
          <button type="button" onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <div style={styles.group}>
              <label style={styles.label}>Product Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                required style={styles.input} />
            </div>
          </div>

          {product.aiClassId && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: "#0f172a", border: "1px solid #334155", padding: "0.6rem 0.85rem", borderRadius: "0.5rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: "600" }}>AI Class ID:</span>
              <code style={{ fontFamily: "monospace", fontSize: "0.88rem", color: "#38bdf8", backgroundColor: "#1e293b", padding: "0.2rem 0.5rem", borderRadius: "0.3rem" }}>{product.aiClassId}</code>
              <span style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: "500" }}>Deterministic ✓</span>
            </div>
          )}

          <div style={styles.row}>
            <div style={styles.group}>
              <label style={styles.label}>Price ($) *</label>
              <input type="number" step="0.01" value={price}
                onChange={(e) => setPrice(e.target.value)} required style={styles.input} />
            </div>
            <div style={styles.group}>
              <label style={styles.label}>Stock Quantity *</label>
              <input type="number" value={stock}
                onChange={(e) => setStock(e.target.value)} required style={styles.input} />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.group}>
              <label style={styles.label}>Category</label>
              <CategoryDropdown
                categories={categories}
                selectedCategory={category}
                onChange={(catId) => setCategory(catId)}
                onAddNewCategory={(initialTypedName) => {
                  setTypedCategoryName(initialTypedName);
                  setIsAddCategoryOpen(true);
                }}
              />
            </div>
          </div>

          {/* ── Image Management ──────────────────────────────────────────── */}
          <div style={styles.group}>
            <label style={styles.label}>
              Product Images &nbsp;
              <span style={{ color: "#64748b", fontSize: "0.78rem" }}>({totalImages}/5)</span>
            </label>

            {/* Thumbnail grid — existing + new */}
            {(existingImages.length > 0 || newFiles.length > 0) && (
              <div style={styles.previewGrid}>
                {existingImages.map((img, index) => (
                  <div key={`existing-${index}`} style={styles.previewTile}>
                    <button type="button" onClick={() => handleRemoveExisting(index)}
                      style={styles.removeBtn} title="Remove">✕</button>
                    <img src={getImageUrl(img)} alt={`Saved ${index + 1}`} style={styles.previewImg} />
                    <div style={styles.previewLabel}>Saved {index + 1}</div>
                  </div>
                ))}
                {newFiles.map((file, index) => (
                  <div key={`new-${index}`} style={styles.previewTile}>
                    <button type="button" onClick={() => handleRemoveNew(index)}
                      style={styles.removeBtn} title="Remove">✕</button>
                    <img src={URL.createObjectURL(file)} alt={`New ${index + 1}`} style={styles.previewImg} />
                    <div style={{ ...styles.previewLabel, color: "#38bdf8" }}>New {index + 1}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Add More Images button */}
            {totalImages < 5 && (
              <label style={styles.addMoreBtn}>
                {totalImages === 0 ? "📂 Choose Images" : "➕ Add More Images"}
                <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple
                  onChange={handleNewFileChange} style={{ display: "none" }} />
              </label>
            )}
            {totalImages >= 5 && (
              <p style={{ fontSize: "0.8rem", color: "#f87171", marginTop: "0.35rem" }}>
                Maximum 5 images reached.
              </p>
            )}
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} style={{ ...styles.input, resize: "vertical" }} />
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? "⏳ Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        initialName={typedCategoryName}
        existingCategories={categories}
        onCategoryCreated={(newCategory) => {
          setCategories((prev) => [...prev, newCategory]);
          setCategory(newCategory._id);
        }}
      />
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, overflowY: "auto", padding: "1rem" },
  modal: { backgroundColor: "#1e293b", padding: "2rem", borderRadius: "1rem", width: "100%", maxWidth: "640px", color: "#f8fafc", maxHeight: "90vh", overflowY: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  title: { fontSize: "1.35rem" },
  closeBtn: { background: "none", border: "none", color: "#94a3b8", fontSize: "1.25rem", cursor: "pointer" },
  errorBox: { backgroundColor: "#451a1a", border: "1px solid #f87171", color: "#fca5a5", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1rem" },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  group: { display: "flex", flexDirection: "column", gap: "0.35rem" },
  label: { fontSize: "0.85rem", color: "#cbd5e1" },
  input: { padding: "0.65rem 0.85rem", backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "0.5rem", color: "#f8fafc", outline: "none" },
  previewGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "0.75rem", marginTop: "0.5rem" },
  previewTile: { position: "relative", backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "0.75rem", overflow: "hidden", minHeight: "110px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0.5rem" },
  previewImg: { width: "100%", height: "90px", objectFit: "cover", borderRadius: "0.5rem" },
  removeBtn: { position: "absolute", top: "0.35rem", right: "0.35rem", backgroundColor: "rgba(15,23,42,0.95)", border: "none", color: "#f87171", fontSize: "0.8rem", borderRadius: "999px", width: "1.6rem", height: "1.6rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 },
  previewLabel: { marginTop: "0.35rem", fontSize: "0.7rem", color: "#94a3b8", textAlign: "center" },
  addMoreBtn: { display: "inline-flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem", padding: "0.5rem 1rem", backgroundColor: "#1e3a5f", border: "1px dashed #38bdf8", borderRadius: "0.5rem", color: "#38bdf8", fontSize: "0.85rem", cursor: "pointer", fontWeight: "500" },
  actions: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" },
  cancelBtn: { padding: "0.65rem 1.25rem", backgroundColor: "#334155", color: "#f8fafc", border: "none", borderRadius: "0.5rem", cursor: "pointer" },
  submitBtn: { padding: "0.65rem 1.25rem", backgroundColor: "#3b82f6", color: "#ffffff", border: "none", borderRadius: "0.5rem", fontWeight: "600", cursor: "pointer" },
};

export default EditProductModal;
