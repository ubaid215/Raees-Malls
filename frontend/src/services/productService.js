import api from './api';

export const getProducts = async (page = 1, limit = 10, categoryId = null, options = {}) => {
  const { isPublic = true } = options;

  try {
    const params = { page, limit };
    if (categoryId) params.categoryId = categoryId;

    const response = await api.get('/products', {
      params,
      skipAuth: isPublic,
      skipRetry: true // Disable automatic retries
    });

    return response.data.products || [];
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch products');
  }
};

export const getProductById = async (id, options = {}) => {
  const { isPublic = true } = options;

  try {
    const response = await api.get(`/products/${id}`, { skipAuth: isPublic });
    return response.data.product;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch product');
  }
};

export const createProduct = async (productData, images) => {
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
    const response = await api.post('/admin/products', formData, { isMultipart: true });
    return response.data.product;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to create product');
  }
};

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
    throw new Error(error.response?.data?.message || 'Failed to update product');
  }
};

export const deleteProduct = async (id) => {
  try {
    const response = await api.delete(`/admin/products/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete product');
  }
};