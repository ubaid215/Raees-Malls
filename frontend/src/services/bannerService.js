import api from './api';
import * as yup from 'yup';

// Validation schema for banner data
const bannerSchema = yup.object().shape({
  title: yup
    .string()
    .trim()
    .optional(), // Make title optional
  description: yup
    .string()
    .trim()
    .optional(),
  targetUrl: yup
    .string()
    .trim()
    .optional(),
  priority: yup
    .number()
    .min(0, 'Priority must be a non-negative integer')
    .optional(),
  isActive: yup
    .boolean()
    .optional(),
  position: yup
    .string()
    .required('Position is required')
    .oneOf(['hero-slider', 'hero-side-top', 'hero-side-bottom-left', 'hero-side-bottom-right', 'featured-products-banner'], 'Invalid position'),
});

// Get active banners (public)
export const getBanners = async () => {
  try {
    const response = await api.get('/banners/active');
    console.log('GetBanners response:', response.data);
    if (!response.data.success || !Array.isArray(response.data.data.banners)) {
      throw new Error('Invalid response: Missing or invalid banners data');
    }
    return response.data.data.banners;
  } catch (error) {
    console.error('GetBanners error:', error.response?.data, error.message);
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers['retry-after'] || '30';
      throw new Error(`Too many requests. Please try again in ${retryAfter} seconds.`);
    }
    const errorData = error.response?.data;
    if (errorData?.errors?.length) {
      const messages = errorData.errors.map((e) => e.msg).join(', ');
      throw new Error(messages);
    }
    throw new Error(errorData?.message || error.message || 'Failed to fetch banners');
  }
};

// Create banner (admin)
export const createBanner = async (bannerData, image) => {
  try {
    const validatedData = await bannerSchema.validate(bannerData, { abortEarly: false });
    const formData = new FormData();
    Object.entries(validatedData).forEach(([key, value]) => {
      formData.append(key, value);
    });
    if (image) {
      console.log('Image to upload:', { name: image.name, type: image.type, size: image.size }); // Debug log
      formData.append('image', image);
    } else {
      console.log('No image provided'); // Debug log
    }
    // Debug FormData content
    for (let [key, value] of formData.entries()) {
      console.log(`FormData entry: ${key}=${value}`);
    }
    const response = await api.post('/admin/banners', formData, { isMultipart: true });
    console.log('CreateBanner response:', response.data);
    if (!response.data.success || !response.data.data.banner) {
      throw new Error('Invalid response: Missing banner data');
    }
    return response.data.data.banner;
  } catch (error) {
    console.error('CreateBanner error:', error.response?.data, error.message);
    if (error instanceof yup.ValidationError) {
      const errors = error.inner.map((err) => err.message).join(', ');
      throw new Error(errors);
    }
    const errorData = error.response?.data;
    if (errorData?.errors?.length) {
      const messages = errorData.errors.map((e) => e.msg).join(', ');
      throw new Error(messages);
    }
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers['retry-after'] || '30';
      throw new Error(`Too many requests. Please try again in ${retryAfter} seconds.`);
    }
    throw new Error(errorData?.message || error.message || 'Failed to create banner');
  }
};

// Update banner (admin)
export const updateBanner = async (id, bannerData, image) => {
  try {
    const validatedData = await bannerSchema.validate(bannerData, { abortEarly: false });
    const formData = new FormData();
    Object.entries(validatedData).forEach(([key, value]) => {
      formData.append(key, value);
    });
    if (image) {
      console.log('Image to upload:', { name: image.name, type: image.type, size: image.size }); // Debug log
      formData.append('image', image);
    } else {
      console.log('No image provided'); // Debug log
    }
    // Debug FormData content
    for (let [key, value] of formData.entries()) {
      console.log(`FormData entry: ${key}=${value}`);
    }
    const response = await api.put(`/admin/banners/${id}`, formData, { isMultipart: true });
    console.log('UpdateBanner response:', response.data);
    if (!response.data.success || !response.data.data.banner) {
      throw new Error('Invalid response: Missing banner data');
    }
    return response.data.data.banner;
  } catch (error) {
    console.error('UpdateBanner error:', error.response?.data, error.message);
    if (error instanceof yup.ValidationError) {
      const errors = error.inner.map((err) => err.message).join(', ');
      throw new Error(errors);
    }
    const errorData = error.response?.data;
    if (errorData?.errors?.length) {
      const messages = errorData.errors.map((e) => e.msg).join(', ');
      throw new Error(messages);
    }
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers['retry-after'] || '30';
      throw new Error(`Too many requests. Please try again in ${retryAfter} seconds.`);
    }
    throw new Error(errorData?.message || error.message || 'Failed to update banner');
  }
};

// Delete banner (admin)
export const deleteBanner = async (id) => {
  try {
    const response = await api.delete(`/admin/banners/${id}`);
    console.log('DeleteBanner response:', response.data);
    if (!response.data.success) {
      throw new Error('Invalid response: Deletion failed');
    }
    return response.data;
  } catch (error) {
    console.error('DeleteBanner error:', error.response?.data, error.message);
    const errorData = error.response?.data;
    if (errorData?.errors?.length) {
      const messages = errorData.errors.map((e) => e.msg).join(', ');
      throw new Error(messages);
    }
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers['retry-after'] || '30';
      throw new Error(`Too many requests. Please try again in ${retryAfter} seconds.`);
    }
    throw new Error(errorData?.message || error.message || 'Failed to delete banner');
  }
};