import api from './api';
import { v4 as uuidv4 } from 'uuid';

// Get or generate deviceId
const getDeviceId = () => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

// Add to wishlist
export const addToWishlist = async (productId, variantId = null) => {
  try {
    const deviceId = getDeviceId();
    const payload = { productId, deviceId };
    if (variantId) {
      payload.variantId = variantId;
    }
    // console.log('Sending payload to /wishlist:', payload);
    const response = await api.post('/wishlist', payload, { skipAuth: true });
    // console.log('addToWishlist response:', JSON.stringify(response.data, null, 2));
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to add to wishlist');
    }
    return response.data;
  } catch (error) {
    console.error('addToWishlist error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.errorMessages
      ? error.response.data.errorMessages.map(err => err.message).join('; ')
      : error.response?.data?.message || 'Failed to add to wishlist';
    throw new Error(errorMessage);
  }
};

// Get wishlist
export const getWishlist = async () => {
  try {
    const deviceId = getDeviceId();
    const response = await api.get(`/wishlist?deviceId=${deviceId}`, { skipAuth: true });
    // console.log('getWishlist response:', JSON.stringify(response.data, null, 2));
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch wishlist');
    }
    const items = response.data?.data?.wishlist?.items || [];
    if (!Array.isArray(items)) {
      console.error('getWishlist: Expected items to be an array, got:', items);
      return [];
    }
    // console.log('getWishlist returning items:', JSON.stringify(items, null, 2));
    return items;
  } catch (error) {
    console.error('getWishlist error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch wishlist');
  }
};

// Remove from wishlist
export const removeFromWishlist = async (productId, variantId = null) => {
  try {
    const deviceId = getDeviceId();
    const url = variantId ? `/wishlist/${productId}/${variantId}` : `/wishlist/${productId}`;
    const response = await api.delete(url, { data: { deviceId }, skipAuth: true });
    // console.log('removeFromWishlist response:', JSON.stringify(response.data, null, 2));
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to remove from wishlist');
    }
    return response.data;
  } catch (error) {
    console.error('removeFromWishlist error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to remove from wishlist');
  }
};