const SALES_LIMITS = {
  // Maximum concurrent sales by type
  MAX_CONCURRENT_SALES: {
    flash_sale: 3,      // Maximum 3 flash sales at once
    hot_deal: 5,        // Maximum 5 hot deals at once  
    seasonal_sale: 2,   // Maximum 2 seasonal sales at once
    clearance: 10,      // Maximum 10 clearance sales at once
    weekend_deal: 3,    // Maximum 3 weekend deals at once
    mega_sale: 1        // Only 1 mega sale at a time
  },
  
  // Total maximum across all types
  TOTAL_MAX_ACTIVE_SALES: 20,
  
  // Maximum products per sale
  MAX_PRODUCTS_PER_SALE: {
    flash_sale: 50,
    hot_deal: 30,
    seasonal_sale: 100,
    clearance: 200,
    weekend_deal: 25,
    mega_sale: 500
  },
  
  // Minimum time between same type sales (in minutes)
  MIN_INTERVAL_BETWEEN_SALES: {
    flash_sale: 60,     // 1 hour gap
    hot_deal: 30,       // 30 minutes gap
    seasonal_sale: 1440, // 24 hours gap
    mega_sale: 10080    // 7 days gap
  }
};

module.exports = SALES_LIMITS;