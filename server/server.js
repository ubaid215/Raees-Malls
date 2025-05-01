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
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');
const http = require('http');
const { Server } = require('socket.io');

// Initialize Express app
const app = express();
const server = http.createServer(app);

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
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    domain: process.env.NODE_ENV === 'production' ? '.raeesmalls.com' : undefined
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);

// Rate limiting
app.use('/api', apiLimiter);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_PROD_URL,
      process.env.FRONTEND_DEV_URL
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

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/products', productRoutes);
app.use('/api/admin/categories', categoryRoutes); 
app.use('/api/admin/banners', bannerRoutes);
app.use('/api/admin/discounts', discountRoutes);
app.use('/api/products', productRoutes); 
app.use('/api/categories', categoryRoutes); 
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reviews', reviewRoutes); 
app.use('/api/banners', bannerRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/discounts', discountRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(el => el.message);
    return res.status(400).json({ 
      success: false, 
      message: 'Validation error', 
      errors 
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      success: false, 
      message: 'Token error', 
      error: err.message 
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ 
      success: false, 
      message: `Duplicate value for ${field}`,
      errors: []
    });
  }

  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
  Server running in ${process.env.NODE_ENV} mode
  Port: ${PORT}
  CORS Origins: ${process.env.FRONTEND_PROD_URL}, ${process.env.FRONTEND_DEV_URL}
  `);
});

module.exports = app;
