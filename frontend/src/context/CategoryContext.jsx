import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '../services/categoryService';

export const CategoryContext = createContext();

export const CategoryProvider = ({ children, isPublic = true }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCategories = useCallback(async () => {
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

    if (cachedData && cachedTimestamp && now - cachedTimestamp < 3600000) {
      setCategories(cachedData);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const categoryData = await getCategories({ isPublic });
      const validCategoryData = Array.isArray(categoryData) ? categoryData : [];
      setCategories(validCategoryData);
      
      try {
        localStorage.setItem('categories', JSON.stringify(validCategoryData));
        localStorage.setItem('categories_timestamp', now.toString());
      } catch (cacheErr) {
        console.warn('Cache write error:', cacheErr);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch categories');
      if (cachedData) {
        setCategories(cachedData);
      }
    } finally {
      setLoading(false);
    }
  }, [isPublic]);

  const getCategory = useCallback(async (id) => {
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
      const category = await getCategoryById(id, { isPublic });
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
  }, [isPublic]);

  const createNewCategory = useCallback(async (categoryData) => {
    setLoading(true);
    setError('');
    try {
      const category = await createCategory(categoryData);
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
      const category = await updateCategory(id, categoryData);
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
      await deleteCategory(id);
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

  useEffect(() => {
    try {
      const now = Date.now();
      const timestampStr = localStorage.getItem('categories_timestamp');
      if (timestampStr) {
        const timestamp = parseInt(timestampStr);
        if (now - timestamp > 86400000) {
          localStorage.removeItem('categories');
          localStorage.removeItem('categories_timestamp');
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