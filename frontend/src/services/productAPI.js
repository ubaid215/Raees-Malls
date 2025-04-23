import axios from "axios";

// Configure environment-based API endpoints
const API_BASE = 'http://localhost:5000/api'

const PRODUCTS_API = `${API_BASE}/products`;
const CATEGORIES_API = `${API_BASE}/categories`;

// Configure axios instance with CORS support
const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true, // For session/cookie auth
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRF-Token'
});

// Enhanced cache system with localStorage fallback
const cache = {
  get: (key) => {
    const memoryCache = sessionStorage.getItem(key);
    if (memoryCache) {
      try {
        return JSON.parse(memoryCache);
      } catch {
        sessionStorage.removeItem(key);
      }
    }
    return null;
  },
  set: (key, data, ttl = 60000) => {
    const item = {
      data,
      expiry: Date.now() + ttl
    };
    sessionStorage.setItem(key, JSON.stringify(item));
  },
  clear: (pattern) => {
    if (pattern) {
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes(pattern)) {
          sessionStorage.removeItem(key);
        }
      });
    } else {
      sessionStorage.clear();
    }
  }
};

// Error handler with retry logic
const handleError = async (error, context = '', retries = 3) => {
  const { config, response } = error;
  
  // Log error details
  console.error(`API Error [${context}]:`, {
    status: response?.status,
    message: error.message,
    url: config?.url,
    method: config?.method
  });

  // Retry for timeout or network errors
  if (retries > 0 && (
    error.code === 'ECONNABORTED' || 
    !response || 
    response.status >= 500
  )) {
    console.log(`Retrying ${context}... (${retries} left)`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return api.request({
      ...config,
      headers: {
        ...config.headers,
        'X-Retry-Attempt': retries
      }
    });
  }

  // Format error message
  const message = response?.data?.error ||
    error.message ||
    `Request failed${context ? ` during ${context}` : ''}`;

  throw new Error(message, {
    cause: {
      status: response?.status,
      data: response?.data,
      isNetworkError: !response
    }
  });
};

// PRODUCTS SERVICE
export const productService = {
  async getProducts({
    page = 1,
    limit = 10,
    search = '',
    isFeatured,
    category,
    minPrice,
    maxPrice,
    sort = '-createdAt'
  }) {
    const cacheKey = `products:${JSON.stringify(arguments[0])}`;
    
    try {
      // Check cache first
      const cached = cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }

      const response = await api.get(PRODUCTS_API, {
        params: {
          page,
          limit,
          search,
          isFeatured,
          category,
          minPrice,
          maxPrice,
          sort
        },
        retry: 2 // Enable auto-retry
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Invalid response format');
      }

      // Cache successful response
      cache.set(cacheKey, response.data);
      return response.data;

    } catch (error) {
      return handleError(error, 'fetching products');
    }
  },

  async getProduct(identifier) {
    const cacheKey = `product:${identifier}`;
    
    try {
      const cached = cache.get(cacheKey);
      if (cached) return cached.data;

      const response = await api.get(`${PRODUCTS_API}/${identifier}`, {
        retry: 2
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Product not found');
      }

      cache.set(cacheKey, response.data.data);
      return response.data.data;

    } catch (error) {
      return handleError(error, `fetching product ${identifier}`);
    }
  },

  async createProduct(productData) {
    try {
      const formData = new FormData();

      // Helper function to safely append fields
      const appendField = (key, value) => {
        if (value != null) {
          formData.append(key, typeof value === 'object' 
            ? JSON.stringify(value) 
            : value
          );
        }
      };

      // Required fields
      appendField('title', productData.title);
      appendField('price', productData.price);
      appendField('categories', productData.categories);

      // Optional fields
      appendField('description', productData.description);
      appendField('stock', productData.stock);
      appendField('isFeatured', productData.isFeatured);
      appendField('originalPrice', productData.originalPrice);
      appendField('shortDescription', productData.shortDescription);
      appendField('variants', productData.variants);

      // SEO fields
      if (productData.seo) {
        appendField('seoTitle', productData.seo.title);
        appendField('seoDescription', productData.seo.description);
      }

      // Handle image uploads
      productData.images?.forEach((image, index) => {
        if (image instanceof File) {
          formData.append('images', image);
        } else if (typeof image === 'string') {
          formData.append(`existingImages[${index}]`, image);
        }
      });

      const response = await api.post(PRODUCTS_API, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // Longer timeout for uploads
      });

      // Clear relevant caches
      cache.clear('products:');
      cache.clear('categories:');

      return response.data;

    } catch (error) {
      return handleError(error, 'creating product');
    }
  },

  async updateProduct(id, updates) {
    try {
      const formData = new FormData();

      Object.entries(updates).forEach(([key, value]) => {
        if (value != null) {
          if (key === 'images') {
            value.forEach(img => formData.append('images', img));
          } else {
            formData.append(key, typeof value === 'object' 
              ? JSON.stringify(value) 
              : value
            );
          }
        }
      });

      const response = await api.put(`${PRODUCTS_API}/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000
      });

      // Clear affected caches
      cache.clear('products:');
      cache.clear(`product:${id}`);
      
      return response.data;

    } catch (error) {
      return handleError(error, `updating product ${id}`);
    }
  },

  async deleteProduct(id) {
    try {
      const response = await api.delete(`${PRODUCTS_API}/${id}`);

      // Clear all related caches
      cache.clear('products:');
      cache.clear(`product:${id}`);

      return response.data;

    } catch (error) {
      return handleError(error, `deleting product ${id}`);
    }
  }
};

// CATEGORIES SERVICE
export const categoryService = {
  async getAllCategories() {
    const cacheKey = 'categories:all';
    
    try {
      const cached = cache.get(cacheKey);
      if (cached) return cached.data;

      const response = await api.get(CATEGORIES_API, {
        retry: 2
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to load categories');
      }

      cache.set(cacheKey, response.data.data);
      return response.data.data;

    } catch (error) {
      return handleError(error, 'fetching categories');
    }
  },

  async getCategory(identifier) {
    const cacheKey = `category:${identifier}`;
    
    try {
      const cached = cache.get(cacheKey);
      if (cached) return cached.data;

      const response = await api.get(`${CATEGORIES_API}/${identifier}`, {
        retry: 2
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Category not found');
      }

      cache.set(cacheKey, response.data.data);
      return response.data.data;

    } catch (error) {
      return handleError(error, `fetching category ${identifier}`);
    }
  },

  async getCategoryProducts(slug, query = {}) {
    const cacheKey = `category:${slug}:products:${JSON.stringify(query)}`;
    
    try {
      const cached = cache.get(cacheKey);
      if (cached) return cached.data;

      const response = await api.get(`${CATEGORIES_API}/${slug}/products`, {
        params: query,
        retry: 2
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'No products found');
      }

      cache.set(cacheKey, response.data);
      return response.data;

    } catch (error) {
      return handleError(error, `fetching products for category ${slug}`);
    }
  }
};

// SEO SERVICE
export const seoService = {
  async getProductSeo(identifier) {
    const cacheKey = `seo:product:${identifier}`;
    
    try {
      const cached = cache.get(cacheKey);
      if (cached) return cached.data;

      const response = await api.get(`${PRODUCTS_API}/${identifier}/seo`, {
        retry: 2
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'SEO data not found');
      }

      cache.set(cacheKey, response.data.data);
      return response.data.data;

    } catch (error) {
      return handleError(error, `fetching SEO for product ${identifier}`);
    }
  }
};

// CORS TEST ENDPOINT
export const testConnection = async () => {
  try {
    const response = await api.get('/test-cors', {
      timeout: 5000,
      retry: 1
    });
    return response.data;
  } catch (error) {
    return handleError(error, 'testing server connection');
  }
};