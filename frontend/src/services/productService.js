import api from './api';

const normalizeVariant = (variant) => {
  // Extract actual variant data from _doc or __parentArray[0]
  const variantData = variant._doc || variant.__parentArray?.[0] || variant;
  console.log('Raw Variant:', variantData); // Debug log

  return {
    _id: variantData._id || variant._id,
    sku: variantData.sku || variant.sku || '',
    price: Number.isFinite(parseFloat(variantData.price)) ? parseFloat(variantData.price) : 0,
    discountPrice: variantData.discountPrice
      ? Number.isFinite(parseFloat(variantData.discountPrice))
        ? parseFloat(variantData.discountPrice)
        : null
      : null,
    stock: Number.isFinite(parseInt(variantData.stock)) ? parseInt(variantData.stock) : 0,
    attributes: Array.isArray(variantData.attributes) ? variantData.attributes : [],
    images: Array.isArray(variantData.images) ? variantData.images : [],
    videos: Array.isArray(variantData.videos) ? variantData.videos : [],
    specifications: Array.isArray(variantData.specifications) ? variantData.specifications : [],
    displayPrice: variantData.discountPrice
      ? Number.isFinite(parseFloat(variantData.discountPrice))
        ? parseFloat(variantData.discountPrice)
        : parseFloat(variantData.price) || 0
      : parseFloat(variantData.price) || 0,
  };
};

export const getProducts = async (page = 1, limit = 10, sort = null, filters = {}, options = {}) => {
  const { isPublic = false } = options;
  let endpoint;
  
  try {
    const query = new URLSearchParams({
      page,
      limit,
      ...(sort && { sort }),
      ...filters,
    }).toString();

    endpoint = isPublic ? `/products/public?${query}` : `/admin/products?${query}`;
    const response = await api.get(endpoint, { skipAuth: isPublic });
    
    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Invalid response: No data received');
    }

    const responseData = response.data.data || response.data;
    const products = responseData.products || [];
    const totalPages = responseData.totalPages || 1;

    if (!Array.isArray(products)) {
      throw new Error('Invalid response: Products is not an array');
    }

    const validProducts = products.map(product => ({
      ...product,
      displayPrice: product.discountPrice || product.price,
      variants: product.variants?.map(variant => normalizeVariant(variant)) || [],
    }));

    return { 
      products: validProducts, 
      totalPages,
      totalItems: responseData.total || 0
    };
  } catch (error) {
    console.error('Get products error:', {
      endpoint,
      status: error.response?.status,
      message: error.message,
      responseData: error.response?.data
    });
    throw handleProductError(error);
  }
};

export const getFeaturedProducts = async (page = 1, limit = 10, sort = null) => {
  let endpoint;
  
  try {
    const query = new URLSearchParams({
      page,
      limit,
      isFeatured: true,
      ...(sort && { sort }),
    }).toString();

    endpoint = `/products/public?${query}`;
    const response = await api.get(endpoint, { skipAuth: true });
    
    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Invalid response: No data received');
    }

    const responseData = response.data.data || response.data;
    const products = responseData.products || [];
    const totalPages = responseData.totalPages || 1;

    if (!Array.isArray(products)) {
      throw new Error('Invalid response: Products is not an array');
    }

    const validProducts = products.map(product => ({
      ...product,
      displayPrice: product.discountPrice || product.price,
      variants: product.variants?.map(variant => normalizeVariant(variant)) || [],
    }));

    return { 
      products: validProducts, 
      totalPages,
      totalItems: responseData.total || 0
    };
  } catch (error) {
    console.error('Get featured products error:', {
      endpoint,
      status: error.response?.status,
      message: error.message,
      responseData: error.response?.data
    });
    throw handleProductError(error);
  }
};

export const getProductById = async (id, options = {}) => {
  const { isPublic = true } = options;

  try {
    if (!id) throw new Error('Product ID is required');
    
    const endpoint = isPublic ? `/products/public/${id}` : `/admin/products/${id}`;
    const response = await api.get(endpoint, { skipAuth: isPublic });
    
    let product;
    if (response.data?.product) {
      product = response.data.product;
    } else if (response.data?.data?.product) {
      product = response.data.data.product;
    } else if (response.data) {
      product = response.data;
    }

    if (!product || !product._id) {
      console.error('Invalid product response structure:', response.data);
      throw new Error('Invalid product response');
    }

    const normalizedProduct = {
      ...product,
      price: Number.isFinite(parseFloat(product.price)) ? parseFloat(product.price) : 0,
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
      variants: product.variants?.map(variant => normalizeVariant(variant)) || [],
      images: Array.isArray(product.images) ? product.images : [],
      videos: Array.isArray(product.videos) ? product.videos : [],
      specifications: Array.isArray(product.specifications) ? product.specifications : [],
      features: Array.isArray(product.features) ? product.features : [],
    };
    console.log('Normalized Product:', normalizedProduct); // Debug log

    return normalizedProduct;
  } catch (error) {
    console.error('Get product by ID error:', {
      id,
      status: error.response?.status,
      message: error.message,
      responseData: error.response?.data
    });
    throw handleProductError(error);
  }
};

export const createProduct = async (productData, media = {}) => {
  try {
    console.log('Preparing to create product:', {
      productData: JSON.stringify(productData, null, 2),
      baseImagesCount: media.baseImages?.length || 0,
      baseVideosCount: media.baseVideos?.length || 0,
      variantImagesCount: media.variantImages?.map(v => v?.length || 0) || [],
      variantVideosCount: media.variantVideos?.map(v => v?.length || 0) || []
    });

    const formData = new FormData();

    Object.entries(productData).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (key === 'seo') {
        Object.entries(value).forEach(([subKey, subValue]) => {
          if (subValue && subValue.trim()) {
            formData.append(`seo[${subKey}]`, subValue);
            console.log(`Appended seo[${subKey}]:`, subValue);
          }
        });
      } else if (key === 'variants' && Array.isArray(value)) {
        // Ensure variant specifications are stringified
        const processedVariants = value.map(variant => ({
          ...variant,
          specifications: variant.specifications ? JSON.stringify(variant.specifications) : '[]',
        }));
        formData.append('variants', JSON.stringify(processedVariants));
        console.log('Appended variants:', JSON.stringify(processedVariants));
      } else if (Array.isArray(value) || typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
        console.log(`Appended ${key}:`, JSON.stringify(value));
      } else {
        formData.append(key, value);
        console.log(`Appended ${key}:`, value);
      }
    });

    if (media.baseImages?.length) {
      media.baseImages.forEach((image, index) => {
        formData.append('baseImages', image);
        console.log(`Appended baseImages[${index}]:`, image.name);
      });
    } else {
      console.warn('No base images provided');
    }

    if (media.baseVideos?.length) {
      media.baseVideos.forEach((video, index) => {
        formData.append('baseVideos', video);
        console.log(`Appended baseVideos[${index}]:`, video.name);
      });
    }

    if (media.variantImages?.length) {
      media.variantImages.forEach((variantImages, index) => {
        if (variantImages?.length) {
          variantImages.forEach((image, imgIndex) => {
            formData.append(`variantImages[${index}]`, image);
            console.log(`Appended variantImages[${index}][${imgIndex}]:`, image.name);
          });
        }
      });
    }

    if (media.variantVideos?.length) {
      media.variantVideos.forEach((variantVideos, index) => {
        if (variantVideos?.length) {
          variantVideos.forEach((video, vidIndex) => {
            formData.append(`variantVideos[${index}]`, video);
            console.log(`Appended variantVideos[${index}][${vidIndex}]:`, video.name);
          });
        }
      });
    }

    const response = await api.post('/admin/products', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000
    });

    console.log('Raw API response:', response);

    if (!response.data || !response.data.data || !response.data.data.product) {
      throw new Error('Invalid response: Product data not found');
    }

    const product = response.data.data.product;

    console.log('Product created successfully:', {
      id: product?._id,
      title: product?.title,
      status: response.status
    });

    if (!product._id) {
      throw new Error('Invalid product response: Missing product ID');
    }

    return product;
  } catch (error) {
    console.error('Create product error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      stack: error.stack,
      config: error.config ? {
        url: error.config.url,
        method: error.config.method,
        headers: error.config.headers
      } : null,
      fullResponse: error.response?.data
    });
    throw handleProductError(error);
  }
};

export const updateProduct = async (id, productData, media = {}) => {
  try {
    if (!id) throw new Error('Product ID is required');

    const formData = new FormData();

    Object.entries(productData).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (key === 'seo') {
        Object.entries(value).forEach(([subKey, subValue]) => {
          if (subValue && subValue.trim()) {
            formData.append(`seo[${subKey}]`, subValue);
          }
        });
      } else if (key === 'variants' && Array.isArray(value)) {
        // Ensure variant specifications are stringified
        const processedVariants = value.map(variant => ({
          ...variant,
          specifications: variant.specifications ? JSON.stringify(variant.specifications) : '[]',
        }));
        formData.append('variants', JSON.stringify(processedVariants));
      } else if (Array.isArray(value) || typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });

    if (media.baseImages?.length) {
      media.baseImages.forEach((image) => {
        formData.append('baseImages', image);
      });
    }

    if (media.baseVideos?.length) {
      media.baseVideos.forEach((video) => {
        formData.append('baseVideos', video);
      });
    }

    if (media.variantImages?.length) {
      media.variantImages.forEach((variantImages, index) => {
        if (variantImages?.length) {
          variantImages.forEach((image) => {
            formData.append(`variantImages[${index}]`, image);
          });
        }
      });
    }

    if (media.variantVideos?.length) {
      media.variantVideos.forEach((variantVideos, index) => {
        if (variantVideos?.length) {
          variantVideos.forEach((video) => {
            formData.append(`variantVideos[${index}]`, video);
          });
        }
      });
    }

    const response = await api.put(`/admin/products/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000
    });

    console.log('Updated product:', { id, title: response.data.product?.title });
    return response.data.product;
  } catch (error) {
    console.error('Update product error:', {
      id,
      status: error.response?.status,
      message: error.message,
      responseData: error.response?.data
    });
    throw handleProductError(error);
  }
};

export const deleteProduct = async (id) => {
  try {
    if (!id) throw new Error('Product ID is required');
    
    await api.delete(`/admin/products/${id}`);
    console.log('Deleted product:', { id });
    return true;
  } catch (error) {
    console.error('Delete product error:', {
      id,
      status: error.response?.status,
      message: error.message,
      responseData: error.response?.data
    });
    throw handleProductError(error);
  }
};

const handleProductError = (error) => {
  const status = error.response?.status;
  let message = error.response?.data?.message || error.message || 'Request failed with status unknown';

  if (error.response?.data?.errors) {
    const validationErrors = error.response.data.errors;
    message = Object.values(validationErrors)
      .map(err => err.message)
      .join(', ');
  }

  switch (status) {
    case 400:
      return new Error(message || 'Invalid request data');
    case 401:
      return new Error('Please log in to continue');
    case 403:
      return new Error('You are not authorized to perform this action');
    case 404:
      return new Error(message || 'Product not found');
    case 429:
      return new Error('Too many requests. Please try again later.');
    default:
      return new Error(message);
  }
};