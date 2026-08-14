import API from "./api";

export const getProducts = async (params = {}) => {
  const res = await API.get("/products", { params });
  return res.data;
};

export const getProductById = async (id) => {
  const res = await API.get(`/products/${id}`);
  return res.data;
};

export const enrichProduct = async (formData) => {
  const res = await API.post("/products/enrich", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const createProduct = async (formData) => {
  const res = await API.post("/products", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const updateProduct = async (id, formData) => {
  const res = await API.put(`/products/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteProduct = async (id) => {
  const res = await API.delete(`/products/${id}`);
  return res.data;
};

export const getCategories = async () => {
  const res = await API.get("/categories");
  return res.data;
};

export const createCategory = async (categoryData) => {
  const res = await API.post("/categories", categoryData);
  return res.data;
};
