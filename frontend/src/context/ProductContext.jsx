import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../services/productService';

export const ProductContext = createContext();

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();

  const fetchProducts = useCallback(async (page = 1, limit = 10, categoryId = null, isFeatured = false) => {
    const cacheKey = `products_${page}_${limit}_${categoryId || 'all'}_${isFeatured}`;
    const now = Date.now();
    
    // Safely get cached data with error handling
    let cachedData = null;
    let cachedTimestamp = null;
    
    try {
      const cachedDataStr = localStorage.getItem(cacheKey);
      if (cachedDataStr) {
        cachedData = JSON.parse(cachedDataStr);
      }
      
      const cachedTimestampStr = localStorage.getItem(`${cacheKey}_timestamp`);
      if (cachedTimestampStr) {
        cachedTimestamp = parseInt(cachedTimestampStr);
      }
    } catch (cacheErr) {
      console.warn('Cache read error:', cacheErr);
      // Continue with fetch if cache read fails
    }

    // Use cached data if less than 30 minutes old and valid
    if (cachedData && cachedTimestamp && now - cachedTimestamp < 1800000) {
      setProducts(cachedData);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const productData = await getProducts(page, limit, categoryId);
      
      // Ensure we have an array of products
      const validProductData = Array.isArray(productData) ? productData : [];
      
      const filteredProducts = isFeatured
        ? validProductData.filter((product) => product.isFeatured === true)
        : validProductData;
      
      setProducts(filteredProducts);
      
      // Update cache safely
      try {
        localStorage.setItem(cacheKey, JSON.stringify(filteredProducts));
        localStorage.setItem(`${cacheKey}_timestamp`, now.toString());
      } catch (cacheErr) {
        console.warn('Cache write error:', cacheErr);
        // Continue even if cache write fails
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch products');
      // Fallback to cache if available
      if (cachedData) {
        setProducts(cachedData);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getProduct = useCallback(async (id) => {
    const cacheKey = `product_${id}`;
    let cachedData = null;
    
    try {
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        cachedData = JSON.parse(cachedStr);
      }
    } catch (cacheErr) {
      console.warn('Cache read error:', cacheErr);
    }
    
    if (cachedData) {
      return cachedData;
    }

    setLoading(true);
    setError('');
    try {
      const product = await getProductById(id);
      if (product) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(product));
        } catch (cacheErr) {
          console.warn('Cache write error:', cacheErr);
        }
      }
      return product;
    } catch (err) {
      setError(err.message || 'Failed to fetch product');
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
      // Clear relevant caches safely
      try {
        localStorage.removeItem('products_1_10_all_false');
        localStorage.removeItem('products_1_10_all_true');
      } catch (cacheErr) {
        console.warn('Cache clear error:', cacheErr);
      }
      await fetchProducts();
      return product;
    } catch (err) {
      setError(err.message || 'Failed to create product');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchProducts]);

  const updateExistingProduct = useCallback(async (id, productData, images) => {
    setLoading(true);
    setError('');
    try {
      const product = await updateProduct(id, productData, images);
      // Clear caches safely
      try {
        localStorage.removeItem(`product_${id}`);
        localStorage.removeItem('products_1_10_all_false');
        localStorage.removeItem('products_1_10_all_true');
      } catch (cacheErr) {
        console.warn('Cache clear error:', cacheErr);
      }
      await fetchProducts();
      return product;
    } catch (err) {
      setError(err.message || 'Failed to update product');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchProducts]);

  const deleteExistingProduct = useCallback(async (id) => {
    setLoading(true);
    setError('');
    try {
      await deleteProduct(id);
      // Clear caches safely
      try {
        localStorage.removeItem(`product_${id}`);
        localStorage.removeItem('products_1_10_all_false');
        localStorage.removeItem('products_1_10_all_true');
      } catch (cacheErr) {
        console.warn('Cache clear error:', cacheErr);
      }
      await fetchProducts();
    } catch (err) {
      setError(err.message || 'Failed to delete product');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchProducts]);

  // Fetch products for relevant routes
  useEffect(() => {
    const validPaths = ['/', '/products', '/category'];
    const isValidRoute = validPaths.some((path) =>
      location.pathname.startsWith(path)
    );
    if (isValidRoute) {
      fetchProducts(1, 12, null, false);
    }
  }, [location.pathname, fetchProducts]);

  // Clear stale cache on mount
  useEffect(() => {
    try {
      const now = Date.now();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.endsWith('_timestamp')) {
          const timestamp = parseInt(localStorage.getItem(key));
          if (now - timestamp > 3600000) { // Clear if older than 1 hour
            const cacheKey = key.replace('_timestamp', '');
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(key);
          }
        }
      }
    } catch (err) {
      console.warn('Cache cleanup error:', err);
    }
  }, []);

  const value = useMemo(
    () => ({
      products,
      loading,
      error,
      fetchProducts,
      getProduct,
      createNewProduct,
      updateExistingProduct,
      deleteExistingProduct,
    }),
    [products, loading, error, fetchProducts, getProduct, createNewProduct, updateExistingProduct, deleteExistingProduct]
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
};