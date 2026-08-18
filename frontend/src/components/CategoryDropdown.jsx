import React, { useState, useEffect, useRef } from "react";

function CategoryDropdown({
  categories = [],
  selectedCategory = "",
  onChange,
  onAddNewCategory,
  placeholder = "Select Category",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Find selected category object
  const currentCategoryObj = categories.find(
    (c) => c._id === selectedCategory || c.name === selectedCategory
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsOpen((prev) => !prev);
      setSearch("");
    }
  };

  const handleSelect = (categoryObj, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onChange(categoryObj ? categoryObj._id : "");
    setIsOpen(false);
    setSearch("");
  };

  const handleCreateNewClick = (customName, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsOpen(false);
    if (onAddNewCategory) {
      onAddNewCategory(customName);
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = categories.some(
    (cat) => cat.name.trim().toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <div ref={dropdownRef} style={styles.container}>
      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        style={{
          ...styles.trigger,
          borderColor: isOpen ? "#38bdf8" : "rgba(51, 65, 85, 0.8)",
          boxShadow: isOpen ? "0 0 10px rgba(56, 189, 248, 0.2)" : "none",
          opacity: disabled ? 0.6 : 1,
        }}
        className="touch-btn"
      >
        <span style={styles.triggerText}>
          {currentCategoryObj ? currentCategoryObj.name : placeholder}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {selectedCategory && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              style={styles.clearBtn}
              title="Clear category filter"
            >
              ✕
            </span>
          )}
          <span style={styles.arrow}>{isOpen ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Dropdown Options List */}
      {isOpen && (
        <div style={styles.menu}>
          {/* Search Input */}
          <div style={styles.searchBox}>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category..."
              style={styles.searchInput}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Category Items List */}
          <div style={styles.optionsList}>
            {/* All Categories reset option */}
            <button
              type="button"
              onClick={(e) => handleSelect(null, e)}
              style={{
                ...styles.option,
                backgroundColor: !selectedCategory ? "rgba(56, 189, 248, 0.12)" : "transparent",
                color: !selectedCategory ? "#38bdf8" : "#94a3b8",
                fontWeight: !selectedCategory ? "700" : "500",
                borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
              }}
            >
              <span>🌐 All Categories</span>
              {!selectedCategory && <span style={{ color: "#38bdf8" }}>✓</span>}
            </button>

            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => {
                const isSelected =
                  cat._id === selectedCategory || cat.name === selectedCategory;
                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={(e) => handleSelect(cat, e)}
                    style={{
                      ...styles.option,
                      backgroundColor: isSelected ? "rgba(56, 189, 248, 0.15)" : "transparent",
                      color: isSelected ? "#38bdf8" : "#f8fafc",
                      fontWeight: isSelected ? "700" : "500",
                    }}
                  >
                    <span>{cat.name}</span>
                    {isSelected && <span style={{ color: "#38bdf8" }}>✓</span>}
                  </button>
                );
              })
            ) : (
              <div style={styles.noResults}>No matching categories</div>
            )}

            {/* Create Typed Category option if not existing */}
            {search.trim() !== "" && !exactMatch && (
              <button
                type="button"
                onClick={(e) => handleCreateNewClick(search.trim(), e)}
                style={styles.createTypedOption}
              >
                <span>➕ Create "{search.trim()}"</span>
              </button>
            )}

            {/* Always visible Add New Category button at bottom */}
            <button
              type="button"
              onClick={(e) => handleCreateNewClick("", e)}
              style={styles.addCategoryBtn}
            >
              <span>➕ Add New Category</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: "relative",
    width: "100%",
  },
  trigger: {
    width: "100%",
    padding: "0.75rem 1rem",
    backgroundColor: "rgba(11, 18, 32, 0.85)",
    border: "1px solid rgba(51, 65, 85, 0.8)",
    borderRadius: "0.75rem",
    color: "#f8fafc",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "0.9rem",
    outline: "none",
    minHeight: "44px",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  triggerText: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontWeight: "500",
  },
  arrow: {
    fontSize: "0.72rem",
    color: "#94a3b8",
    marginLeft: "0.25rem",
  },
  clearBtn: {
    fontSize: "0.75rem",
    color: "#94a3b8",
    padding: "0.15rem 0.35rem",
    borderRadius: "0.25rem",
    backgroundColor: "rgba(51, 65, 85, 0.5)",
    cursor: "pointer",
    transition: "color 0.15s, background-color 0.15s",
  },
  menu: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    right: 0,
    width: "100%",
    backgroundColor: "#0b1220",
    border: "1px solid rgba(56, 189, 248, 0.35)",
    borderRadius: "0.75rem",
    boxShadow: "0 15px 35px -5px rgba(0, 0, 0, 0.85), 0 0 15px rgba(56, 189, 248, 0.15)",
    zIndex: 1000,
    overflow: "hidden",
  },
  searchBox: {
    padding: "0.6rem",
    borderBottom: "1px solid rgba(51, 65, 85, 0.8)",
    backgroundColor: "rgba(15, 23, 42, 0.95)",
  },
  searchInput: {
    width: "100%",
    padding: "0.5rem 0.75rem",
    backgroundColor: "rgba(11, 18, 32, 0.9)",
    border: "1px solid rgba(51, 65, 85, 0.8)",
    borderRadius: "0.5rem",
    color: "#f8fafc",
    fontSize: "0.85rem",
    outline: "none",
  },
  optionsList: {
    maxHeight: "220px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
  option: {
    padding: "0.65rem 0.9rem",
    border: "none",
    background: "none",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.875rem",
    transition: "background-color 0.15s ease",
    width: "100%",
  },
  noResults: {
    padding: "0.85rem",
    fontSize: "0.82rem",
    color: "#64748b",
    textAlign: "center",
  },
  createTypedOption: {
    padding: "0.65rem 0.9rem",
    backgroundColor: "rgba(30, 27, 75, 0.8)",
    border: "none",
    borderTop: "1px solid rgba(49, 46, 129, 0.6)",
    color: "#a5b4fc",
    fontWeight: "600",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "0.85rem",
    width: "100%",
  },
  addCategoryBtn: {
    padding: "0.65rem 0.9rem",
    backgroundColor: "rgba(6, 78, 59, 0.8)",
    border: "none",
    borderTop: "1px solid rgba(6, 95, 70, 0.6)",
    color: "#6ee7b7",
    fontWeight: "600",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "0.85rem",
    width: "100%",
  },
};

export default CategoryDropdown;
