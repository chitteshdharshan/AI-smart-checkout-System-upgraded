import React, { useState, useEffect, useRef } from "react";
import { createProduct, getCategories, enrichProduct } from "../services/productApi";
import CategoryDropdown from "./CategoryDropdown";
import AddCategoryModal from "./AddCategoryModal";

function AddProductModal({ isOpen, onClose, onProductAdded }) {
  const [categories, setCategories] = useState([]);

  // Form Fields
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [variant, setVariant] = useState("");
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [productType, setProductType] = useState("");
  const [description, setDescription] = useState("");
  const [barcode, setBarcode] = useState("");

  // AI Generated Non-Editable Metadata
  const [aiClassId, setAiClassId] = useState("");
  const [searchableText, setSearchableText] = useState("");
  const [embedding, setEmbedding] = useState([]);

  // Image Upload State
  const [files, setFiles] = useState([]); // Selected File objects

  // Status Stepper & States
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Stepper checklist state
  const [steps, setSteps] = useState({
    imagesUploaded: false,
    ocrCompleted: false,
    productIdentified: false,
    categoryIdentified: false,
    aiClassIdGenerated: false,
    embeddingGenerated: false,
    catalogIndexUpdated: false,
  });

  // Duplicate Warning State
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  // Category Modal
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [typedCategoryName, setTypedCategoryName] = useState("");

  const prevUrlsRef = useRef([]);

  useEffect(() => {
    if (isOpen) {
      getCategories()
        .then((data) => setCategories(data.categories || []))
        .catch(() => setError("Failed to load categories"));
    } else {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setName("");
    setBrand("");
    setVariant("");
    setWeight("");
    setPrice("");
    setStock("");
    setCategory("");
    setSubcategory("");
    setProductType("");
    setDescription("");
    setBarcode("");
    setAiClassId("");
    setSearchableText("");
    setEmbedding([]);
    setFiles([]);
    setAnalyzing(false);
    setLoading(false);
    setError("");
    setDuplicateWarning(null);
    setAllowDuplicate(false);
    setSteps({
      imagesUploaded: false,
      ocrCompleted: false,
      productIdentified: false,
      categoryIdentified: false,
      aiClassIdGenerated: false,
      embeddingGenerated: false,
      catalogIndexUpdated: false,
    });
  };

  if (!isOpen) return null;

  // ── Handle Image Selection ──────────────────────────────────────────────────

  const handleFileChange = (e) => {
    setError("");
    const selected = Array.from(e.target.files);

    const valid = selected.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return ["jpg", "jpeg", "png", "webp"].includes(ext);
    });

    if (valid.length !== selected.length) {
      setError("Only JPG, JPEG, PNG, or WEBP image files are allowed.");
      return;
    }

    const combined = [...files, ...valid];
    if (combined.length > 5) {
      setError("Maximum 5 images allowed per product.");
      return;
    }

    setFiles(combined);
    setSteps((prev) => ({ ...prev, imagesUploaded: true }));
    e.target.value = "";

    // Trigger AI analysis on new image selection
    triggerAIAnalysis(combined);
  };

  const handleRemoveFile = (index) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    if (updated.length === 0) {
      setSteps({
        imagesUploaded: false,
        ocrCompleted: false,
        productIdentified: false,
        categoryIdentified: false,
        aiClassIdGenerated: false,
        embeddingGenerated: false,
        catalogIndexUpdated: false,
      });
      setAiClassId("");
    } else {
      triggerAIAnalysis(updated);
    }
  };

  // ── Trigger AI Image Analysis ───────────────────────────────────────────────

  const triggerAIAnalysis = async (currentFiles) => {
    if (!currentFiles || currentFiles.length === 0) return;

    setAnalyzing(true);
    setError("");

    try {
      const formData = new FormData();
      currentFiles.forEach((file) => formData.append("images", file));
      if (name) formData.append("name", name);
      if (description) formData.append("description", description);

      // Simulating step animations while API call runs
      setSteps((prev) => ({ ...prev, imagesUploaded: true }));

      const res = await enrichProduct(formData);

      if (res.success && res.data) {
        const d = res.data;

        // Auto-populate fields
        setName(d.productName || "");
        setBrand(d.brand || "");
        setVariant(d.variant || "");
        setWeight(d.weight || "");
        setDescription(d.description || "");
        setSubcategory(d.subcategory || "");
        setProductType(d.productType || "");
        setAiClassId(d.aiClassId || "");
        setSearchableText(d.searchableText || "");
        setEmbedding(d.embedding || []);

        if (d.categoryId) {
          setCategory(d.categoryId);
        }

        // Stepper Checklist Updated
        setSteps({
          imagesUploaded: true,
          ocrCompleted: true,
          productIdentified: true,
          categoryIdentified: Boolean(d.category || d.categoryId),
          aiClassIdGenerated: Boolean(d.aiClassId),
          embeddingGenerated: Array.isArray(d.embedding) && d.embedding.length > 0,
          catalogIndexUpdated: false,
        });

        // Check Duplicate
        if (d.isDuplicate && d.existingProduct) {
          setDuplicateWarning(d.existingProduct);
        } else {
          setDuplicateWarning(null);
        }
      }
    } catch (err) {
      console.error('AI Analysis Error:', err);
      const stage = err.response?.data?.stage || err.stage || 'UNKNOWN';
      const msg = err.response?.data?.message || err.message || 'An error occurred';
      setError(`AI analysis failed [${stage}]: ${msg}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Submit Form ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (files.length === 0) {
      setError("At least one product image is required.");
      return;
    }

    if (!price || Number(price) < 0) {
      setError("Please enter a valid price.");
      return;
    }

    if (stock === "" || Number(stock) < 0) {
      setError("Please enter a valid stock quantity.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("brand", brand);
      formData.append("variant", variant);
      formData.append("weight", weight);
      formData.append("price", price);
      formData.append("stock", stock);
      formData.append("category", category);
      formData.append("subcategory", subcategory);
      formData.append("productType", productType);
      formData.append("description", description);
      formData.append("barcode", barcode);
      formData.append("aiClassId", aiClassId);
      formData.append("searchableText", searchableText);
      if (allowDuplicate) formData.append("allowDuplicate", "true");

      files.forEach((file) => formData.append("images", file));

      const res = await createProduct(formData);

      if (res.success) {
        setSteps((prev) => ({ ...prev, catalogIndexUpdated: true }));
        onProductAdded();
        onClose();
        resetForm();
      }
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.isDuplicate) {
        setDuplicateWarning(err.response.data.existingProduct);
        setError("Similar product already exists in catalog.");
      } else {
        setError(err.response?.data?.message || "Failed to register product.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>🤖 Add New Product (AI-Ready)</h2>
            <p style={styles.subtitle}>Upload product images to automatically generate AI metadata & index catalog</p>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

          {/* AI Analyzing Progress Banner */}
          {analyzing && (
            <div style={{ backgroundColor: "#0284c7", color: "#ffffff", padding: "0.75rem 1rem", borderRadius: "0.5rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: "600", fontSize: "0.9rem" }}>
              <span className="spinner" style={{ fontSize: "1.2rem" }}>⚡</span>
              <span>AI is analyzing your product images... (OCR + Qwen2.5-VL)</span>
            </div>
          )}

          {error && (
            <div style={styles.errorBox}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{error}</span>
                {files.length > 0 && (
                  <button
                    type="button"
                    onClick={() => triggerAIAnalysis(files)}
                    style={{ padding: "0.3rem 0.6rem", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "0.3rem", fontSize: "0.78rem", cursor: "pointer", fontWeight: "600" }}
                  >
                    🔄 Retry Analysis
                  </button>
                )}
              </div>
            </div>
          )}

        {/* Duplicate Warning Modal Banner */}
        {duplicateWarning && (
          <div style={styles.duplicateBox}>
            <div style={styles.duplicateHeader}>⚠️ Similar Product Already Exists</div>
            <p style={{ margin: "0.25rem 0 0.5rem", fontSize: "0.85rem", color: "#fef08a" }}>
              A product with AI Class ID <strong>{duplicateWarning.aiClassId}</strong> ("{duplicateWarning.name}") priced at <strong>${duplicateWarning.price}</strong> already exists in the system.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => {
                  setAllowDuplicate(true);
                  setDuplicateWarning(null);
                }}
                style={styles.overrideBtn}
              >
                Create New Product Anyway
              </button>
              <button
                type="button"
                onClick={onClose}
                style={styles.cancelBtnSmall}
              >
                Cancel / Use Existing
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* 1. PRODUCT IMAGES (TOP MANDATORY STEP) */}
          <div style={styles.sectionCard}>
            <label style={styles.sectionTitle}>
              📸 Product Images * &nbsp;
              <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "normal" }}>
                (Upload 1–5 clear images: Front, Back, Label, Sides)
              </span>
            </label>

            {files.length > 0 && (
              <div style={styles.previewGrid}>
                {files.map((file, index) => (
                  <div key={index} style={styles.previewTile}>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      style={styles.removeBtn}
                      title="Remove image"
                    >✕</button>
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      style={styles.previewImg}
                    />
                    <div style={styles.previewLabel}>View {index + 1}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.6rem" }}>
              {files.length < 5 && (
                <label style={styles.addMoreBtn}>
                  {files.length === 0 ? "📂 Choose Product Images" : "➕ Add More Views"}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                </label>
              )}
              {files.length > 0 && (
                <button
                  type="button"
                  onClick={() => triggerAIAnalysis(files)}
                  disabled={analyzing}
                  style={styles.reAnalyzeBtn}
                >
                  {analyzing ? "⚡ Analyzing Images..." : "🔄 Re-run AI Analysis"}
                </button>
              )}
              {files.length > 0 && (
                <span style={styles.fileBadge}>📎 {files.length}/5 images selected</span>
              )}
            </div>
          </div>

          {/* 2. AI ANALYSIS STATUS CHECKLIST STEPPER */}
          <div style={styles.stepperContainer}>
            <div style={styles.stepperHeader}>
              <span>⚡ AI Analysis Status</span>
              {analyzing && <span style={styles.analyzingBadge}>Processing AI Vision & Text...</span>}
            </div>
            <div style={styles.stepperGrid}>
              <div style={steps.imagesUploaded ? styles.stepDone : styles.stepPending}>
                {steps.imagesUploaded ? "✓" : "○"} Images uploaded
              </div>
              <div style={steps.ocrCompleted ? styles.stepDone : styles.stepPending}>
                {steps.ocrCompleted ? "✓" : "○"} OCR completed
              </div>
              <div style={steps.productIdentified ? styles.stepDone : styles.stepPending}>
                {steps.productIdentified ? "✓" : "○"} Product identified
              </div>
              <div style={steps.categoryIdentified ? styles.stepDone : styles.stepPending}>
                {steps.categoryIdentified ? "✓" : "○"} Category identified
              </div>
              <div style={steps.aiClassIdGenerated ? styles.stepDone : styles.stepPending}>
                {steps.aiClassIdGenerated ? "✓" : "○"} AI Class ID generated
              </div>
              <div style={steps.embeddingGenerated ? styles.stepDone : styles.stepPending}>
                {steps.embeddingGenerated ? "✓" : "○"} Embedding generated
              </div>
              <div style={steps.catalogIndexUpdated ? styles.stepDone : styles.stepPending}>
                {steps.catalogIndexUpdated ? "✓" : "○"} Catalog index updated
              </div>
            </div>
          </div>

          {/* READ-ONLY AUTOMATIC AI CLASS ID BADGE (NO MANUAL EDITING) */}
          <div style={styles.aiClassBadgeBox}>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: "600" }}>AI Class ID:</span>
            <code style={styles.aiClassCode}>{aiClassId || "(Will generate upon image analysis)"}</code>
            {aiClassId && <span style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: "500" }}>Generated automatically ✓</span>}
          </div>

          {/* 3. AUTO-POPULATED / EDITABLE PRODUCT FIELDS */}
          <div style={styles.row}>
            <div style={styles.group}>
              <label style={styles.label}>Product Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={analyzing ? "AI reading name..." : "e.g. Voyage Perfume"}
                style={styles.input}
              />
            </div>
            <div style={styles.group}>
              <label style={styles.label}>Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder={analyzing ? "AI reading brand..." : "e.g. Park Avenue"}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.group}>
              <label style={styles.label}>Variant / Flavor</label>
              <input
                type="text"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                placeholder="e.g. Intense Spray"
                style={styles.input}
              />
            </div>
            <div style={styles.group}>
              <label style={styles.label}>Weight / Volume</label>
              <input
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 167g / 220ml"
                style={styles.input}
              />
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
            <div style={styles.group}>
              <label style={styles.label}>Barcode / SKU (Optional)</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Optional — Not required for camera checkout"
                style={styles.input}
              />
            </div>
          </div>

          {/* 4. OWNER MANDATORY INPUT FIELDS (PRICE & STOCK) */}
          <div style={{ ...styles.row, backgroundColor: "#0f172a", padding: "0.85rem", borderRadius: "0.6rem", border: "1px solid #334155" }}>
            <div style={styles.group}>
              <label style={{ ...styles.label, color: "#38bdf8", fontWeight: "600" }}>Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 15.99"
                required
                style={{ ...styles.input, borderColor: "#38bdf8" }}
              />
            </div>
            <div style={styles.group}>
              <label style={{ ...styles.label, color: "#38bdf8", fontWeight: "600" }}>Stock Quantity *</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="e.g. 50"
                required
                style={{ ...styles.input, borderColor: "#38bdf8" }}
              />
            </div>
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product details & specifications..."
              rows={2}
              style={{ ...styles.input, resize: "vertical" }}
            />
          </div>

          {/* Footer Actions */}
          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={loading || analyzing} style={styles.submitBtn}>
              {loading ? "⏳ Indexing Product & Saving..." : "✨ Register Product"}
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
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, overflowY: "auto", padding: "1rem" },
  modal: { backgroundColor: "#1e293b", padding: "1.75rem", borderRadius: "1rem", width: "100%", maxWidth: "680px", color: "#f8fafc", maxHeight: "92vh", overflowY: "auto", border: "1px solid #334155" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" },
  title: { fontSize: "1.35rem", fontWeight: "700", color: "#f8fafc" },
  subtitle: { fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.2rem" },
  closeBtn: { background: "none", border: "none", color: "#94a3b8", fontSize: "1.3rem", cursor: "pointer" },
  errorBox: { backgroundColor: "#451a1a", border: "1px solid #f87171", color: "#fca5a5", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.85rem" },
  duplicateBox: { backgroundColor: "#422006", border: "1px solid #facc15", padding: "0.85rem", borderRadius: "0.6rem", marginBottom: "1rem" },
  duplicateHeader: { color: "#facc15", fontWeight: "700", fontSize: "0.95rem" },
  overrideBtn: { padding: "0.4rem 0.85rem", backgroundColor: "#ca8a04", color: "#ffffff", border: "none", borderRadius: "0.4rem", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" },
  cancelBtnSmall: { padding: "0.4rem 0.85rem", backgroundColor: "#334155", color: "#f8fafc", border: "none", borderRadius: "0.4rem", fontSize: "0.8rem", cursor: "pointer" },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  sectionCard: { backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "0.75rem", padding: "1rem" },
  sectionTitle: { fontSize: "0.9rem", color: "#f8fafc", fontWeight: "600", display: "block" },
  previewGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "0.6rem", marginTop: "0.6rem" },
  previewTile: { position: "relative", backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "0.6rem", overflow: "hidden", height: "95px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0.35rem" },
  previewImg: { width: "100%", height: "75px", objectFit: "cover", borderRadius: "0.4rem" },
  removeBtn: { position: "absolute", top: "0.3rem", right: "0.3rem", backgroundColor: "rgba(15,23,42,0.9)", border: "none", color: "#f87171", fontSize: "0.75rem", borderRadius: "999px", width: "1.4rem", height: "1.4rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 },
  previewLabel: { marginTop: "0.25rem", fontSize: "0.68rem", color: "#94a3b8" },
  addMoreBtn: { display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 0.85rem", backgroundColor: "#1e3a5f", border: "1px dashed #38bdf8", borderRadius: "0.5rem", color: "#38bdf8", fontSize: "0.82rem", cursor: "pointer", fontWeight: "500" },
  reAnalyzeBtn: { padding: "0.45rem 0.85rem", backgroundColor: "#0284c7", color: "#ffffff", border: "none", borderRadius: "0.5rem", fontSize: "0.82rem", fontWeight: "500", cursor: "pointer" },
  fileBadge: { fontSize: "0.8rem", color: "#38bdf8" },
  stepperContainer: { backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "0.6rem", padding: "0.85rem" },
  stepperHeader: { display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: "600", color: "#cbd5e1", marginBottom: "0.6rem" },
  analyzingBadge: { color: "#38bdf8", fontStyle: "italic", fontSize: "0.78rem" },
  stepperGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.4rem" },
  stepDone: { fontSize: "0.75rem", color: "#34d399", fontWeight: "600", backgroundColor: "#064e3b", padding: "0.3rem 0.5rem", borderRadius: "0.35rem" },
  stepPending: { fontSize: "0.75rem", color: "#64748b", backgroundColor: "#1e293b", padding: "0.3rem 0.5rem", borderRadius: "0.35rem" },
  aiClassBadgeBox: { display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: "#0f172a", border: "1px solid #334155", padding: "0.65rem 0.85rem", borderRadius: "0.5rem" },
  aiClassCode: { fontFamily: "monospace", fontSize: "0.9rem", color: "#38bdf8", backgroundColor: "#1e293b", padding: "0.2rem 0.5rem", borderRadius: "0.3rem" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  group: { display: "flex", flexDirection: "column", gap: "0.35rem" },
  label: { fontSize: "0.82rem", color: "#cbd5e1" },
  input: { padding: "0.6rem 0.8rem", backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "0.5rem", color: "#f8fafc", outline: "none", fontSize: "0.88rem" },
  actions: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.75rem" },
  cancelBtn: { padding: "0.65rem 1.25rem", backgroundColor: "#334155", color: "#f8fafc", border: "none", borderRadius: "0.5rem", cursor: "pointer" },
  submitBtn: { padding: "0.65rem 1.4rem", backgroundColor: "#10b981", color: "#ffffff", border: "none", borderRadius: "0.5rem", fontWeight: "700", cursor: "pointer", fontSize: "0.9rem" },
};

export default AddProductModal;
