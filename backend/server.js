const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors'); // Add CORS package
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const heroImageRoutes = require('./routes/heroImageRoutes');
const errorHandler = require('./middlewares/errorHandler');
const connectDB = require('./config/db');

require('dotenv').config();

connectDB();
const app = express();

// Configure CORS
app.use(cors({
  origin: 'http://localhost:5173', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true 
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/hero-images', heroImageRoutes);

// Error handler
app.use(errorHandler);

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});