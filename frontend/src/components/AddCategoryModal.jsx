import React, { useState, useEffect } from "react";
import { createCategory } from "../services/productApi";

function AddCategoryModal({
  isOpen,
  onClose,
  initialName = "",
  onCategoryCreated,
  existingCategories = [],
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(initialName || "");
      setDescription("");
      setError("");
      setSuccessMsg("");
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError("");
    setSuccessMsg("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Category name is required");
      return;
    }

    // Client-side case-insensitive duplicate check
    const isDuplicate = existingCategories.some(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setError("Category already exists");
      return;
    }

    setLoading(true);
    try {
      const response = await createCategory({ name: trimmedName, description });
      if (response && response.success && response.category) {
        setSuccessMsg("Category created successfully");
        if (onCategoryCreated) {
          onCategoryCreated(response.category);
        }
        setTimeout(() => {
          onClose();
        }, 300);
      } else {
        setError(response?.message || "Failed to create category");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={handleCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>🏷️ Create New Category</h3>
          <button type="button" onClick={handleCancel} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}
        {successMsg && <div style={styles.successBox}>{successMsg}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.group}>
            <label style={styles.label}>Category Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Beverages"
              required
              autoFocus
              style={styles.input}
            />
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Soft drinks, juices, and cold beverages"
              rows={3}
              style={{ ...styles.input, resize: "vertical" }}
            />
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={handleCancel} style={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? "Saving..." : "Save Category"}
            </button>
          </div>
        </form>
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
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3000,
  },
  modal: {
    backgroundColor: "#1e293b",
    padding: "1.75rem",
    borderRadius: "0.75rem",
    width: "100%",
    maxWidth: "480px",
    color: "#f8fafc",
    border: "1px solid #334155",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
  },
  header: {
    display: "flex",
    justify: "space-between",
    alignItems: "center",
    marginBottom: "1.25rem",
  },
  title: { fontSize: "1.2rem", margin: 0, color: "#f8fafc" },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "1.25rem",
    cursor: "pointer",
  },
  errorBox: {
    backgroundColor: "#451a1a",
    border: "1px solid #f87171",
    color: "#fca5a5",
    padding: "0.65rem 0.85rem",
    borderRadius: "0.5rem",
    marginBottom: "1rem",
    fontSize: "0.85rem",
  },
  successBox: {
    backgroundColor: "#064e3b",
    border: "1px solid #34d399",
    color: "#6ee7b7",
    padding: "0.65rem 0.85rem",
    borderRadius: "0.5rem",
    marginBottom: "1rem",
    fontSize: "0.85rem",
  },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  group: { display: "flex", flexDirection: "column", gap: "0.35rem" },
  label: { fontSize: "0.85rem", color: "#cbd5e1" },
  input: {
    padding: "0.65rem 0.85rem",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "0.5rem",
    color: "#f8fafc",
    outline: "none",
    fontSize: "0.9rem",
  },
  actions: {
    display: "flex",
    justify: "flex-end",
    gap: "0.75rem",
    marginTop: "1rem",
  },
  cancelBtn: {
    padding: "0.6rem 1.25rem",
    backgroundColor: "#334155",
    color: "#f8fafc",
    border: "none",
    borderRadius: "0.5rem",
    cursor: "pointer",
    fontSize: "0.875rem",
  },
  submitBtn: {
    padding: "0.6rem 1.25rem",
    backgroundColor: "#10b981",
    color: "#ffffff",
    border: "none",
    borderRadius: "0.5rem",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.875rem",
  },
};

export default AddCategoryModal;
