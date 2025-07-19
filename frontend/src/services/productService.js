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



export const normalizeVariant = (variant) => {
  // Use stock from _doc if available, otherwise fall back to root stock or 0
  const stock = variant._doc?.stock || variant.stock || 0;

  return {
    ...variant,
    stock, // Use the corrected stock value
    color: variant.color || {},
    price: variant._doc?.price || variant.price || 0,
    discountPrice: variant._doc?.discountPrice || variant.discountPrice || 0,
    sku: variant._doc?.sku || variant.sku || "",
    images: variant._doc?.images || variant.images || [],
    videos: variant._doc?.videos || variant.videos || [],
    storageOptions: variant.storageOptions?.map((opt) => ({
      ...opt,
      stock: opt.stock || 0,
    })) || [],
    sizeOptions: variant.sizeOptions?.map((opt) => ({
      ...opt,
      stock: opt.stock || 0,
    })) || [],
  };
};

export const normalizeProduct = (product) => {
  return {
    ...product,
    stock: product.stock || 0, // Base product stock
    images: product.images || [],
    videos: product.videos || [],
    variants: product.variants?.map((v) => normalizeVariant(v)) || [],
    // Ensure other fields are preserved
    title: product.title || "",
    description: product.description || "",
    price: product._doc?.price || product.price || 0,
    discountPrice: product._doc?.discountPrice || product.discountPrice || 0,
  };
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