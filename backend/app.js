const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const errorHandler = require('./middlewares/errorMiddleware');
const connectDB = require('./config/db');
const path = require('path');

// Load env vars
require('dotenv').config();

// Connect to database
connectDB();

// Route files
const products = require('./routes/productRoutes');
const auth = require('./routes/authRoutes');

const app = express();

// Body parser
app.use(express.json());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Enable CORS
app.use(cors());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount routers
app.use('/api/v1/products', products);
app.use('/api/v1/auth', auth);

// Error handler middleware
app.use(errorHandler);

module.exports = app;