import API from './api';

export const productService = {
  // Admin endpoints
  createProduct: async (formData) => {
    try {
      const response = await API.post('/api/admin/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return {
        success: true,
        data: response.data.product,
        message: response.data.message || 'Product created successfully',
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Failed to create product',
      };
    }
  },

  getProductById: async (id) => {
    try {
      const response = await API.get(`/api/admin/products/${id}`);
      return {
        success: true,
        data: response.data.product,
        message: response.data.message || 'Product retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Failed to fetch product',
      };
    }
  },

  getProducts: async ({ page = 1, limit = 10, search = '' } = {}) => {
    try {
      const response = await API.get('/api/admin/products', {
        params: { page, limit, search },
      });
      return {
        success: true,
        data: response.data.products || [],
        pages: response.data.totalPages || 1,
        message: response.data.message || 'Products retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        pages: 1,
        message: error.response?.data?.message || 'Failed to fetch products',
      };
    }
  },

  updateProduct: async (id, formData) => {
    try {
      const response = await API.put(`/api/admin/products/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return {
        success: true,
        data: response.data.product,
        message: response.data.message || 'Product updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Failed to update product',
      };
    }
  },

  deleteProduct: async (id) => {
    try {
      const response = await API.delete(`/api/admin/products/${id}`);
      return {
        success: true,
        data: null,
        message: response.data.message || 'Product deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Failed to delete product',
      };
    }
  },

  // Public endpoints
  getPublicProductById: async (id) => {
    try {
      const response = await API.get(`/api/products/public/${id}`);
      return {
        success: true,
        data: response.data.product,
        message: response.data.message || 'Public product retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Failed to fetch public product',
      };
    }
  },

  getAllPublicProducts: async (params = {}) => {
    try {
      const response = await API.get('/api/products/public', { params });
      return {
        success: true,
        data: response.data.products || [],
        pages: response.data.totalPages || 1,
        message: response.data.message || 'Public products retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        pages: 1,
        message: error.response?.data?.message || 'Failed to fetch public products',
      };
    }
  },
};

// For backward compatibility
export const getProductById = productService.getPublicProductById;
export const getAllProducts = productService.getAllPublicProducts;