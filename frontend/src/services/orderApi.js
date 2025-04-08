// Mock API function (replace with real API later)
// src/api/orderAPI.js
export const createOrder = async (orderData) => {
    // In a real app, this would be a fetch call to your backend
    console.log('Order submitted:', orderData);
    return new Promise((resolve) => {
      setTimeout(() => resolve({ success: true, orderId: Date.now() }), 1000);
    });
  };