import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '../services/categoryService';

export const CategoryContext = createContext();

export const CategoryProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isPublic = true; // Set to true for public routes; can be overridden by parent component if needed

  const fetchCategories = useCallback(async () => {
    // Safely retrieve cached data
    let cachedData = null;
    let cachedTimestamp = null;
    const now = Date.now();
    
    try {
      const cachedStr = localStorage.getItem('categories');
      if (cachedStr) {
        cachedData = JSON.parse(cachedStr);
      }
      
      const timestampStr = localStorage.getItem('categories_timestamp');
      if (timestampStr) {
        cachedTimestamp = parseInt(timestampStr);
      }
    } catch (cacheErr) {
      console.warn('Cache read error:', cacheErr);
    }

    // Use cached data if valid and less than 1 hour old
    if (cachedData && cachedTimestamp && now - cachedTimestamp < 3600000) {
      setCategories(cachedData);
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Note: getCategories should bypass authentication if isPublic is true in categoryService
      const categoryData = await getCategories({ isPublic });
      
      // Validate data is an array
      const validCategoryData = Array.isArray(categoryData) ? categoryData : [];
      
      setCategories(validCategoryData);
      
      // Update cache safely
      try {
        localStorage.setItem('categories', JSON.stringify(validCategoryData));
        localStorage.setItem('categories_timestamp', now.toString());
      } catch (cacheErr) {
        console.warn('Cache write error:', cacheErr);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch categories');
      // Fallback to cache if available
      if (cachedData) {
        setCategories(cachedData);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const getCategory = useCallback(async (id) => {
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
    
    setLoading(true);
    setError('');
    try {
      // Note: getCategoryById should bypass authentication if isPublic is true in categoryService
      const category = await getCategoryById(id, { isPublic });
      // Cache the individual category
      try {
        if (category) {
          localStorage.setItem(`category_${id}`, JSON.stringify(category));
        }
      } catch (cacheErr) {
        console.warn('Category cache write error:', cacheErr);
      }
      return category;
    } catch (err) {
      setError(err.message || 'Failed to fetch category');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createNewCategory = useCallback(async (categoryData) => {
    setLoading(true);
    setError('');
    try {
      // Note: createCategory may still require authentication as it's typically an admin action
      const category = await createCategory(categoryData);
      // Invalidate cache safely
      try {
        localStorage.removeItem('categories');
        localStorage.removeItem('categories_timestamp');
      } catch (cacheErr) {
        console.warn('Cache invalidation error:', cacheErr);
      }
      await fetchCategories();
      return category;
    } catch (err) {
      setError(err.message || 'Failed to create category');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  const updateExistingCategory = useCallback(async (id, categoryData) => {
    setLoading(true);
    setError('');
    try {
      // Note: updateCategory may still require authentication as it's typically an admin action
      const category = await updateCategory(id, categoryData);
      // Invalidate cache safely
      try {
        localStorage.removeItem('categories');
        localStorage.removeItem('categories_timestamp');
        localStorage.removeItem(`category_${id}`);
      } catch (cacheErr) {
        console.warn('Cache invalidation error:', cacheErr);
      }
      await fetchCategories();
      return category;
    } catch (err) {
      setError(err.message || 'Failed to update category');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  const deleteExistingCategory = useCallback(async (id) => {
    setLoading(true);
    setError('');
    try {
      // Note: deleteCategory may still require authentication as it's typically an admin action
      await deleteCategory(id);
      // Invalidate cache safely
      try {
        localStorage.removeItem('categories');
        localStorage.removeItem('categories_timestamp');
        localStorage.removeItem(`category_${id}`);
      } catch (cacheErr) {
        console.warn('Cache invalidation error:', cacheErr);
      }
      await fetchCategories();
    } catch (err) {
      setError(err.message || 'Failed to delete category');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  // Clean up stale cache on mount
  useEffect(() => {
    try {
      const now = Date.now();
      const timestampStr = localStorage.getItem('categories_timestamp');
      if (timestampStr) {
        const timestamp = parseInt(timestampStr);
        if (now - timestamp > 86400000) { // 24 hours
          localStorage.removeItem('categories');
          localStorage.removeItem('categories_timestamp');
          
          // Also clear individual category caches
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('category_')) {
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Cache cleanup error:', err);
    }
  }, []);

  const value = useMemo(() => ({
    categories,
    loading,
    error,
    isPublic,
    fetchCategories,
    getCategory,
    createNewCategory,
    updateExistingCategory,
    deleteExistingCategory
  }), [
    categories,
    loading,
    error,
    isPublic,
    fetchCategories,
    getCategory,
    createNewCategory,
    updateExistingCategory,
    deleteExistingCategory
  ]);

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
};