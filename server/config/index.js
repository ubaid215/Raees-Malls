module.exports = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 5000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/Raees_Mobiles',
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'your_access_secret',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret',
    JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION || '15m',
    JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION || '7d',
    SESSION_SECRET: process.env.SESSION_SECRET || 'your_session_secret',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000, // 15 minutes
    AUTH_RATE_LIMIT: process.env.AUTH_RATE_LIMIT || 5, // 5 attempts
    API_RATE_LIMIT: process.env.API_RATE_LIMIT || 100 // 100 requests
  };