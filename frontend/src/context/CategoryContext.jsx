/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '../services/categoryService';

export const CategoryContext = createContext();

export const CategoryProvider = ({ children, isPublicDefault = true }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPublic, setIsPublic] = useState(isPublicDefault);
  const [parentCategories, setParentCategories] = useState([]);

  // Cache management functions
  const getCache = (key) => {
    try {
      const cached = localStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch (err) {
      console.warn('Cache read error:', err);
      return null;
    }
  };

  const setCache = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (err) {
      console.warn('Cache write error:', err);
    }
  };

  const clearCache = (key) => {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.warn('Cache clear error:', err);
    }
  };

  const clearRelatedCaches = (categoryId) => {
    if (categoryId) {
      clearCache(`category_${categoryId}`);
    }
    const keysToClear = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('categories_') || key?.startsWith('category_')) {
        keysToClear.push(key);
      }
    }
    keysToClear.forEach(clearCache);
  };

  // Utility for API retries
  const withRetry = async (fn, retries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const status = err.response?.status;
        if ((status === 429 || status === 503) && attempt < retries) {
          const waitTime = delay * 2 ** (attempt - 1);
          console.warn(`Error ${status}, retrying in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        throw err;
      }
    }
  };

  // Fetch categories with options for filtering
  const fetchCategories = useCallback(async (options = {}) => {
    const { 
      forcePublic = isPublic,
      parentId = null,
      page = 1,
      limit = 50,
      sort = 'name'
    } = options;
    
    const cacheKey = `categories_${forcePublic ? 'public' : 'admin'}_${parentId || 'all'}_${page}_${limit}_${sort}`;
    const cached = getCache(cacheKey);

    // Use cache if fresh (less than 1 hour old)
    if (cached && Date.now() - cached.timestamp < 3600000) {
      setCategories(cached.data || []);
      return cached.data;
    }

    setLoading(true);
    setError('');

    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        page,
        limit,
        sort
      });
      
      if (parentId !== null) {
        queryParams.append('parentId', parentId);
      }
      
      const categoryData = await withRetry(() => 
        getCategories({ 
          isPublic: forcePublic,
          queryParams: queryParams.toString()
        })
      );
      
      const validCategoryData = Array.isArray(categoryData) ? categoryData : [];
      setCategories(validCategoryData);
      
      // Update parent categories if top-level categories are fetched
      if (parentId === null || parentId === 'null') {
        setParentCategories(validCategoryData.filter(cat => !cat.parentId));
      }
      
      setCache(cacheKey, validCategoryData);
      return validCategoryData;
    } catch (err) {
      console.error('Fetch categories error:', err);
      setError(err.message || 'Failed to fetch categories');
      if (cached?.data) {
        setCategories(cached.data || []);
        return cached.data;
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isPublic]);

  // Get a single category by ID
  const fetchCategoryById = useCallback(async (id, options = {}) => {
    const { forcePublic = isPublic } = options;
    
    setLoading(true);
    setError('');
    
    try {
      const category = await getCategoryById(id, { isPublic: forcePublic });
      setSelectedCategory(category);
      return category;
    } catch (err) {
      setError(err.message || `Failed to fetch category with ID ${id}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isPublic]);

  // Create a new category
  const createNewCategory = useCallback(async (categoryData) => {
    setLoading(true);
    setError('');

    try {
      const category = await createCategory(categoryData);
      clearRelatedCaches();
      await fetchCategories({ forcePublic: false });
      return category;
    } catch (err) {
      setError(err.message || 'Failed to create category');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  // Update an existing category
  const updateExistingCategory = useCallback(async (id, categoryData) => {
    setLoading(true);
    setError('');

    try {
      const category = await updateCategory(id, categoryData);
      clearRelatedCaches(id);
      await fetchCategories({ forcePublic: false });
      return category;
    } catch (err) {
      setError(err.message || 'Failed to update category');
      throw err;
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCategories]);

  // Delete a category
  const deleteExistingCategory = useCallback(async (id) => {
    setLoading(true);
    setError('');

    try {
      await deleteCategory(id);
      clearRelatedCaches(id);
      await fetchCategories({ forcePublic: false });
      setSelectedCategory(null);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to delete category');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  // Clear expired cache entries
  useEffect(() => {
    const cleanupExpiredCache = () => {
      const now = Date.now();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const cached = key ? getCache(key) : null;
        if (cached && now - cached.timestamp > 86400000) { // 24 hours
          clearCache(key);
        }
      }
    };
    
    cleanupExpiredCache();
    const intervalId = setInterval(cleanupExpiredCache, 3600000); // Every hour
    
    return () => clearInterval(intervalId);
  }, []);

  // Initial category load
  useEffect(() => {
    fetchCategories().catch(err => {
      console.error("Initial category load failed:", err);
    });
  }, [fetchCategories, isPublic]);

  // Public helper functions for common operations
  const getCategoryTree = useCallback(() => {
    // Creates a hierarchical tree from flat category list
    const buildTree = (items, parentId = null) => {
      return items
        .filter(item => 
          (parentId === null && !item.parentId) || 
          (item.parentId && item.parentId.toString() === parentId?.toString())
        )
        .map(item => ({
          ...item,
          children: buildTree(items, item._id)
        }));
    };
    
    return buildTree(categories);
  }, [categories]);

  const findCategoryBySlug = useCallback((slug) => {
    return categories.find(category => category.slug === slug);
  }, [categories]);

  const value = useMemo(
    () => ({
      // State
      categories,
      selectedCategory,
      parentCategories,
      loading,
      error,
      isPublic,
      
      // Actions
      setIsPublic,
      setSelectedCategory,
      fetchCategories,
      fetchCategoryById,
      createNewCategory,
      updateExistingCategory,
      deleteExistingCategory,
      
      // Helpers
      getCategoryTree,
      findCategoryBySlug,
      clearCache: clearRelatedCaches
    }),
    [
      categories,
      selectedCategory,
      parentCategories,
      loading,
      error,
      isPublic,
      fetchCategories,
      fetchCategoryById,
      createNewCategory,
      updateExistingCategory,
      deleteExistingCategory,
      getCategoryTree,
      findCategoryBySlug
    ]
  );

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
};