import axios from "axios";

const API_URL = "http://localhost:5000/api/products";
const CATEGORY_API_URL = "http://localhost:5000/api/categories";

// Helper to handle API errors
const handleError = (error) => {
  const message =
    error.response?.data?.error || error.message || "An error occurred";
  throw new Error(message);
};

// Get all products with pagination and search
export const getProducts = async ({ page = 1, limit = 10, search = "", isFeatured = false }) => {
  try {
    const response = await axios.get(API_URL, {
      params: { 
        page, 
        limit, 
        ...(search && { search }), 
        ...(isFeatured && { isFeatured }) // Add isFeatured filter
      },
    });
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to fetch products");
    }
    return {
      data: response.data.data,
      total: response.data.pagination.total,
      page: response.data.pagination.page,
      limit: response.data.pagination.limit,
      totalPages: response.data.pagination.pages,
    };
  } catch (error) {
    handleError(error);
  }
};

// Get a single product by ID
export const getProductById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to fetch product");
    }
    return response.data.data;
  } catch (error) {
    handleError(error);
  }
};

// Create a new product
export const createProduct = async (productData) => {
  try {
    const formData = new FormData();
    formData.append('title', productData.title || '');
    formData.append('price', productData.price || 0);
    formData.append('stock', productData.stock || 0);
    formData.append('description', productData.description || '');
    if (productData.categories && Array.isArray(productData.categories)) {
      formData.append('categories', JSON.stringify(productData.categories)); // Send as JSON string
    }
    if (productData.image) {
      formData.append('image', productData.image);
    }

    const response = await axios.post(API_URL, formData);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create product');
    }
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
// Update an existing product
export const updateProduct = async (id, productData) => {
  try {
    const formData = new FormData();
    Object.entries(productData).forEach(([key, value]) => {
      if (key === "images") {
        value.forEach((image) => {
          if (image instanceof File) formData.append("images", image);
        });
      } else if (key === "variants" || key === "seo" || key === "categories") {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });

    const response = await axios.put(`${API_URL}/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to update product");
    }
    return response.data.data;
  } catch (error) {
    handleError(error);
  }
};

// Delete a product
export const deleteProduct = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to delete product");
    }
    return response.data.data;
  } catch (error) {
    handleError(error);
  }
};

// Get all categories
export const getCategories = async () => {
  try {
    const response = await axios.get(CATEGORY_API_URL);
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to fetch categories");
    }
    return response.data.data;
  } catch (error) {
    handleError(error);
  }
};