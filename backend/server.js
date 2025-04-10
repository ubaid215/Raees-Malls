const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const heroImageRoutes = require('./routes/heroImageRoutes');
const errorHandler = require('./middlewares/errorHandler');
const cartRoutes = require('./routes/cartRoutes');
const authRoutes = require('./routes/auth');
const reviewRoutes = require('./routes/reviews');
const connectDB = require('./config/db');

require('dotenv').config();

connectDB();
const app = express();

// Middleware - Ensure express.json() is FIRST
app.use(express.json());  // Add this if missing, or move it here if it’s lower
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use('/uploads', express.static('uploads'));

// Test route
app.post('/test-body', (req, res) => {
  console.log('Test Body:', req.body);
  res.json(req.body);
});

// Routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/hero-images', heroImageRoutes);
app.use('/cart', cartRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);

// Error handler
app.use(errorHandler);

const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});