const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err);
  }

  // Send JSON response for API errors
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = { errorHandler };