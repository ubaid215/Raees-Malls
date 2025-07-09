import api from './api';

// Helper to get first available image from variants
const getFirstVariantImage = (product) => {
  if (!product?.variants) return null;
  
  for (const variant of product.variants) {
    if (variant.images?.length > 0) {
      return variant.images[0];
    }
  }
  return null;
};

// Helper to get display price from variant
const getVariantDisplayPrice = (variant) => {
  if (variant.price !== undefined && variant.price !== null) {
    return variant.discountPrice || variant.price;
  }
  
  if (variant.storageOptions?.length > 0) {
    const option = variant.storageOptions.find(opt => opt.stock > 0);
    return option?.discountPrice || option?.price;
  }
  
  if (variant.sizeOptions?.length > 0) {
    const option = variant.sizeOptions.find(opt => opt.stock > 0);
    return option?.discountPrice || option?.price;
  }
  
  return null;
};

// Helper to get first available stock option
const getFirstAvailableStockOption = (variant) => {
  if (!variant) return null;

  // Check direct pricing first (simple color variant)
  if (variant.stock > 0) {
    return {
      type: 'simple',
      displayPrice: variant.discountPrice || variant.price,
      stock: variant.stock,
      discountPercentage: variant.price && variant.discountPrice 
        ? Math.round(((variant.price - variant.discountPrice) / variant.price) * 100)
        : 0
    };
  }

  // Check storage options
  if (variant.storageOptions?.length > 0) {
    for (const option of variant.storageOptions) {
      if (option.stock > 0) {
        return {
          type: 'storage',
          capacity: option.capacity,
          displayPrice: option.discountPrice || option.price,
          stock: option.stock,
          discountPercentage: option.price && option.discountPrice 
            ? Math.round(((option.price - option.discountPrice) / option.price) * 100)
            : 0
        };
      }
    }
  }

  // Check size options
  if (variant.sizeOptions?.length > 0) {
    for (const option of variant.sizeOptions) {
      if (option.stock > 0) {
        return {
          type: 'size',
          size: option.size,
          displayPrice: option.discountPrice || option.price,
          stock: option.stock,
          discountPercentage: option.price && option.discountPrice 
            ? Math.round(((option.price - option.discountPrice) / option.price) * 100)
            : 0
        };
      }
    }
  }

  return null;
};

// Normalize variant data structure
const normalizeVariant = (variant) => {
  const variantData = variant._doc || variant.__parentArray?.[0] || variant;
  
  const normalized = {
    _id: variantData._id || null,
    color: variantData.color && typeof variantData.color === 'object' 
      ? { name: variantData.color.name || '' }
      : { name: typeof variantData.color === 'string' ? variantData.color : '' },
    images: Array.isArray(variantData.images) ? variantData.images : [],
    videos: Array.isArray(variantData.videos) ? variantData.videos : [],
    price: variantData.price !== undefined ? parseFloat(variantData.price) : null,
    discountPrice: variantData.discountPrice !== undefined ? parseFloat(variantData.discountPrice) : null,
    stock: variantData.stock !== undefined ? parseInt(variantData.stock) : 0,
    sku: variantData.sku || '',
    displayPrice: getVariantDisplayPrice(variantData),
    // Always include these arrays even if empty
    storageOptions: [],
    sizeOptions: []
  };

  // Add storage options if they exist
  if (Array.isArray(variantData.storageOptions)) {
    normalized.storageOptions = variantData.storageOptions.map(option => ({
      _id: option._id || null,
      capacity: option.capacity || '',
      price: parseFloat(option.price) || 0,
      discountPrice: option.discountPrice !== undefined ? parseFloat(option.discountPrice) : null,
      stock: parseInt(option.stock) || 0,
      sku: option.sku || '',
      displayPrice: option.discountPrice || option.price || 0,
      discountPercentage: option.price && option.discountPrice
        ? Math.round(((option.price - option.discountPrice) / option.price) * 100)
        : 0
    }));
  }

  // Add size options if they exist
  if (Array.isArray(variantData.sizeOptions)) {
    normalized.sizeOptions = variantData.sizeOptions.map(option => ({
      _id: option._id || null,
      size: option.size || '',
      price: parseFloat(option.price) || 0,
      discountPrice: option.discountPrice !== undefined ? parseFloat(option.discountPrice) : null,
      stock: parseInt(option.stock) || 0,
      sku: option.sku || '',
      displayPrice: option.discountPrice || option.price || 0,
      discountPercentage: option.price && option.discountPrice
        ? Math.round(((option.price - option.discountPrice) / option.price) * 100)
        : 0
    }));
  }

  return normalized;
};

// Normalize product data structure
const normalizeProduct = (product) => {
  if (!product) return null;
  
  // Get first available image (base image or first variant image)
  const firstImage = product.images?.length > 0 
    ? product.images[0] 
    : getFirstVariantImage(product);

  // Get first available stock option from variants
  let firstStockOption = null;
  if (product.variants?.length > 0) {
    for (const variant of product.variants) {
      firstStockOption = getFirstAvailableStockOption(variant);
      if (firstStockOption) break;
    }
  }

  const normalized = {
    ...product,
    _id: product._id,
    price: product.price !== undefined ? parseFloat(product.price) : null,
    discountPrice: product.discountPrice !== undefined ? parseFloat(product.discountPrice) : null,
    displayPrice: firstStockOption?.displayPrice || 
                 product.discountPrice || 
                 product.price || 
                 0,
    stock: product.stock !== undefined ? parseInt(product.stock) : 0,
    shippingCost: product.shippingCost !== undefined ? parseFloat(product.shippingCost) : 0,
    color: product.color && typeof product.color === 'object' 
      ? { name: product.color.name || '' }
      : { name: '' },
    variants: product.variants?.map(variant => normalizeVariant(variant)) || [],
    specifications: Array.isArray(product.specifications) ? product.specifications : [],
    features: Array.isArray(product.features) ? product.features : [],
    images: Array.isArray(product.images) ? product.images : [],
    videos: Array.isArray(product.videos) ? product.videos : [],
    // Additional fields for product card display
    displayImage: firstImage || { url: '/placeholder-product.png' },
    displayStock: firstStockOption?.stock || product.stock || 0,
    displayOption: firstStockOption,
    discountPercentage: product.price && product.discountPrice
      ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
      : 0,
    isInStock: isInStock(product)
  };

  return normalized;
};

// Check if product is in stock
export const isInStock = (product) => {
  if (!product) return false;
  
  // Check base stock
  if (product.stock > 0) return true;
  
  // Check variant stocks
  if (product.variants?.length > 0) {
    return product.variants.some(variant => {
      // Check simple variant stock
      if (variant.stock > 0) return true;
      
      // Check storage options
      if (variant.storageOptions?.some(opt => opt.stock > 0)) return true;
      
      // Check size options
      if (variant.sizeOptions?.some(opt => opt.stock > 0)) return true;
      
      return false;
    });
  }
  
  return false;
};

// Get products with normalized data
export const getProducts = async (page = 1, limit = 10, sort = null, filters = {}, options = {}) => {
  const { isPublic = false, includeOutOfStock = false } = options;
  
  try {
    const query = new URLSearchParams({
      page,
      limit,
      ...(sort && { sort }),
      ...filters,
      ...(includeOutOfStock && { includeOutOfStock: true })
    }).toString();

    const endpoint = isPublic ? `/products/public?${query}` : `/products?${query}`;
    const response = await api.get(endpoint, { skipAuth: isPublic });

    const responseData = response.data?.data || response.data;
    const products = responseData?.products || [];
    const totalPages = responseData?.totalPages || 1;

    return {
      products: products.map(product => normalizeProduct(product)).filter(Boolean),
      totalPages,
      totalItems: responseData?.total || 0,
    };
  } catch (error) {
    throw handleProductError(error);
  }
};

// Get single product with normalized data
export const getProductById = async (id, options = {}) => {
  const { isPublic = true } = options;

  try {
    if (!id) throw new Error('Product ID is required');

    const endpoint = isPublic ? `/products/public/${id}` : `/products/${id}`;
    const response = await api.get(endpoint, { skipAuth: isPublic });

    const product = response.data?.product || 
                   response.data?.data?.product || 
                   response.data;

    if (!product || !product._id) {
      throw new Error('Invalid product response');
    }

    return normalizeProduct(product);
  } catch (error) {
    throw handleProductError(error);
  }
};

// Get featured products
export const getFeaturedProducts = async (page = 1, limit = 10, sort = null, filters = {}) => {
  return getProducts(page, limit, sort, { ...filters, isFeatured: true }, { isPublic: true });
};

// Create product with proper variant handling
export const createProduct = async (productData, media = {}) => {
  try {
    const formData = new FormData();

    // Process variants for form data
    const processVariant = (variant) => {
      const processed = { ...variant };
      
      // Handle color
      if (variant.color) {
        processed.color = typeof variant.color === 'string' ? variant.color : variant.color.name;
      }
      
      // Handle storage options
      if (variant.storageOptions) {
        processed.storageOptions = variant.storageOptions.map(opt => ({
          capacity: opt.capacity,
          price: opt.price,
          discountPrice: opt.discountPrice,
          stock: opt.stock,
          sku: opt.sku
        }));
      }
      
      // Handle size options
      if (variant.sizeOptions) {
        processed.sizeOptions = variant.sizeOptions.map(opt => ({
          size: opt.size,
          price: opt.price,
          discountPrice: opt.discountPrice,
          stock: opt.stock,
          sku: opt.sku
        }));
      }
      
      return processed;
    };

    // Append product data
    Object.entries(productData).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (key === 'variants' && Array.isArray(value)) {
        formData.append(key, JSON.stringify(value.map(processVariant)));
      } else if (typeof value === 'object' && !(value instanceof File)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });

    // Append media files
    if (media.baseImages?.length) {
      media.baseImages.forEach(image => formData.append('baseImages', image));
    }
    if (media.baseVideos?.length) {
      media.baseVideos.forEach(video => formData.append('baseVideos', video));
    }
    if (media.variantImages?.length) {
      media.variantImages.forEach((variantImages, index) => {
        variantImages?.forEach(image => formData.append(`variantImages[${index}]`, image));
      });
    }
    if (media.variantVideos?.length) {
      media.variantVideos.forEach((variantVideos, index) => {
        variantVideos?.forEach(video => formData.append(`variantVideos[${index}]`, video));
      });
    }

    const response = await api.post('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const product = response.data?.data?.product || response.data?.product || response.data;
    return normalizeProduct(product);
  } catch (error) {
    throw handleProductError(error);
  }
};

// Update product with proper variant handling
export const updateProduct = async (id, productData, media = {}) => {
  try {
    if (!id) throw new Error('Product ID is required');

    const formData = new FormData();

    // Process variants for form data (same as create)
    const processVariant = (variant) => {
      const processed = { ...variant };
      
      if (variant.color) {
        processed.color = typeof variant.color === 'string' ? variant.color : variant.color.name;
      }
      
      if (variant.storageOptions) {
        processed.storageOptions = variant.storageOptions.map(opt => ({
          capacity: opt.capacity,
          price: opt.price,
          discountPrice: opt.discountPrice,
          stock: opt.stock,
          sku: opt.sku
        }));
      }
      
      if (variant.sizeOptions) {
        processed.sizeOptions = variant.sizeOptions.map(opt => ({
          size: opt.size,
          price: opt.price,
          discountPrice: opt.discountPrice,
          stock: opt.stock,
          sku: opt.sku
        }));
      }
      
      return processed;
    };

    // Append product data
    Object.entries(productData).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (key === 'variants' && Array.isArray(value)) {
        formData.append(key, JSON.stringify(value.map(processVariant)));
      } else if (typeof value === 'object' && !(value instanceof File)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });

    // Append media files
    if (media.baseImages?.length) {
      media.baseImages.forEach(image => formData.append('baseImages', image));
    }
    if (media.baseVideos?.length) {
      media.baseVideos.forEach(video => formData.append('baseVideos', video));
    }
    if (media.variantImages?.length) {
      media.variantImages.forEach((variantImages, index) => {
        variantImages?.forEach(image => formData.append(`variantImages[${index}]`, image));
      });
    }
    if (media.variantVideos?.length) {
      media.variantVideos.forEach((variantVideos, index) => {
        variantVideos?.forEach(video => formData.append(`variantVideos[${index}]`, video));
      });
    }

    const response = await api.put(`/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const product = response.data?.data?.product || response.data?.product || response.data;
    return normalizeProduct(product);
  } catch (error) {
    throw handleProductError(error);
  }
};

// Delete product
export const deleteProduct = async (id) => {
  try {
    if (!id) throw new Error('Product ID is required');
    await api.delete(`/products/${id}`);
    return true;
  } catch (error) {
    throw handleProductError(error);
  }
};

// Error handler
const handleProductError = (error) => {
  const status = error.response?.status;
  let message = error.response?.data?.message || error.message || 'Request failed';

  if (error.response?.data?.errors) {
    message = error.response.data.errors.map(err => err.message || err.msg).join(', ');
  }

  switch (status) {
    case 400: return new Error(message || 'Invalid request data');
    case 401: return new Error('Please log in to continue');
    case 403: return new Error('You are not authorized to perform this action');
    case 404: return new Error(message || 'Product not found');
    case 429: return new Error('Too many requests. Please try again later.');
    default: return new Error(message);
  }
};