
// Initialize DataLayer
export const initDataLayer = () => {
  window.dataLayer = window.dataLayer || [];
};

// Product View Event (for product detail pages)
export const trackProductView = (product) => {
  if (!product || !window.dataLayer) return;
  
  window.dataLayer.push({
    event: 'view_item',
    ecommerce: {
      currency: 'PKR',
      value: product.discountPrice || product.price,
      items: [{
        item_id: product._id,
        item_name: product.title,
        item_category: product.categoryId?.name || 'Unknown',
        item_brand: product.brand || 'Generic',
        price: product.discountPrice || product.price,
        quantity: 1
      }]
    },
    // Custom parameters for Facebook Pixel
    content_ids: [product._id],
    content_type: 'product',
    value: product.discountPrice || product.price,
    currency: 'PKR'
  });
};

// Add to Cart Event
export const trackAddToCart = (product, quantity = 1) => {
  if (!product || !window.dataLayer) return;
  
  const itemValue = (product.discountPrice || product.price) * quantity;
  
  window.dataLayer.push({
    event: 'add_to_cart',
    ecommerce: {
      currency: 'PKR',
      value: itemValue,
      items: [{
        item_id: product._id,
        item_name: product.title,
        item_category: product.categoryId?.name || 'Unknown',
        item_brand: product.brand || 'Generic',
        price: product.discountPrice || product.price,
        quantity: quantity
      }]
    },
    // Custom parameters for Facebook Pixel
    content_ids: [product._id],
    content_type: 'product',
    value: itemValue,
    currency: 'PKR'
  });
};

// Remove from Cart Event
export const trackRemoveFromCart = (product, quantity = 1) => {
  if (!product || !window.dataLayer) return;
  
  const itemValue = (product.discountPrice || product.price) * quantity;
  
  window.dataLayer.push({
    event: 'remove_from_cart',
    ecommerce: {
      currency: 'PKR',
      value: itemValue,
      items: [{
        item_id: product._id,
        item_name: product.title,
        item_category: product.categoryId?.name || 'Unknown',
        item_brand: product.brand || 'Generic',
        price: product.discountPrice || product.price,
        quantity: quantity
      }]
    }
  });
};

// Begin Checkout Event
export const trackBeginCheckout = (cartItems, totalValue) => {
  if (!cartItems || !window.dataLayer) return;
  
  window.dataLayer.push({
    event: 'begin_checkout',
    ecommerce: {
      currency: 'PKR',
      value: totalValue,
      items: cartItems.map(item => ({
        item_id: item.productId || item._id,
        item_name: item.title || item.name,
        item_category: item.categoryId?.name || item.category || 'Unknown',
        item_brand: item.brand || 'Generic',
        price: item.discountPrice || item.price,
        quantity: item.quantity
      }))
    },
    // Custom parameters for Facebook Pixel
    content_ids: cartItems.map(item => item.productId || item._id),
    content_type: 'product',
    value: totalValue,
    currency: 'PKR',
    num_items: cartItems.length
  });
};

// Purchase Event (Order Confirmation)
export const trackPurchase = (orderData) => {
  if (!orderData || !window.dataLayer) return;
  
  window.dataLayer.push({
    event: 'purchase',
    ecommerce: {
      transaction_id: orderData.orderId || orderData._id,
      value: orderData.totalAmount || orderData.total,
      currency: 'PKR',
      shipping: orderData.shippingCost || 0,
      tax: orderData.tax || 0,
      items: (orderData.items || orderData.products || []).map(item => ({
        item_id: item.productId || item._id,
        item_name: item.name || item.title,
        item_category: item.category || 'Unknown',
        item_brand: item.brand || 'Generic',
        price: item.price,
        quantity: item.quantity
      }))
    },
    // Custom parameters for Facebook Pixel
    content_ids: (orderData.items || orderData.products || []).map(item => item.productId || item._id),
    content_type: 'product',
    value: orderData.totalAmount || orderData.total,
    currency: 'PKR'
  });
};

// Search Event
export const trackSearch = (searchTerm, results = []) => {
  if (!searchTerm || !window.dataLayer) return;
  
  window.dataLayer.push({
    event: 'search',
    search_term: searchTerm,
    search_results: results.length
  });
};

// Page View Event (for SPA routing)
export const trackPageView = (pagePath, pageTitle) => {
  if (!window.dataLayer) return;
  
  window.dataLayer.push({
    event: 'page_view',
    page_location: window.location.href,
    page_path: pagePath,
    page_title: pageTitle
  });
};

// Custom Event Tracker
export const trackCustomEvent = (eventName, eventData = {}) => {
  if (!eventName || !window.dataLayer) return;
  
  window.dataLayer.push({
    event: eventName,
    ...eventData
  });
};

// Lead Generation Event (for contact forms)
export const trackLead = (leadData = {}) => {
  if (!window.dataLayer) return;
  
  window.dataLayer.push({
    event: 'generate_lead',
    currency: 'PKR',
    value: 0, // Lead value if any
    ...leadData
  });
};