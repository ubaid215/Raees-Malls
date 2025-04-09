
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
  
    // Multer error handling
    if (err.name === 'MulterError') {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
  
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
  
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  };
  
  module.exports = errorHandler;