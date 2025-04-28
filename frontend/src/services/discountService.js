import api from './api';

// Apply discount (public)
export const applyDiscount = async (code, orderTotal, productIds) => {
  try {
    const response = await api.post('/discounts/apply', { code, orderTotal, productIds });
    return response.data.discount;
  } catch (error) {
    throw new Error(error.message || 'Failed to apply discount');
  }
};

// Create discount (admin)
export const createDiscount = async (discountData) => {
  try {
    const response = await api.post('/admin/discounts', discountData);
    return response.data.data;
  } catch (error) {
    throw new Error(error.message || 'Failed to create discount');
  }
};

// Get all discounts (admin)
export const getDiscounts = async (page = 1, limit = 10, isActive = undefined) => {
  try {
    const params = { page, limit };
    if (isActive !== undefined) params.isActive = isActive;
    const response = await api.get('/admin/discounts', { params });
    return response.data.discounts;
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch discounts');
  }
};

// Get discount by ID (admin)
export const getDiscountById = async (id) => {
  try {
    const response = await api.get(`/admin/discounts/${id}`);
    return response.data.data;
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch discount');
  }
};

// Update discount (admin)
export const updateDiscount = async (id, discountData) => {
  try {
    const response = await api.put(`/admin/discounts/${id}`, discountData);
    return response.data.data;
  } catch (error) {
    throw new Error(error.message || 'Failed to update discount');
  }
};

// Delete discount (admin)
export const deleteDiscount = async (id) => {
  try {
    const response = await api.delete(`/admin/discounts/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.message || 'Failed to delete discount');
  }
};