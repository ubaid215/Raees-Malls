import api from './api';

// Get all categories (public)
export const getCategories = async () => {
  try {
    const response = await api.get('/categories');
    return response.data.categories;
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch categories');
  }
};

// Get category by ID (public)
export const getCategoryById = async (id) => {
  try {
    const response = await api.get(`/categories/${id}`);
    return response.data.category;
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch category');
  }
};

// Create category (admin)
export const createCategory = async (categoryData) => {
  try {
    const formData = new FormData();
    for (const key in categoryData) {
      if (key === 'image' && categoryData[key]) {
        formData.append('image', categoryData[key]);
      } else {
        formData.append(key, categoryData[key]);
      }
    }

    const response = await api.post('/admin/categories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.category;
  } catch (error) {
    throw new Error(error.message || 'Failed to create category');
  }
};

// Update category (admin)
export const updateCategory = async (id, categoryData) => {
  try {
    const formData = new FormData();
    for (const key in categoryData) {
      if (key === 'image' && categoryData[key]) {
        formData.append('image', categoryData[key]);
      } else {
        formData.append(key, categoryData[key]);
      }
    }

    const response = await api.put(`/admin/categories/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.category;
  } catch (error) {
    throw new Error(error.message || 'Failed to update category');
  }
};

// Delete category (admin)
export const deleteCategory = async (id) => {
  try {
    const response = await api.delete(`/admin/categories/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.message || 'Failed to delete category');
  }
};