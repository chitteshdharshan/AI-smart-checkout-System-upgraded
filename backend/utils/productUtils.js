// backend/utils/productUtils.js

const normalizeClassValue = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

/**
 * Generate AI Class ID
 * Format: brand + productName + variant + weight
 * Example:
 * Park Avenue + Voyage + Spray + 167g
 * =>
 * park_avenue_voyage_spray_167g
 */
function generateClassId(brand = "", productName = "", variant = "", weight = "") {
  const parts = [brand, productName, variant, weight]
    .map(normalizeClassValue)
    .filter(Boolean);

  if (parts.length === 0) {
    return `product_${Date.now()}`;
  }

  // Remove duplicate consecutive segments if present
  const uniqueParts = [];
  for (const part of parts) {
    if (!uniqueParts.includes(part)) {
      uniqueParts.push(part);
    }
  }

  return uniqueParts.join("_");
}

/**
 * Generate searchable text
 */
function generateSearchableText(product = {}) {
  const fields = [
    product.name,
    product.brand,
    product.variant,
    product.flavor,
    product.weight,
    product.category,
    product.subcategory,
    product.productType,
    product.description,
    product.searchableText,
    product.ocrText,
  ]
    .filter(Boolean)
    .map((value) => value.toString().trim().toLowerCase());

  const normalizedWords = fields
    .join(" ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  return [...new Set(normalizedWords)].join(" ");
}

module.exports = {
  generateClassId,
  generateSearchableText,
};
