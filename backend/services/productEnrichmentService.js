const aiService = require("./aiService");
const Category = require("../models/Category");
const Product = require("../models/Product");
const { generateClassId, generateSearchableText } = require("../utils/productUtils");

const normalizeText = (text = "") =>
  text
    .toString()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\/-]/g, " ")
    .trim();

const mergeOcrResults = (ocrResults = []) => {
  const lines = [];
  const texts = [];
  let totalConfidence = 0;
  let validCount = 0;

  for (const ocr of ocrResults) {
    if (!ocr || typeof ocr !== "object") continue;
    const text = normalizeText(ocr.text || "");
    if (text) {
      texts.push(text);
      validCount++;
    }
    const ocrLines = Array.isArray(ocr.lines) ? ocr.lines.map(normalizeText).filter(Boolean) : [];
    lines.push(...ocrLines);
    totalConfidence += Number(ocr.confidence || 0);
  }

  return {
    text: [...new Set(texts)].join(" "),
    lines: [...new Set(lines)],
    confidence: validCount > 0 ? parseFloat((totalConfidence / validCount).toFixed(4)) : 0,
  };
};

const pickBestVlmValue = (vlmResults = [], keys = []) => {
  for (const result of vlmResults) {
    if (!result || typeof result !== "object") continue;
    for (const key of keys) {
      const value = result[key];
      if (value && value !== "N/A" && value !== "Generic" && value !== "Unknown" && value !== "null") {
        return normalizeText(value);
      }
    }
  }
  return "";
};

const mergeVlmResults = (vlmResults = []) => {
  const valid = vlmResults.filter((r) => r && typeof r === "object");
  return {
    brand: pickBestVlmValue(valid, ["brand"]),
    productName: pickBestVlmValue(valid, ["product_name", "productName", "name", "title"]),
    variant: pickBestVlmValue(valid, ["variant", "flavor"]),
    weight: pickBestVlmValue(valid, ["weight", "weight_volume", "netVolume", "size"]),
    category: pickBestVlmValue(valid, ["category"]),
    subcategory: pickBestVlmValue(valid, ["subcategory"]),
    productType: pickBestVlmValue(valid, ["productType", "type"]),
    barcode: pickBestVlmValue(valid, ["barcode", "upc", "sku"]),
    description: pickBestVlmValue(valid, ["description", "details"]),
    confidence: valid.length
      ? parseFloat((valid.reduce((acc, r) => acc + (Number(r?.confidence) || 0), 0) / valid.length).toFixed(2))
      : 0,
  };
};

/**
 * Matches an AI-suggested category string against existing MongoDB categories.
 * If no matching category exists in MongoDB, AUTOMATICALLY creates the new category!
 */
const matchOrGetCategory = async (suggestedCategoryName = "") => {
  try {
    const existingCategories = await Category.find();

    if (!suggestedCategoryName || !suggestedCategoryName.trim()) {
      let defaultCat = existingCategories.find((c) => c.name.toLowerCase() === "other");
      if (!defaultCat) {
        defaultCat = await Category.create({
          name: "Other",
          slug: "other",
          description: "General & Miscellaneous Products",
        });
      }
      return { categoryId: defaultCat._id, categoryName: defaultCat.name };
    }

    const trimmed = suggestedCategoryName.trim();
    const normSuggested = trimmed.toLowerCase();

    // 1. Exact case-insensitive match
    const exact = existingCategories.find((c) => c.name.toLowerCase().trim() === normSuggested);
    if (exact) {
      return { categoryId: exact._id, categoryName: exact.name };
    }

    // 2. Partial / includes match
    const partial = existingCategories.find(
      (c) => normSuggested.includes(c.name.toLowerCase().trim()) || c.name.toLowerCase().trim().includes(normSuggested)
    );
    if (partial) {
      return { categoryId: partial._id, categoryName: partial.name };
    }

    // 3. Automatically create new Category in MongoDB with proper slug!
    const slug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const newCategory = await Category.create({
      name: trimmed,
      slug: slug || `cat-${Date.now()}`,
      description: `Auto-created category for ${trimmed}`,
    });

    console.log(`[Product Registration] Auto-created category in MongoDB: "${newCategory.name}" (slug: ${newCategory.slug})`);
    return { categoryId: newCategory._id, categoryName: newCategory.name };
  } catch (err) {
    console.error("[CATEGORY MATCH] Error in category lookup/creation:", err.message);
    return { categoryId: null, categoryName: suggestedCategoryName || "Other" };
  }
};

const enrichProductImages = async ({ ownerName = "", ownerDescription = "", categoryName = "", imagePaths = [] }) => {
  console.log(`[Product Registration] Images received for AI analysis: ${imagePaths.length}`);

  // 1. Pre-flight health check to verify Python service is online
  try {
    await aiService.checkHealth();
    console.log('[ENRICH][HEALTH] AI service reachable');
  } catch (err) {
    err.stage = 'AI_SERVICE_CONNECTION';
    console.error('[ENRICH][HEALTH] Failed:', err.message);
    throw err;
  }

  let ocrResults = [];
  let vlmResults = [];

  // 2. OCR across all images
  const ocrPromises = imagePaths.map(async (path) => {
    try {
      const result = await aiService.performOCR(path);
      console.log(`[ENRICH][OCR] Success for ${path}`);
      return result;
    } catch (err) {
      err.stage = 'OCR';
      console.error(`[ENRICH][OCR] Failed for ${path}:`, err.message);
      throw err;
    }
  });
  ocrResults = await Promise.all(ocrPromises);

  // 3. VLM across all images
  const vlmPromises = imagePaths.map(async (path) => {
    try {
      const result = await aiService.performVLM(path);
      console.log(`[ENRICH][VLM] Success for ${path}`);
      return result;
    } catch (err) {
      err.stage = 'VLM';
      console.error(`[ENRICH][VLM] Failed for ${path}:`, err.message);
      throw err;
    }
  });
  vlmResults = await Promise.all(vlmPromises);

  const combinedOCR = mergeOcrResults(ocrResults);
  const combinedVLM = mergeVlmResults(vlmResults);

  console.log(`[Product Registration] AI Extraction → Brand: "${combinedVLM.brand}", Product: "${combinedVLM.productName}", Weight: "${combinedVLM.weight}"`);

  // 4. Final product metadata determination
  const finalBrand = combinedVLM.brand || "Generic";
  const finalProductName = ownerName || combinedVLM.productName || "Unknown Product";
  const finalVariant = combinedVLM.variant || "";
  const finalWeight = combinedVLM.weight || "";
  const finalBarcode = combinedVLM.barcode || null;
  const finalDescription = ownerDescription || combinedVLM.description || `${finalBrand} ${finalProductName} ${finalWeight}`.trim();

  // 5. Category auto-matching / auto-creation in MongoDB
  const matchedCat = await matchOrGetCategory(categoryName || combinedVLM.category);
  console.log(`[Product Registration] Category: "${matchedCat.categoryName}"`);

  // 6. Deterministic AI Class ID generation
  const aiClassId = generateClassId(finalBrand, finalProductName, finalVariant, finalWeight);
  console.log(`[Product Registration] AI Class ID: "${aiClassId}"`);

  // 7. Automatic Searchable Text generation
  const searchableText = generateSearchableText({
    name: finalProductName,
    brand: finalBrand,
    variant: finalVariant,
    weight: finalWeight,
    category: matchedCat.categoryName,
    subcategory: combinedVLM.subcategory,
    productType: combinedVLM.productType,
    description: finalDescription,
    ocrText: combinedOCR.text,
  });

  // 8. Automatic Embedding generation
  let embedding = [];
  try {
    embedding = await aiService.generateEmbedding(searchableText);
    console.log(`[ENRICH][EMBEDDING] SUCCESS (${embedding.length} dims)`);
  } catch (embErr) {
    const err = new Error(embErr.message);
    err.stage = 'EMBEDDING';
    console.error('[ENRICH][EMBEDDING] Failed:', err.message);
    throw err;
  }

  // 9. Duplicate check in MongoDB
  let isDuplicate = false;
  let existingProduct = null;
  try {
    existingProduct = await Product.findOne({
      $or: [
        { aiClassId },
        { name: { $regex: new RegExp(`^${finalProductName}$`, "i") }, brand: { $regex: new RegExp(`^${finalBrand}$`, "i") } },
      ],
      isActive: true,
    }).lean();
    if (existingProduct) {
      isDuplicate = true;
      console.log(`[ENRICH][DUPLICATE] Found duplicate: ${existingProduct.aiClassId}`);
    }
  } catch (err) {
    err.stage = 'DUPLICATE_CHECK';
    console.error('[ENRICH][DUPLICATE] Error:', err.message);
    throw err;
  }

  return {
    success: true,
    productName: finalProductName,
    product_name: finalProductName,
    brand: finalBrand,
    variant: finalVariant,
    weight: finalWeight,
    weight_volume: finalWeight,
    category: matchedCat.categoryName,
    categoryId: matchedCat.categoryId,
    subcategory: combinedVLM.subcategory || "",
    productType: combinedVLM.productType || "",
    barcode: finalBarcode,
    description: finalDescription,
    aiClassId,
    ai_class_id: aiClassId,
    searchableText,
    ocr_text: combinedOCR.text,
    embedding,
    embedding_generated: Array.isArray(embedding) && embedding.length > 0,
    catalog_index_updated: false,
    confidence: combinedVLM.confidence || 0.85,
    isDuplicate,
    existingProduct: existingProduct
      ? {
          _id: existingProduct._id,
          name: existingProduct.name,
          aiClassId: existingProduct.aiClassId,
          price: existingProduct.price,
        }
      : null,
    combinedOCR,
    combinedVLM,
  };
};

const syncFaissCatalog = async (products = []) => {
  console.log(`[FAISS] Syncing ${products.length} products to vector index...`);
  await aiService.indexProducts(products);
  console.log(`[Product Registration] FAISS: SUCCESS`);
};

module.exports = {
  enrichProductImages,
  syncFaissCatalog,
  matchOrGetCategory,
};
