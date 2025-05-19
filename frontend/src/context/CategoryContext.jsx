/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'react-toastify';
import SocketService from '../services/socketService';
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
  const getCache = useCallback((key) => {
    try {
      const cached = localStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch (err) {
      console.warn('Cache read error:', err);
      return null;
    }
  }, []);

  const setCache = useCallback((key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (err) {
      console.warn('Cache write error:', err);
    }
  }, []);

  const clearCache = useCallback((key) => {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.warn('Cache clear error:', err);
    }
  }, []);

  const clearRelatedCaches = useCallback((categoryId) => {
    const clearedKeys = [];
    if (categoryId) {
      clearCache(`category_${categoryId}`);
      clearedKeys.push(`category_${categoryId}`);
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('categories_') || key?.startsWith('category_')) {
        clearCache(key);
        clearedKeys.push(key);
      }
    }
    console.log('Cleared cache keys:', clearedKeys);
  }, [clearCache]);

  // Fetch categories
  const fetchCategories = useCallback(async ({ sort = 'name', page = 1, limit = 50, forcePublic = isPublic } = {}) => {
    setLoading(true);
    setError('');
    const cacheKey = `categories_${forcePublic ? 'public' : 'all'}_${page}_${limit}_${sort}`;
    // Bypass cache for testing
    // const cached = getCache(cacheKey);
    // if (cached && Date.now() - cached.timestamp < 300000) {
    //   setCategories(cached.data || []);
    //   setParentCategories((cached.data || []).filter((cat) => !cat.parentId));
    //   setLoading(false);
    //   console.log('Fetched from cache:', cacheKey, cached.data);
    //   return cached.data;
    // }
    try {
      // console.log('Fetching categories from API:', { sort, page, limit, forcePublic });
      const data = await getCategories({ sort, page, limit, isPublic: forcePublic });
      // console.log('Fetched categories:', data);
      setCategories(data || []);
      setParentCategories((data || []).filter((cat) => !cat.parentId));
      setCache(cacheKey, data || []);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch categories');
      console.error('Fetch categories error:', err);
      setLoading(false);
      throw err;
    }
  }, [getCache, setCache, isPublic]);

  // Socket.IO event listeners
  useEffect(() => {
    console.log('Setting up Socket.IO listeners');
    const handleCategoryCreated = ({ category }) => {
      // console.log('Received categoryCreated:', category);
      setCategories((prev) => {
        if (prev.some((cat) => cat._id === category._id)) {
          console.log('Category already exists:', category._id);
          return prev;
        }
        const updatedCategories = [...prev, category];
        console.log('Updated categories:', updatedCategories.map(c => c._id));
        setParentCategories(updatedCategories.filter((cat) => !cat.parentId));
        clearRelatedCaches();
        toast.success(`New category added: ${category.name}`);
        return updatedCategories;
      });
    };

    const handleCategoryUpdated = ({ category }) => {
      console.log('Received categoryUpdated:', category);
      setCategories((prev) => {
        const updatedCategories = prev.map((cat) =>
          cat._id === category._id ? { ...cat, ...category } : cat
        );
        console.log('Updated categories:', updatedCategories.map(c => c._id));
        setParentCategories(updatedCategories.filter((cat) => !cat.parentId));
        clearRelatedCaches(category._id);
        toast.info(`Category updated: ${category.name}`);
        return updatedCategories;
      });
      setSelectedCategory((prev) =>
        prev && prev._id === category._id ? { ...prev, ...category } : prev
      );
    };

    const handleCategoryDeleted = ({ categoryIds }) => {
      console.log('Received categoryDeleted:', categoryIds);
      setCategories((prev) => {
        const updatedCategories = prev.filter(
          (cat) => !categoryIds.includes(cat._id.toString())
        );
        console.log('Before deletion:', prev.map(c => c._id));
        console.log('After deletion:', updatedCategories.map(c => c._id));
        setParentCategories(updatedCategories.filter((cat) => !cat.parentId));
        clearRelatedCaches();
        toast.info('Category deleted');
        return updatedCategories;
      });
      setSelectedCategory((prev) =>
        prev && categoryIds.includes(prev._id.toString()) ? null : prev
      );
    };

    SocketService.on('categoryCreated', handleCategoryCreated);
    SocketService.on('categoryUpdated', handleCategoryUpdated);
    SocketService.on('categoryDeleted', handleCategoryDeleted);

    return () => {
      console.log('Cleaning up Socket.IO listeners');
      SocketService.off('categoryCreated', handleCategoryCreated);
      SocketService.off('categoryUpdated', handleCategoryUpdated);
      SocketService.off('categoryDeleted', handleCategoryDeleted);
    };
  }, [clearRelatedCaches]);

  // Fetch categories on mount
  useEffect(() => {
    console.log('Fetching initial categories');
    fetchCategories({ forcePublic: isPublicDefault });
  }, [fetchCategories, isPublicDefault]);

  // Log categories changes for debugging
  useEffect(() => {
    console.log('Categories state updated:', categories.map(c => ({ _id: c._id, name: c.name })));
  }, [categories]);

  // Other context functions
  const fetchCategoryById = useCallback(async (id) => {
    setLoading(true);
    setError('');
    const cacheKey = `category_${id}`;
    const cached = getCache(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      setSelectedCategory(cached.data || null);
      setLoading(false);
      console.log('Fetched category from cache:', cacheKey, cached.data);
      return cached.data;
    }
    try {
      console.log('Fetching category by ID:', id);
      const data = await getCategoryById(id);
      setSelectedCategory(data || null);
      setCache(cacheKey, data || null);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch category');
      console.error('Fetch category error:', err);
      setLoading(false);
      throw err;
    }
  }, [getCache, setCache]);

  const createNewCategory = useCallback(async (categoryData) => {
    setLoading(true);
    setError('');
    try {
      console.log('Creating category:', categoryData);
      const data = await createCategory(categoryData);
      clearRelatedCaches();
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to create category');
      console.error('Create category error:', err);
      setLoading(false);
      throw err;
    }
  }, [clearRelatedCaches]);

  const updateExistingCategory = useCallback(async (id, categoryData) => {
    setLoading(true);
    setError('');
    try {
      console.log('Updating category:', id, categoryData);
      const data = await updateCategory(id, categoryData);
      clearRelatedCaches(id);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to update category');
      console.error('Update category error:', err);
      setLoading(false);
      throw err;
    }
  }, [clearRelatedCaches]);

  const deleteExistingCategory = useCallback(async (id) => {
    setLoading(true);
    setError('');
    try {
      console.log('Deleting category:', id);
      await deleteCategory(id);
      clearRelatedCaches(id);
      setSelectedCategory(null);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to delete category');
      console.error('Delete category error:', err);
      setLoading(false);
      throw err;
    }
  }, [clearRelatedCaches]);

  const setCategoryPublic = useCallback((value) => {
    setIsPublic(value);
  }, []);

  const contextValue = useMemo(
    () => ({
      categories,
      parentCategories,
      selectedCategory,
      loading,
      error,
      isPublic,
      fetchCategories,
      fetchCategoryById,
      createNewCategory,
      updateExistingCategory,
      deleteExistingCategory,
      setCategoryPublic,
    }),
    [
      categories,
      parentCategories,
      selectedCategory,
      loading,
      error,
      isPublic,
      fetchCategories,
      fetchCategoryById,
      createNewCategory,
      updateExistingCategory,
      deleteExistingCategory,
      setCategoryPublic,
    ]
  );

  return (
    <CategoryContext.Provider value={contextValue}>
      {children}
    </CategoryContext.Provider>
  );
};

export default CategoryProvider;