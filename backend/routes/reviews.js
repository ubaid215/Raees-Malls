const express = require('express');
const { createReview } = require('../controllers/reviewController');
const { protect } = require('../middlewares/auth');

const router = express.Router({ mergeParams: true });

router.post('/:productId', protect, createReview);

module.exports = router;