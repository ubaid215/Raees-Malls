import api from './api';

// ========================
// PUBLIC CATEGORY ROUTES
// ========================

export const getCategories = async (options = {}) => {
  const { isPublic = true } = options; // Default to public route

  try {
    const response = await api.get('/categories', {
      skipAuth: isPublic, // Skip authentication for public routes
      skipRetry: true // Disable automatic retries
    });

    return response.data.categories || [];
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch categories');
  }
};

export const getCategoryById = async (id, options = {}) => {
  const { isPublic = true } = options; // Default to public route

  // Check cache first
  let cachedCategory = null;
  try {
    const cachedCategoryStr = localStorage.getItem(`category_${id}`);
    if (cachedCategoryStr) {
      cachedCategory = JSON.parse(cachedCategoryStr);
    }
  } catch (cacheErr) {
    console.warn('Category cache read error:', cacheErr);
  }

  if (cachedCategory) {
    return cachedCategory;
  }

  try {
    const response = await api.get(`/categories/${id}`, {
      skipAuth: isPublic // Skip authentication for public routes
    });
    const category = response.data.category;

    // Cache the category
    try {
      if (category) {
        localStorage.setItem(`category_${id}`, JSON.stringify(category));
      }
    } catch (cacheErr) {
      console.warn('Category cache write error:', cacheErr);
    }

    return category;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch category');
  }
};

// ========================
// ADMIN CATEGORY ROUTES
// (Require authentication)
// ========================

export const createCategory = async (categoryData) => {
  try {
    const formData = new FormData();
    for (const key in categoryData) {
      if (key === 'image' && categoryData[key]) {
        formData.append('image', categoryData[key]);
      } else if (categoryData[key] !== undefined) {
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
    throw new Error(error.response?.data?.message || 'Failed to create category');
  }
};

export const updateCategory = async (id, categoryData) => {
  try {
    const formData = new FormData();
    for (const key in categoryData) {
      if (key === 'image' && categoryData[key]) {
        formData.append('image', categoryData[key]);
      } else if (categoryData[key] !== undefined) {
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
    throw new Error(error.response?.data?.message || 'Failed to update category');
  }
};

export const deleteCategory = async (id) => {
  try {
    const response = await api.delete(`/admin/categories/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete category');
  }
};