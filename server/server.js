require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const { authLimiter} = require('./middleware/rateLimiter');
const http = require('http');
const { Server } = require('socket.io');

// Import models for sitemap
const Product = require('./models/Product'); 
const Category = require('./models/Category'); 

// Initialize Express app
const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Environment Configuration
const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = isProduction ? process.env.FRONTEND_PROD_URL : process.env.FRONTEND_DEV_URL;
const backendUrl = isProduction ? process.env.BACKEND_PROD_URL : process.env.BACKEND_DEV_URL;

// Log environment details for debugging
console.log(`
=== Environment Configuration ===
NODE_ENV: ${process.env.NODE_ENV}
Frontend URL: ${frontendUrl}
Backend URL: ${backendUrl}
`);

// Security middleware
app.use(helmet());

// Custom sanitize middleware (avoids modifying req.query directly)
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  if (req.headers) mongoSanitize.sanitize(req.headers);
  next();
});

// Connect to MongoDB
connectDB();

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_PROD_URL,
      process.env.FRONTEND_DEV_URL,
      'https://raeesmalls.com',
      'https://www.raeesmalls.com',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));  
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
};

// Comment it when update on live site
app.use(cors(corsOptions));

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Dynamic cookie domain based on environment
let cookieDomain;
if (isProduction) {
  // Extract domain from FRONTEND_PROD_URL
  try {
    const url = new URL(process.env.FRONTEND_PROD_URL);
    cookieDomain = url.hostname.startsWith('www.') 
      ? url.hostname.substring(4) 
      : url.hostname;
  } catch (e) {
    cookieDomain = '.raeesmalls.com'; // Fallback
    console.warn('Failed to parse FRONTEND_PROD_URL for cookie domain:', e.message);
  }
}

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions'
  }),
  cookie: { 
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    domain: cookieDomain
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_PROD_URL,
      process.env.FRONTEND_DEV_URL,
      'https://raeesmalls.com',
      'https://www.raeesmalls.com',
      'http://localhost:5173'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.set('socketio', io);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  if (socket.handshake.query.userId) {
    socket.join(`user_${socket.handshake.query.userId}`);
  }

  if (socket.handshake.query.role === 'admin') {
    socket.join('adminRoom');
  }

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ========================================
// XML SITEMAP ROUTE - ADD THIS SECTION
// ========================================
app.get('/sitemap.xml', async (req, res) => {
  try {
    // Fetch all products and categories from MongoDB
    const products = await Product.find({}).select('_id updatedAt createdAt');
    const categories = await Category.find({}).select('slug updatedAt');
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Static pages with priorities
    const staticPages = [
      { url: 'https://www.raeesmalls.com/', priority: '1.0', changefreq: 'daily' },
      { url: 'https://www.raeesmalls.com/products', priority: '0.9', changefreq: 'daily' },
      { url: 'https://www.raeesmalls.com/all-categories', priority: '0.8', changefreq: 'weekly' },
      { url: 'https://www.raeesmalls.com/about', priority: '0.5', changefreq: 'monthly' },
      { url: 'https://www.raeesmalls.com/contact', priority: '0.5', changefreq: 'monthly' },
      { url: 'https://www.raeesmalls.com/return-policy', priority: '0.3', changefreq: 'yearly' },
      { url: 'https://www.raeesmalls.com/privacy-policy', priority: '0.3', changefreq: 'yearly' }
    ];

    staticPages.forEach(page => {
      sitemap += `
  <url>
    <loc>${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    });

    // Add individual product pages using _id
    products.forEach(product => {
      const lastmod = product.updatedAt || product.createdAt;
      sitemap += `
  <url>
    <loc>https://www.raeesmalls.com/product/${product._id}</loc>
    <lastmod>${lastmod.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    // Add category filter pages using slug
    categories.forEach(category => {
      sitemap += `
  <url>
    <loc>https://www.raeesmalls.com/products?category=${category.slug}</loc>
    <lastmod>${category.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    sitemap += `
</urlset>`;
    
    res.set('Content-Type', 'text/xml');
    res.send(sitemap);
    
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminAuthRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const discountRoutes = require('./routes/discountRoutes');
const salesRoutes = require('./routes/salesRoutes');

// Apply rate limiting only where needed
app.use('/api/auth', authLimiter); // Only rate limit auth routes
app.use('/api/admin', authLimiter); // Rate limit admin auth routes

// Routes - now without global rate limiting interference
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/products', productRoutes);
app.use('/api/admin/categories', categoryRoutes); 
app.use('/api/admin/banners', bannerRoutes);
app.use('/api/admin/discounts', discountRoutes);
app.use('/api/products', productRoutes);  // No rate limiting - browsing should be fast
app.use('/api/categories', categoryRoutes); // No rate limiting
app.use('/api/orders', orderRoutes); // No rate limiting - orders are authenticated
app.use('/api/cart', cartRoutes); // Uses cartLimiter applied above
app.use('/api/reviews', reviewRoutes); // No rate limiting
app.use('/api/banners', bannerRoutes); // No rate limiting
app.use('/api/wishlist', wishlistRoutes); // No rate limiting
app.use('/api/discounts', discountRoutes); // No rate limiting
app.use('/api/sales', salesRoutes); // No rate limiting

// Environment check endpoint
app.get('/environment', (req, res) => {
  res.status(200).json({
    nodeEnv: process.env.NODE_ENV,
    frontendUrl,
    backendUrl,
    isProduction,
    timestamp: new Date()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    body: JSON.stringify(req.body, null, 2),
  });

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((el) => el.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token error',
      error: err.message,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate value for ${field}`,
      errors: [],
    });
  }

  res.status(500).json({
    success: false,
    message: 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
  ==========================================
  Server running in ${process.env.NODE_ENV} mode
  Port: ${PORT}
  Frontend URL: ${frontendUrl}
  Backend URL: ${backendUrl}
  ==========================================
  `);
});

module.exports = app;