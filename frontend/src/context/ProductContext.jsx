import React, { createContext, useState, useCallback, useMemo, useEffect, useContext } from 'react';
import {
  getProducts,
  getFeaturedProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  normalizeProduct,
} from '../services/productService';
import SocketService from '../services/socketService';
import { debounce } from 'lodash';

export const ProductContext = createContext();

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalItems: 0,
  });
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  // Cache management functions
  const getCache = useCallback((key) => {
    try {
      const cached = sessionStorage.getItem(key); // Use sessionStorage for better performance
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      const isExpired = Date.now() - parsed.timestamp > 15 * 60 * 1000; // 15 minutes
      
      if (isExpired) {
        sessionStorage.removeItem(key);
        return null;
      }
      
      return parsed;
    } catch (err) {
      console.warn('Cache read error:', err);
      return null;
    }
  }, []);

  const setCache = useCallback((key, data) => {
    try {
      sessionStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (err) {
      console.warn('Cache write error:', err);
    }
  }, []);

  const clearCache = useCallback((key) => {
    try {
      sessionStorage.removeItem(key);
    } catch (err) {
      console.warn('Cache clear error:', err);
    }
  }, []);

  const clearRelatedCaches = useCallback((productId) => {
    if (productId) {
      clearCache(`product_${productId}`);
    }
    // Clear all product-related caches
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('products_') || key.startsWith('featured_products_')) {
        clearCache(key);
      }
    });
  }, [clearCache]);

  // Cache cleanup effect
  useEffect(() => {
    const cleanupExpiredCache = () => {
      const now = Date.now();
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('product_') || key.startsWith('products_') || key.startsWith('featured_products_')) {
          try {
            const cached = JSON.parse(sessionStorage.getItem(key));
            if (cached && now - cached.timestamp > 15 * 60 * 1000) {
              sessionStorage.removeItem(key);
            }
          } catch (err) {
            sessionStorage.removeItem(key); // Remove corrupted cache entries
          }
        }
      });
    };

    cleanupExpiredCache();
    const intervalId = setInterval(cleanupExpiredCache, 5 * 60 * 1000); // Cleanup every 5 minutes
    return () => clearInterval(intervalId);
  }, []);

  // Socket setup with improved error handling
  useEffect(() => {
    let mounted = true;
    
    const setupSocket = async () => {
      try {
        await SocketService.connect();
      } catch (err) {
        console.warn('Socket connection failed:', err);
        // Continue without socket - don't break the app
      }
    };

    const handleProductCreated = (data) => {
      if (!mounted) return;
      
      const product = data.product || {};
      const normalizedProduct = normalizeProduct(product);
      
      setProducts(prev => {
        const exists = prev.some(p => p._id === normalizedProduct._id);
        if (exists) return prev;
        return [normalizedProduct, ...prev]; // Add to beginning for latest first
      });
      
      clearRelatedCaches();
    };

    const handleProductUpdated = (data) => {
      if (!mounted) return;
      
      const product = data.product || {};
      const normalizedProduct = normalizeProduct(product);
      
      setProducts(prev => {
        const exists = prev.some(p => p._id === normalizedProduct._id);
        if (exists) {
          return prev.map(p => 
            p._id === normalizedProduct._id ? normalizedProduct : p
          );
        }
        return [normalizedProduct, ...prev];
      });
      
      clearRelatedCaches(normalizedProduct._id);
    };

    const handleProductDeleted = (data) => {
      if (!mounted) return;
      
      setProducts(prev => prev.filter(p => p._id !== data.productId));
      clearRelatedCaches(data.productId);
    };

    setupSocket();
    
    SocketService.on('productCreated', handleProductCreated);
    SocketService.on('productUpdated', handleProductUpdated);
    SocketService.on('productDeleted', handleProductDeleted);

    return () => {
      mounted = false;
      SocketService.off('productCreated', handleProductCreated);
      SocketService.off('productUpdated', handleProductUpdated);
      SocketService.off('productDeleted', handleProductDeleted);
    };
  }, [clearRelatedCaches]);

  const withRetry = useCallback(async (fn, retries = 2, delay = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt === retries) throw err;
        const waitTime = delay * attempt; // Linear backoff for faster retry
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }, []);

  // Improved fetchProducts with better error handling and caching
  const fetchProducts = useCallback(async (params = {}, options = {}) => {
    const {
      page = 1,
      limit = 20, // Increased default limit for better initial load
      categoryId = null,
      search = null,
      minPrice = null,
      maxPrice = null,
      sort = '-createdAt',
      isFeatured = null,
      color = null,
    } = params;

    const { isPublic = true, skipCache = false } = options;

    const cacheKey = `products_${page}_${limit}_${categoryId || 'all'}_${search || ''}_${minPrice || ''}_${maxPrice || ''}_${sort}_${isFeatured || ''}_${color || ''}`;

    // Check cache first (unless skipping)
    if (!skipCache) {
      const cached = getCache(cacheKey);
      if (cached?.data) {
        // Update state with cached data
        setProducts(cached.data.products || []);
        setPagination({
          page,
          limit,
          totalPages: cached.data.totalPages || 1,
          totalItems: cached.data.totalItems || 0,
        });
        return cached.data;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const filters = {};
      if (categoryId) filters.categoryId = categoryId;
      if (search) filters.search = search;
      if (minPrice) filters.minPrice = minPrice;
      if (maxPrice) filters.maxPrice = maxPrice;
      if (isFeatured !== null) filters.isFeatured = isFeatured;
      if (color) filters.color = color;

      const result = await withRetry(() =>
        getProducts(page, limit, sort, filters, { isPublic, includeOutOfStock: false })
      );

      const responseData = {
        products: result.products || [],
        totalPages: result.totalPages || 1,
        totalItems: result.totalItems || 0,
      };

      // Update state
      setProducts(responseData.products);
      setPagination({
        page,
        limit,
        totalPages: responseData.totalPages,
        totalItems: responseData.totalItems,
      });

      // Cache the response
      setCache(cacheKey, responseData);
      
      if (!hasInitialLoad) {
        setHasInitialLoad(true);
      }

      return responseData;
    } catch (err) {
      console.error('fetchProducts: Error:', err);
      setError(err.message || 'Failed to fetch products');
      
      // Try to fallback to cached data
      const cached = getCache(cacheKey);
      if (cached?.data) {
        setProducts(cached.data.products || []);
        setPagination({
          page,
          limit,
          totalPages: cached.data.totalPages || 1,
          totalItems: cached.data.totalItems || 0,
        });
        return cached.data;
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getCache, setCache, withRetry, hasInitialLoad]);

  // Improved fetchFeaturedProducts
  const fetchFeaturedProducts = useCallback(async (params = {}, options = {}) => {
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt',
      color = null,
    } = params;

    const { skipCache = false } = options;
    const cacheKey = `featured_products_${page}_${limit}_${sort}_${color || ''}`;

    if (!skipCache) {
      const cached = getCache(cacheKey);
      if (cached?.data) {
        setProducts(cached.data.products || []);
        setPagination({
          page,
          limit,
          totalPages: cached.data.totalPages || 1,
          totalItems: cached.data.totalItems || 0,
        });
        return cached.data;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const filters = {};
      if (color) filters.color = color;

      const result = await withRetry(() =>
        getFeaturedProducts(page, limit, sort, filters)
      );

      const responseData = {
        products: result.products || [],
        totalPages: result.totalPages || 1,
        totalItems: result.totalItems || 0,
      };

      setProducts(responseData.products);
      setPagination({
        page,
        limit,
        totalPages: responseData.totalPages,
        totalItems: responseData.totalItems,
      });
      
      setCache(cacheKey, responseData);

      return responseData;
    } catch (err) {
      console.error('fetchFeaturedProducts: Error:', err);
      setError(err.message || 'Failed to fetch featured products');
      
      const cached = getCache(cacheKey);
      if (cached?.data) {
        setProducts(cached.data.products || []);
        return cached.data;
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getCache, setCache, withRetry]);

  const getProduct = useCallback(async (id, options = {}) => {
    const { isPublic = true, skipCache = false } = options;
    const cacheKey = `product_${id}`;

    if (!skipCache) {
      const cached = getCache(cacheKey);
      if (cached?.data) {
        return cached.data;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const product = await withRetry(() => getProductById(id, { isPublic }));
      if (product) {
        setCache(cacheKey, product);
        return product;
      }

      throw new Error('Product not found');
    } catch (err) {
      setError(err.message || 'Failed to fetch product');
      const cached = getCache(cacheKey);
      if (cached?.data) return cached.data;
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getCache, setCache, withRetry]);

  const createNewProduct = useCallback(async (productData, images) => {
    setLoading(true);
    setError(null);

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
  }, [clearRelatedCaches]);

  const updateExistingProduct = useCallback(async (id, productData, images) => {
    setLoading(true);
    setError(null);

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
  }, [clearRelatedCaches]);

  const deleteExistingProduct = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      await deleteProduct(id);
      clearRelatedCaches(id);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to delete product');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [clearRelatedCaches]);

  // Initial load effect - fetch some products on app start for better UX
  useEffect(() => {
    let mounted = true;

    const initialLoad = async () => {
      if (hasInitialLoad || products.length > 0) return;

      try {
        // Fetch a mix of products for homepage
        await fetchProducts({ 
          page: 1, 
          limit: 50, 
          sort: '-createdAt' 
        }, { 
          isPublic: true 
        });
      } catch (err) {
        console.warn('Initial product load failed:', err);
        // Don't set error state for initial load failure
      }
    };

    if (mounted) {
      initialLoad();
    }

    return () => {
      mounted = false;
    };
  }, [fetchProducts, hasInitialLoad, products.length]);

  const value = useMemo(() => ({
    products,
    loading,
    error,
    pagination,
    hasInitialLoad,
    fetchProducts,
    fetchFeaturedProducts,
    getProduct,
    createNewProduct,
    updateExistingProduct,
    deleteExistingProduct,
    clearError: () => setError(null),
  }), [
    products,
    loading,
    error,
    pagination,
    hasInitialLoad,
    fetchProducts,
    fetchFeaturedProducts,
    getProduct,
    createNewProduct,
    updateExistingProduct,
    deleteExistingProduct,
  ]);

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
};

export const useProduct = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProduct must be used within a ProductProvider');
  }
  return context;
};