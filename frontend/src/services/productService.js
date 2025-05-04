import api from './api';

export const getProducts = async (page = 1, limit = 10, sort = null, filters = {}, options = {}) => {
  const { isPublic = false } = options;
  let endpoint; // Define endpoint at the function scope level so it's available in the catch block
  
  try {
    const query = new URLSearchParams({
      page,
      limit,
      ...(sort && { sort }),
      ...filters,
    }).toString();

    endpoint = isPublic ? `/products/public?${query}` : `/admin/products?${query}`;
    const response = await api.get(endpoint, { skipAuth: isPublic });
    
    // Rest of the function remains the same
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
      variants: product.variants?.map(variant => ({
        ...variant,
        displayPrice: variant.discountPrice || variant.price
      })) || []
    }));

    return { 
      products: validProducts, 
      totalPages,
      totalItems: responseData.total || 0
    };
  } catch (error) {
    console.error('Get products error:', {
      endpoint, // Now this is defined
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
    
    // Handle different response structures
    let product;
    if (response.data?.product) {
      product = response.data.product;
    } else if (response.data?.data?.product) {
      product = response.data.data.product;
    } else if (response.data) {
      // Assume the response data itself is the product
      product = response.data;
    }

    if (!product || !product._id) {
      console.error('Invalid product response structure:', response.data);
      throw new Error('Invalid product response');
    }

    return {
      ...product,
      displayPrice: product.discountPrice || product.price,
      variants: product.variants?.map(variant => ({
        ...variant,
        displayPrice: variant.discountPrice || variant.price
      })) || []
    };
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

export const createProduct = async (productData, images = {}) => {
  try {
    console.log('Preparing to create product:', {
      productData: JSON.stringify(productData, null, 2),
      baseImagesCount: images.baseImages?.length || 0,
      variantImagesCount: images.variantImages?.map(v => v?.length || 0) || []
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
      } else if (Array.isArray(value) || typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
        console.log(`Appended ${key}:`, JSON.stringify(value));
      } else {
        formData.append(key, value);
        console.log(`Appended ${key}:`, value);
      }
    });

    if (images.baseImages?.length) {
      images.baseImages.forEach((image, index) => {
        formData.append('baseImages', image);
        console.log(`Appended baseImages[${index}]:`, image.name);
      });
    } else {
      console.warn('No base images provided');
    }

    if (images.variantImages?.length) {
      images.variantImages.forEach((variantImages, index) => {
        if (variantImages?.length) {
          variantImages.forEach((image, imgIndex) => {
            formData.append(`variantImages[${index}]`, image);
            console.log(`Appended variantImages[${index}][${imgIndex}]:`, image.name);
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

export const updateProduct = async (id, productData, images = {}) => {
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
      } else if (Array.isArray(value) || typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });

    if (images.baseImages?.length) {
      images.baseImages.forEach((image) => {
        formData.append('baseImages', image);
      });
    }

    if (images.variantImages?.length) {
      images.variantImages.forEach((variantImages, index) => {
        if (variantImages?.length) {
          variantImages.forEach((image) => {
            formData.append(`variantImages[${index}]`, image);
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

  // Handle Mongoose validation errors
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