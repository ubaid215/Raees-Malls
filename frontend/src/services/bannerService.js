import api from './api';

// Get all banners (public)
export const getBanners = async () => {
  try {
    const response = await api.get('/banners');
    return response.data.banners;
  } catch (error) {
    console.error('GetBanners error:', error.response?.data, error.message);
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers['retry-after'] || '30';
      throw new Error(`Too many requests. Please try again in ${retryAfter} seconds.`);
    }
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch banners');
  }
};

// Create banner (admin)
export const createBanner = async (bannerData, image) => {
  try {
    const formData = new FormData();
    Object.entries(bannerData).forEach(([key, value]) => {
      formData.append(key, value);
    });
    if (image) formData.append('image', image);
    const response = await api.post('/admin/banners', formData, { isMultipart: true });
    return response.data.banner;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to create banner');
  }
};

// Update banner (admin)
export const updateBanner = async (id, bannerData, image) => {
  try {
    const formData = new FormData();
    Object.entries(bannerData).forEach(([key, value]) => {
      formData.append(key, value);
    });
    if (image) formData.append('image', image);
    const response = await api.put(`/admin/banners/${id}`, formData, { isMultipart: true });
    return response.data.banner;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to update banner');
  }
};

// Delete banner (admin)
export const deleteBanner = async (id) => {
  try {
    const response = await api.delete(`/admin/banners/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to delete banner');
  }
};