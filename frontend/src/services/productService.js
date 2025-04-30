import api from './api';

export const getProducts = async (page = 1, limit = 10, sort = null, filters = {}) => {
  try {
    const query = new URLSearchParams({
      page,
      limit,
      ...(sort && { sort }),
      ...filters,
    }).toString();

    const response = await api.get(`/admin/products?${query}`);
    console.log('Get products response:', { data: response.data });

    // Validate response data
    if (!response.data || typeof response.data !== 'object') {
      console.error('Invalid response data:', { response });
      throw new Error('Invalid response: No data received');
    }

    // FIX: Access products from the correct path in the response
    // The API returns response.data.data.products rather than response.data.products
    const responseData = response.data.data || response.data;
    const products = responseData.products || [];
    const totalPages = responseData.totalPages || 1;

    // Validate products array
    if (!Array.isArray(products)) {
      console.error('Invalid products data: Not an array', { products });
      throw new Error('Invalid response: Products is not an array');
    }

    // Filter valid products
    const validProducts = products.filter(product => {
      if (!product._id) {
        console.error('Invalid product: Missing _id', { product });
        return false;
      }
      return true;
    });

    console.log('Fetched products:', { count: validProducts.length, totalPages });
    return { products: validProducts, totalPages };
  } catch (error) {
    console.error('Get products error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw new Error(error.response?.data?.message || 'Failed to fetch products');
  }
};

export const getProductById = async (id, options = {}) => {
  const { isPublic = true } = options;

  try {
    const response = await api.get(`/products/${id}`, { skipAuth: isPublic });
    return response.data.product;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch product');
  }
};

export const createProduct = async (productData, images) => {
  try {
    const formData = new FormData();
    Object.entries(productData).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (key === 'seo') {
        Object.entries(value).forEach(([seoKey, seoValue]) => {
          if (seoValue) formData.append(`seo[${seoKey}]`, seoValue);
        });
      } else {
        formData.append(key, value);
      }
    });

    // Append main product images as 'baseImages'
    images.baseImages.forEach((image) => {
      formData.append('baseImages', image);
    });

    // Append variant images as 'variantImages[i]'
    images.variantImages.forEach((variantImages, index) => {
      variantImages.forEach((image) => {
        formData.append(`variantImages[${index}]`, image);
      });
    });

    // Log FormData for debugging
    for (let [key, value] of formData.entries()) {
      console.log(`FormData: ${key} = ${typeof value === 'object' ? value.name : value}`);
    }

    const response = await api.post('/admin/products', formData, { isMultipart: true });
    const product = response.data.product;

    // Validate product _id
    if (!product?._id) {
      console.error('Create product error: Missing _id in response', { product });
      throw new Error('Invalid product response: Missing _id');
    }

    console.log('Created product:', { id: product._id, title: product.title });
    return product;
  } catch (error) {
    console.error('Create product error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw new Error(error.response?.data?.message || 'Failed to create product');
  }
};


export const updateProduct = async (id, productData, images) => {
  try {
    const formData = new FormData();
    Object.entries(productData).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });
    images.forEach((image) => formData.append('images', image));
    const response = await api.put(`/admin/products/${id}`, formData, { isMultipart: true });
    return response.data.product;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update product');
  }
};

export const deleteProduct = async (productId) => {
  try {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    await api.delete(`/admin/products/${productId}`);
    console.log('Deleted product:', { id: productId });
  } catch (error) {
    console.error('Delete product error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw new Error(error.response?.data?.message || 'Failed to delete product');
  }
};