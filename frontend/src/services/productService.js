import api from './api';

// Get all products (public)
export const getProducts = async (page = 1, limit = 10, categoryId = null) => {
  try {
    const params = { page, limit };
    if (categoryId) params.categoryId = categoryId;
    const response = await api.get('/products', { params });
    return response.data.products;
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch products');
  }
};

// Get product by ID (public)
export const getProductById = async (id) => {
  try {
    const response = await api.get(`/products/${id}`);
    return response.data.product;
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch product');
  }
};

// Create product (admin)
export const createProduct = async (productData, images) => {
  try {
    const formData = new FormData();
    Object.entries(productData).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value)); // e.g., variants
      } else {
        formData.append(key, value);
      }
    });
    images.forEach((image) => formData.append('images', image)); // Append multiple images
    const response = await api.post('/admin/products', formData, { isMultipart: true });
    return response.data.product;
  } catch (error) {
    throw new Error(error.message || 'Failed to create product');
  }
};

// Update product (admin)
export const updateProduct = async (id, productData, images) => {
  try {
    const formData = new FormData();
    Object.entries(productData).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });
    images.forEach((image) => formData.append('images', image));
    const response = await api.put(`/admin/products/${id}`, formData, { isMultipart: true });
    return response.data.product;
  } catch (error) {
    throw new Error(error.message || 'Failed to update product');
  }
};

// Delete product (admin)
export const deleteProduct = async (id) => {
  try {
    const response = await api.delete(`/admin/products/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.message || 'Failed to delete product');
  }
};