const Product = require("../models/Product");
const Category = require("../models/Category");
const {
  enrichProductImages,
  syncFaissCatalog,
  matchOrGetCategory,
} = require("../services/productEnrichmentService");
const {
  uploadBufferToCloudinary,
  writeTempFile,
  deleteTempFile,
  slugify,
} = require("../utils/cloudinaryUpload");
const { deleteCloudinaryImage } = require("../config/cloud");
const { generateClassId, generateSearchableText } = require("../utils/productUtils");
const aiService = require("../services/aiService");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uploadFilesToCloudinary = async (files, folderSlug) => {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`[Product Registration] Uploading image ${i + 1}/${files.length} to Cloudinary...`);
    const result = await uploadBufferToCloudinary(file.buffer, file.originalname, folderSlug);
    console.log(`[Product Registration] Cloudinary upload: SUCCESS (${result.url})`);
    results.push(result);
  }
  return results;
};

const writeAllTempFiles = async (files) => {
  const paths = [];
  for (const file of files) {
    const tmpPath = await writeTempFile(file.buffer, file.originalname);
    paths.push(tmpPath);
  }
  return paths;
};

const cleanupTempFiles = async (paths = []) => {
  for (const p of paths) {
    await deleteTempFile(p);
  }
};

const cleanupCloudinaryImages = async (imageObjects = []) => {
  for (const img of imageObjects) {
    if (img && img.publicId) {
      await deleteCloudinaryImage(img.publicId);
    }
  }
};

// ─── GET /api/products ────────────────────────────────────────────────────────

const getProducts = async (req, res) => {
  try {
    const { keyword, category, minPrice, maxPrice, inStock, page = 1, limit = 50 } = req.query;

    let query = { isActive: true };

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { brand: { $regex: keyword, $options: "i" } },
        { barcode: { $regex: keyword, $options: "i" } },
        { aiClassId: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ];
    }

    if (category) query.category = category;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (inStock === "true") query.stock = { $gt: 0 };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ success: true, count: products.length, total, page: Number(page), pages: Math.ceil(total / Number(limit)), products });
  } catch (error) {
    console.error("Get Products Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/products/:id ────────────────────────────────────────────────────

const getProductById = async (req, res) => {
  try {
    const isBarcode = req.query.byBarcode === "true";
    const product = isBarcode
      ? await Product.findOne({ barcode: req.params.id }).populate("category", "name")
      : await Product.findById(req.params.id).populate("category", "name");

    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/products (Add New Product) ─────────────────────────────────────

const createProduct = async (req, res) => {
  let cloudinaryImages = [];
  let tempPaths = [];
  let product = null;

  try {
    console.log("==================================================");
    console.log("[Product Registration] New Product Registration Request Received");

    const {
      name,
      brand,
      variant,
      weight,
      barcode,
      price,
      stock,
      category,
      subcategory,
      productType,
      description,
      aiClassId: clientAiClassId,
      searchableText: clientSearchableText,
      allowDuplicate,
    } = req.body;

    // Price is required
    if (price === undefined || price === null || price === "") {
      return res.status(400).json({ success: false, message: "Price is required." });
    }

    // Images required (1–5)
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "At least one product image is required." });
    }

    if (req.files.length > 5) {
      return res.status(400).json({ success: false, message: "Maximum 5 images allowed per product." });
    }

    console.log(`[Product Registration] Images received: ${req.files.length}`);

    // 1. Upload images to Cloudinary
    const folderSlug = slugify(name || brand || "product");
    cloudinaryImages = await uploadFilesToCloudinary(req.files, folderSlug);

    // 2. Write temp files for local AI service analysis
    tempPaths = await writeAllTempFiles(req.files);

    // 3. Get category details
    let categoryDoc = null;
    if (category) {
      categoryDoc = await Category.findById(category);
    }

    // 4. Run AI enrichment pipeline across all uploaded images
    const enrichment = await enrichProductImages({
      ownerName: name || "",
      ownerDescription: description || "",
      categoryName: categoryDoc ? categoryDoc.name : "",
      imagePaths: tempPaths,
    });

    // Clean up temp files immediately
    await cleanupTempFiles(tempPaths);
    tempPaths = [];

    // 5. Finalize Product Attributes (Server validates & normalizes AI fields)
    const finalBrand = brand || enrichment.brand || "Generic";
    const finalProductName = name || enrichment.productName || "Unknown Product";
    const finalVariant = variant || enrichment.variant || "";
    const finalWeight = weight || enrichment.weight || "";
    const finalDescription = description || enrichment.description || `${finalBrand} ${finalProductName}`;
    const finalSubcategory = subcategory || enrichment.subcategory || "";
    const finalProductType = productType || enrichment.productType || "";

    // Server-side deterministic AI Class ID generation
    const finalAiClassId = generateClassId(finalBrand, finalProductName, finalVariant, finalWeight);
    console.log(`[Product Registration] AI Class ID: ${finalAiClassId}`);

    // Duplicate check
    if (allowDuplicate !== "true" && allowDuplicate !== true) {
      const existingProduct = await Product.findOne({ aiClassId: finalAiClassId, isActive: true });
      if (existingProduct) {
        // Delete uploaded Cloudinary images if duplicate rejected
        await cleanupCloudinaryImages(cloudinaryImages);
        return res.status(409).json({
          success: false,
          isDuplicate: true,
          message: `Similar product already exists: "${existingProduct.name}" (${existingProduct.aiClassId})`,
          existingProduct: {
            _id: existingProduct._id,
            name: existingProduct.name,
            aiClassId: existingProduct.aiClassId,
            price: existingProduct.price,
          },
        });
      }
    }

    // Server-side Searchable Text generation
    const finalSearchableText = generateSearchableText({
      name: finalProductName,
      brand: finalBrand,
      variant: finalVariant,
      weight: finalWeight,
      category: categoryDoc ? categoryDoc.name : enrichment.category,
      subcategory: finalSubcategory,
      productType: finalProductType,
      description: finalDescription,
      ocrText: enrichment.combinedOCR ? enrichment.combinedOCR.text : "",
    });

    // Server-side Vector Embedding generation
    let finalEmbedding = enrichment.embedding || [];
    if (!finalEmbedding || finalEmbedding.length === 0) {
      try {
        finalEmbedding = await aiService.generateEmbedding(finalSearchableText);
      } catch (embErr) {
        console.error("[Product Registration] Failed to generate embedding on fallback:", embErr.message);
      }
    }

    // Resolve Category ID
    let finalCategoryId = category || null;
    if (!finalCategoryId && enrichment.categoryId) {
      finalCategoryId = enrichment.categoryId;
    }

    // 6. Save product to MongoDB
    product = await Product.create({
      name: finalProductName,
      brand: finalBrand,
      variant: finalVariant,
      weight: finalWeight,
      barcode: barcode && typeof barcode === "string" && barcode.trim() && barcode.trim() !== "null" ? barcode.trim() : undefined,
      price: Number(price),
      stock: Number(stock) || 0,
      category: finalCategoryId,
      subcategory: finalSubcategory,
      productType: finalProductType,
      description: finalDescription,
      aiClassId: finalAiClassId,
      searchableText: finalSearchableText,
      aiFeatureVector: Array.isArray(finalEmbedding) ? finalEmbedding : [],
      images: cloudinaryImages, // [{ url, publicId }]
    });

    console.log(`[Product Registration] MongoDB: SUCCESS (Product ID: ${product._id})`);

    // 7. Instant FAISS Catalog Index Update
    try {
      const allProducts = await Product.find({ isActive: true }).lean();
      await syncFaissCatalog(allProducts);
      console.log(`[Product Registration] FAISS: SUCCESS`);
    } catch (faissError) {
      console.error("[Product Registration] FAISS: FAILED -", faissError.message);
      // FAISS error is logged, but product saved in MongoDB so owner does not lose record
    }

    console.log("==================================================");

    res.status(201).json({
      success: true,
      message: "Product registered successfully with automatic AI indexing",
      product,
    });
  } catch (error) {
    console.error("[Product Registration] FAILED:", error);
    await cleanupTempFiles(tempPaths);
    if (!product && cloudinaryImages.length > 0) {
      await cleanupCloudinaryImages(cloudinaryImages);
    }
    if (product && product._id) {
      try { await Product.findByIdAndDelete(product._id); } catch (_) {}
    }
    res.status(500).json({ success: false, message: error.message || "Product registration failed." });
  }
};

// ─── PUT /api/products/:id ────────────────────────────────────────────────────

const updateProduct = async (req, res) => {
  let tempPaths = [];
  let newCloudinaryImages = [];

  try {
    let product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const { name, brand, variant, weight, barcode, price, stock, category, subcategory, productType, description, existingImages } = req.body;

    let keptImages = [];
    if (existingImages) {
      try {
        const parsed = JSON.parse(existingImages);
        keptImages = parsed.map((img) =>
          typeof img === "string" ? { url: img, publicId: "" } : img
        );
      } catch (_) {
        keptImages = product.images || [];
      }
    } else {
      keptImages = product.images || [];
    }

    // Remove deleted images from Cloudinary
    const removedImages = (product.images || []).filter(
      (existing) => !keptImages.some((k) => k.url === existing.url || k === existing.url)
    );
    cleanupCloudinaryImages(removedImages).catch(console.error);

    // Handle newly uploaded images
    if (req.files && req.files.length > 0) {
      const totalImages = keptImages.length + req.files.length;
      if (totalImages > 5) {
        return res.status(400).json({ success: false, message: "Maximum 5 images allowed per product." });
      }

      const folderSlug = slugify(name || product.name || "product");
      newCloudinaryImages = await uploadFilesToCloudinary(req.files, folderSlug);
      tempPaths = await writeAllTempFiles(req.files);
    }

    const allImages = [...keptImages, ...newCloudinaryImages];

    const finalBrand = brand !== undefined ? brand : (product.brand || "Generic");
    const finalProductName = name !== undefined ? name : product.name;
    const finalVariant = variant !== undefined ? variant : (product.variant || "");
    const finalWeight = weight !== undefined ? weight : (product.weight || "");

    const finalAiClassId = generateClassId(finalBrand, finalProductName, finalVariant, finalWeight);

    let updatedFields = {
      name: finalProductName,
      brand: finalBrand,
      variant: finalVariant,
      weight: finalWeight,
      barcode: barcode !== undefined ? (barcode.trim() ? barcode.trim() : null) : product.barcode,
      price: price !== undefined ? Number(price) : product.price,
      stock: stock !== undefined ? Number(stock) : product.stock,
      category: category !== undefined ? (category || null) : product.category,
      subcategory: subcategory !== undefined ? subcategory : product.subcategory,
      productType: productType !== undefined ? productType : product.productType,
      description: description !== undefined ? description : product.description,
      aiClassId: finalAiClassId,
      images: allImages,
    };

    // Re-run AI enrichment if new images provided
    if (req.files && req.files.length > 0) {
      let categoryName = "";
      if (category) {
        const categoryDoc = await Category.findById(category);
        categoryName = categoryDoc?.name || "";
      }

      const enrichment = await enrichProductImages({
        ownerName: finalProductName,
        ownerDescription: description || product.description || "",
        categoryName,
        imagePaths: tempPaths,
      });

      await cleanupTempFiles(tempPaths);
      tempPaths = [];

      updatedFields.searchableText = generateSearchableText({
        name: finalProductName,
        brand: finalBrand,
        variant: finalVariant,
        weight: finalWeight,
        category: categoryName || enrichment.category,
        subcategory: finalSubcategory,
        productType: finalProductType,
        description: updatedFields.description,
        ocrText: enrichment.combinedOCR ? enrichment.combinedOCR.text : "",
      });

      if (enrichment.embedding && enrichment.embedding.length > 0) {
        updatedFields.aiFeatureVector = enrichment.embedding;
      }
    }

    product = await Product.findByIdAndUpdate(req.params.id, updatedFields, {
      new: true,
      runValidators: true,
    });

    // Sync FAISS catalog after update
    try {
      const allProducts = await Product.find({ isActive: true }).lean();
      await syncFaissCatalog(allProducts);
    } catch (faissError) {
      console.error("[Product Update] FAISS sync error:", faissError.message);
    }

    res.json({ success: true, message: "Product updated successfully", product });
  } catch (error) {
    console.error("Update Product Error:", error);
    await cleanupTempFiles(tempPaths);
    if (newCloudinaryImages.length > 0) {
      await cleanupCloudinaryImages(newCloudinaryImages);
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE /api/products/:id ─────────────────────────────────────────────────

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    // Delete associated Cloudinary images
    if (product.images && product.images.length > 0) {
      cleanupCloudinaryImages(product.images).catch(console.error);
    }

    // Sync FAISS catalog after delete
    try {
      const allProducts = await Product.find({ isActive: true }).lean();
      await syncFaissCatalog(allProducts);
    } catch (faissError) {
      console.error("[Product Delete] FAISS sync error:", faissError.message);
    }

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
