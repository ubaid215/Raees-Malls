import api from './api';

export const getCategories = async (options = {}) => {
  const { isPublic = true, queryParams = '' } = options;
  try {
    const endpoint = isPublic ? '/categories/public' : '/admin/categories';
    const url = queryParams ? `${endpoint}?${queryParams}` : endpoint;
    
    const response = await api.get(url, { skipAuth: isPublic });
    
    // Extract categories from response
    const categories = response.data?.data?.categories || response.data?.categories || [];
    return Array.isArray(categories) ? categories : [];
  } catch (error) {
    console.error('Get categories error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    
    if (error.response?.status === 403) {
      throw new Error('You are not authorized to access categories. Please log in or contact support.');
    }
    if (error.response?.status === 429) {
      throw new Error('Too many requests. Please try again later.');
    }
    throw new Error(error.response?.data?.message || 'Failed to fetch categories');
  }
};

export const getCategoryById = async (id, options = {}) => {
  const { isPublic = true } = options;

  if (!id) {
    throw new Error('Category ID is required');
  }

  // Check cache first
  let cachedCategory = null;
  try {
    const cachedCategoryStr = localStorage.getItem(`category_${id}`);
    if (cachedCategoryStr) {
      const cached = JSON.parse(cachedCategoryStr);
      if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
        cachedCategory = cached.data;
      }
    }
  } catch (cacheErr) {
    console.warn('Category cache read error:', cacheErr);
  }

  if (cachedCategory) {
    return cachedCategory;
  }

  try {
    const endpoint = isPublic ? `/categories/public/${id}` : `/admin/categories/${id}`;
    const response = await api.get(endpoint, { skipAuth: isPublic });
    
    // Extract category from response
    const category = response.data?.data?.category || response.data?.category;
    
    if (!category) {
      throw new Error('Category not found');
    }

    // Cache the category
    try {
      localStorage.setItem(`category_${id}`, JSON.stringify({
        data: category,
        timestamp: Date.now()
      }));
    } catch (cacheErr) {
      console.warn('Category cache write error:', cacheErr);
    }

    return category;
  } catch (error) {
    console.error('Get category by ID error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    
    if (error.response?.status === 404) {
      throw new Error('Category not found');
    }
    if (error.response?.status === 403) {
      throw new Error('You are not authorized to access this category. Please log in or contact support.');
    }
    throw new Error(error.response?.data?.message || 'Failed to fetch category');
  }
};

export const createCategory = async (categoryData) => {
  try {
    if (!categoryData) {
      throw new Error('Category data is required');
    }

    const formData = new FormData();
    
    // Process form data
    for (const key in categoryData) {
      if (key === 'image' && categoryData[key]) {
        // Handle image file
        formData.append('image', categoryData[key]);
      } else if (categoryData[key] !== undefined && categoryData[key] !== null) {
        // Handle other fields
        formData.append(key, categoryData[key]);
      }
    }

    // Log form data in development (remove in production)
    if (process.env.NODE_ENV !== 'production') {
      for (let [key, value] of formData.entries()) {
        console.log(`FormData ${key}: ${value instanceof File ? value.name : value}`);
      }
    }

    const response = await api.post('/admin/categories', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    // Extract category from response
    return response.data?.data?.category || response.data?.category;
  } catch (error) {
    console.error('Create category error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    
    if (error.response?.status === 403) {
      throw new Error('You are not authorized to create categories. Admin access required.');
    }
    if (error.response?.status === 400) {
      throw new Error(error.response?.data?.message || 'Invalid category data');
    }
    throw new Error(error.response?.data?.message || 'Failed to create category');
  }
};

export const updateCategory = async (id, categoryData) => {
  try {
    if (!id) {
      throw new Error('Category ID is required');
    }
    
    if (!categoryData) {
      throw new Error('Category data is required');
    }

    const formData = new FormData();
    
    // Process form data
    for (const key in categoryData) {
      if (key === 'image' && categoryData[key]) {
        // Handle image file
        formData.append('image', categoryData[key]);
      } else if (categoryData[key] !== undefined && categoryData[key] !== null) {
        // Handle other fields, including null values
        formData.append(key, categoryData[key]);
      }
    }

    const response = await api.put(`/admin/categories/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    // Extract category from response
    return response.data?.data?.category || response.data?.category;
  } catch (error) {
    console.error('Update category error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    
    if (error.response?.status === 404) {
      throw new Error('Category not found');
    }
    if (error.response?.status === 403) {
      throw new Error('You are not authorized to update categories. Admin access required.');
    }
    if (error.response?.status === 400) {
      throw new Error(error.response?.data?.message || 'Invalid category data');
    }
    throw new Error(error.response?.data?.message || 'Failed to update category');
  }
};

export const deleteCategory = async (id) => {
  try {
    if (!id) {
      throw new Error('Category ID is required');
    }
    
    const response = await api.delete(`/admin/categories/${id}`);
    return response.data;
  } catch (error) {
    console.error('Delete category error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    
    if (error.response?.status === 404) {
      throw new Error('Category not found');
    }
    if (error.response?.status === 403) {
      throw new Error('You are not authorized to delete categories. Admin access required.');
    }
    if (error.response?.status === 400) {
      const message = error.response?.data?.message || '';
      if (message.includes('subcategories') || message.includes('products')) {
        throw new Error('Cannot delete category with subcategories or products');
      }
      throw new Error(message || 'Invalid request');
    }
    throw new Error(error.response?.data?.message || 'Failed to delete category');
  }
};