/* eslint-disable no-unused-vars */
import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/productService';

export const ProductContext = createContext();

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const clearRelatedCaches = (productId) => {
    if (productId) {
      clearCache(`product_${productId}`);
    }
    const keysToClear = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('products_') || key?.startsWith('product_')) {
        keysToClear.push(key);
      }
    }
    keysToClear.forEach(clearCache);
  };

  useEffect(() => {
    const cleanupExpiredCache = () => {
      const now = Date.now();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const cached = key ? getCache(key) : null;
        if (cached && now - cached.timestamp > 1800000) {
          clearCache(key);
        }
      }
    };
    cleanupExpiredCache();
    const intervalId = setInterval(cleanupExpiredCache, 3600000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchProducts = useCallback(
    async (page = 1, limit = 10, categoryId = null, isFeatured = false, options = {}) => {
      const { isPublic = true, sort = '-createdAt' } = options;
      const filters = {};

      if (categoryId) filters.category = categoryId;

      const cacheKey = `products_${page}_${limit}_${categoryId || 'all'}_${isFeatured}_${sort || 'default'}`;
      const cached = getCache(cacheKey);
      if (cached && Date.now() - cached.timestamp < 1800000) {
        setProducts(cached.data.products || []);
        return cached.data;
      }

      setLoading(true);
      setError('');

      try {
        const result = await getProducts(page, limit, sort, filters);
        const filteredProducts = isFeatured
          ? (result.products || []).filter((product) => product.isFeatured)
          : result.products || [];

        const responseData = {
          products: filteredProducts,
          totalPages: result.totalPages || 1,
          total: filteredProducts.length,
        };

        setProducts(filteredProducts);
        setCache(cacheKey, responseData);

        return responseData;
      } catch (err) {
        setError(err.message || 'Failed to fetch products');
        if (cached?.data) {
          setProducts(cached.data.products || []);
          return cached.data;
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getProduct = useCallback(async (id, options = {}) => {
    const { isPublic = true } = options;
    const cacheKey = `product_${id}`;

    const cached = getCache(cacheKey);
    if (cached && Date.now() - cached.timestamp < 1800000) {
      return cached.data;
    }

    setLoading(true);
    setError('');

    try {
      const product = await getProductById(id, { isPublic });
      if (product) setCache(cacheKey, product);
      return product;
    } catch (err) {
      setError(err.message || 'Failed to fetch product');
      if (cached?.data) return cached.data;
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createNewProduct = useCallback(async (productData, images) => {
    setLoading(true);
    setError('');

    try {
      const product = await createProduct(productData, images);
      clearRelatedCaches();
      return product;
    } catch (err) {
      setError(err.message || 'Failed to create product');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateExistingProduct = useCallback(async (id, productData, images) => {
    setLoading(true);
    setError('');

    try {
      const product = await updateProduct(id, productData, images);
      clearRelatedCaches(id);
      return product;
    } catch (err) {
      setError(err.message || 'Failed to update product');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteExistingProduct = useCallback(async (id) => {
    setLoading(true);
    setError('');

    try {
      await deleteProduct(id);
      clearRelatedCaches(id);
    } catch (err) {
      setError(err.message || 'Failed to delete product');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
    products,
    loading,
    error,
    fetchProducts,
    getProduct,
    createNewProduct,
    updateExistingProduct,
    deleteExistingProduct,
  }), [
    products,
    loading,
    error,
    fetchProducts,
    getProduct,
    createNewProduct,
    updateExistingProduct,
    deleteExistingProduct,
  ]);

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};
