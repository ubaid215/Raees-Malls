const express = require('express');
const router = express.Router();
const {
  registerAdmin,
  loginAdmin,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getDashboardStats
} = require('../controllers/adminController');

// Admin registration (development only)
router.post('/register', registerAdmin);

// Admin login
router.post('/login', loginAdmin);

// Protected admin routes
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/stats', getDashboardStats);

module.exports = router;