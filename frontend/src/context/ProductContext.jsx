import React, { createContext, useState, useCallback, useMemo, useEffect, useContext } from 'react';
import {
  getProducts,
  getFeaturedProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
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
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
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

  const clearRelatedCaches = useCallback((productId) => {
    if (productId) {
      clearCache(`product_${productId}`);
    }
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('products_') || key.startsWith('featured_products_')) {
        clearCache(key);
      }
    });
  }, [clearCache]);

  useEffect(() => {
    const cleanupExpiredCache = () => {
      const now = Date.now();
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('product_') || key.startsWith('products_') || key.startsWith('featured_products_')) {
          const cached = getCache(key);
          if (cached && now - cached.timestamp > 30 * 60 * 1000) {
            clearCache(key);
          }
        }
      });
    };

    cleanupExpiredCache();
    const intervalId = setInterval(cleanupExpiredCache, 60 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [getCache, clearCache]);

  useEffect(() => {
    SocketService.connect();

    const handleProductCreated = (data) => {
      const product = data.product || {};
      const normalizedProduct = {
        ...product,
        price: Number.isFinite(parseFloat(product.price)) ? parseFloat(product.price) : null,
        discountPrice: product.discountPrice
          ? Number.isFinite(parseFloat(product.discountPrice))
            ? parseFloat(product.discountPrice)
            : null
          : null,
        stock: Number.isFinite(parseInt(product.stock)) ? parseInt(product.stock) : 0,
        displayPrice: product.discountPrice
          ? Number.isFinite(parseFloat(product.discountPrice))
            ? parseFloat(product.discountPrice)
            : parseFloat(product.price) || 0
          : parseFloat(product.price) || 0,
        color: product.color && typeof product.color === 'object'
          ? { name: product.color.name || '' }
          : { name: '' },
        variants: product.variants?.map(variant => ({
          ...variant,
          storageOptions: Array.isArray(variant.storageOptions) ? variant.storageOptions : [],
          sizeOptions: Array.isArray(variant.sizeOptions) ? variant.sizeOptions : [],
          images: Array.isArray(variant.images) ? variant.images : [],
          videos: Array.isArray(variant.videos) ? variant.videos : [],
        })) || [],
        specifications: Array.isArray(product.specifications) ? product.specifications : [],
        features: Array.isArray(product.features) ? product.features : [],
        images: Array.isArray(product.images) ? product.images : [],
        videos: Array.isArray(product.videos) ? product.videos : [],
      };

      if (!normalizedProduct.isFeatured) {
        setProducts(prev => [...prev, normalizedProduct]);
      }
      clearRelatedCaches();
    };

    const handleProductUpdated = (data) => {
      const product = data.product || {};
      const normalizedProduct = {
        ...product,
        price: Number.isFinite(parseFloat(product.price)) ? parseFloat(product.price) : null,
        discountPrice: product.discountPrice
          ? Number.isFinite(parseFloat(product.discountPrice))
            ? parseFloat(product.discountPrice)
            : null
          : null,
        stock: Number.isFinite(parseInt(product.stock)) ? parseInt(product.stock) : 0,
        displayPrice: product.discountPrice
          ? Number.isFinite(parseFloat(product.discountPrice))
            ? parseFloat(product.discountPrice)
            : parseFloat(product.price) || 0
          : parseFloat(product.price) || 0,
        color: product.color && typeof product.color === 'object'
          ? { name: product.color.name || '' }
          : { name: '' },
        variants: product.variants?.map(variant => ({
          ...variant,
          storageOptions: Array.isArray(variant.storageOptions) ? variant.storageOptions : [],
          sizeOptions: Array.isArray(variant.sizeOptions) ? variant.sizeOptions : [],
          images: Array.isArray(variant.images) ? variant.images : [],
          videos: Array.isArray(variant.videos) ? variant.videos : [],
        })) || [],
        specifications: Array.isArray(product.specifications) ? product.specifications : [],
        features: Array.isArray(product.features) ? product.features : [],
        images: Array.isArray(product.images) ? product.images : [],
        videos: Array.isArray(product.videos) ? product.videos : [],
      };

      if (!normalizedProduct.isFeatured) {
        setProducts(prev => prev.map(p => 
          p._id === normalizedProduct._id ? normalizedProduct : p
        ));
      }
      clearRelatedCaches(normalizedProduct._id);
    };

    const handleProductDeleted = (data) => {
      setProducts(prev => prev.filter(p => p._id !== data.productId));
      clearRelatedCaches(data.productId);
    };

    SocketService.on('productCreated', handleProductCreated);
    SocketService.on('productUpdated', handleProductUpdated);
    SocketService.on('productDeleted', handleProductDeleted);

    return () => {
      SocketService.off('productCreated', handleProductCreated);
      SocketService.off('productUpdated', handleProductUpdated);
      SocketService.off('productDeleted', handleProductDeleted);
      SocketService.disconnect();
    };
  }, [clearRelatedCaches]);

  const withRetry = useCallback(async (fn, retries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt === retries) throw err;
        const waitTime = delay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }, []);

  const fetchProducts = useCallback(
    debounce(async (params = {}, options = {}) => {
      const {
        page = 1,
        limit = 10,
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

      if (!skipCache) {
        const cached = getCache(cacheKey);
        if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
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
          getProducts(page, limit, sort, filters, { isPublic })
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
        setError(err.message || 'Failed to fetch products');
        const cached = getCache(cacheKey);
        if (cached?.data) {
          setProducts(cached.data.products || []);
          return cached.data;
        }
        throw err;
      } finally {
        setLoading(false);
      }
    }, 500),
    [getCache, setCache, withRetry]
  );

  const fetchFeaturedProducts = useCallback(
    debounce(async (params = {}, options = {}) => {
      const {
        page = 1,
        limit = 10,
        sort = '-createdAt',
        color = null,
      } = params;

      const { skipCache = false } = options;
      const cacheKey = `featured_products_${page}_${limit}_${sort}_${color || ''}`;

      if (!skipCache) {
        const cached = getCache(cacheKey);
        if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
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
    }, 500),
    [getCache, setCache, withRetry]
  );

  const getProduct = useCallback(async (id, options = {}) => {
    const { isPublic = true, skipCache = false } = options;
    const cacheKey = `product_${id}`;

    if (!skipCache) {
      const cached = getCache(cacheKey);
      if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
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

  const value = useMemo(() => ({
    products,
    loading,
    error,
    pagination,
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