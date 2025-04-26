import {
  createCategory,
  updateCategory,
  getAllCategories,
  getCategoryById,
  deleteCategory,
} from './api';

export const categoryService = {
  createCategory: async (formData) => {
    try {
      const response = await createCategory(formData);
      return {
        success: true,
        data: response.data.category,
        message: response.data.message || 'Category created successfully',
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Failed to create category',
      };
    }
  },

  updateCategory: async (id, formData) => {
    try {
      const response = await updateCategory(id, formData);
      return {
        success: true,
        data: response.data.category,
        message: response.data.message || 'Category updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Failed to update category',
      };
    }
  },

  getAllCategories: async (params = {}) => {
    try {
      const response = await getAllCategories(params); // Uses /api/admin/categories
      return {
        success: true,
        data: response.data.categories || [],
        message: response.data.message || 'Categories retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Failed to fetch categories',
      };
    }
  },

  getCategoryById: async (id) => {
    try {
      const response = await getCategoryById(id);
      return {
        success: true,
        data: response.data.category,
        message: response.data.message || 'Category retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Failed to fetch category',
      };
    }
  },

  deleteCategory: async (id) => {
    try {
      const response = await deleteCategory(id);
      return {
        success: true,
        data: null,
        message: response.data.message || 'Category deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Failed to delete category',
      };
    }
  },
};