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
    onChange(categoryObj._id);
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
          borderColor: isOpen ? "#38bdf8" : "#334155",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={styles.triggerText}>
          {currentCategoryObj ? currentCategoryObj.name : placeholder}
        </span>
        <span style={styles.arrow}>{isOpen ? "▲" : "▼"}</span>
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
                      backgroundColor: isSelected ? "#1e293b" : "transparent",
                      color: isSelected ? "#38bdf8" : "#f8fafc",
                      fontWeight: isSelected ? "600" : "400",
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
    padding: "0.65rem 0.85rem",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "0.5rem",
    color: "#f8fafc",
    display: "flex",
    justify: "space-between",
    alignItems: "center",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "0.9rem",
    outline: "none",
  },
  triggerText: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  arrow: {
    fontSize: "0.75rem",
    color: "#94a3b8",
    marginLeft: "0.5rem",
  },
  menu: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "0.5rem",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.7)",
    zIndex: 2000,
    overflow: "hidden",
  },
  searchBox: {
    padding: "0.5rem",
    borderBottom: "1px solid #1e293b",
    backgroundColor: "#1e293b",
  },
  searchInput: {
    width: "100%",
    padding: "0.5rem 0.75rem",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "0.375rem",
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
    padding: "0.6rem 0.85rem",
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
    padding: "0.75rem",
    fontSize: "0.8rem",
    color: "#64748b",
    textAlign: "center",
  },
  createTypedOption: {
    padding: "0.65rem 0.85rem",
    backgroundColor: "#1e1b4b",
    border: "none",
    borderTop: "1px solid #312e81",
    color: "#a5b4fc",
    fontWeight: "600",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "0.85rem",
    width: "100%",
  },
  addCategoryBtn: {
    padding: "0.65rem 0.85rem",
    backgroundColor: "#064e3b",
    border: "none",
    borderTop: "1px solid #065f46",
    color: "#6ee7b7",
    fontWeight: "600",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "0.85rem",
    width: "100%",
  },
};

export default CategoryDropdown;
