const Cart = require('../models/Cart');

/**
 * Add or update product in cart
 */
const addToCart = async (req, res) => {
    try {
      const userId = req.user?.id || 'test-user-id'; // Default userId for testing
      const { productId, title, price, image, quantity = 1, variant } = req.body;
  
      let cart = await Cart.findOne({ userId });
  
      if (!cart) {
        cart = new Cart({
          userId,
          items: [{ productId, title, price, image, quantity, variant }]
        });
      } else {
        const itemIndex = cart.items.findIndex(item => 
          item.productId.toString() === productId && 
          (!variant || item.variant === variant)
        );
  
        if (itemIndex > -1) {
          cart.items[itemIndex].quantity += quantity;
        } else {
          cart.items.push({ productId, title, price, image, quantity, variant });
        }
      }
  
      await cart.save();
      res.status(200).json({ message: 'Item added to cart', cart });
    } catch (error) {
      res.status(500).json({ message: 'Failed to add to cart', error: error.message });
    }
  };

/**
 * Get user's cart
 */
const getCart = async (req, res) => {
  try {
    const { userId } = req.params;
    const cart = await Cart.findOne({ userId })
      .populate('items.productId', 'title price image');

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch cart', error: error.message });
  }
};

/**
 * Update cart item quantity or variant
 */
const updateCartItem = async (req, res) => {
  try {
    const { userId } = req.user;
    const { productId, quantity, variant } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => 
      item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    if (quantity !== undefined) {
      cart.items[itemIndex].quantity = Math.max(1, quantity);
    }
    if (variant !== undefined) {
      cart.items[itemIndex].variant = variant;
    }

    await cart.save();
    res.status(200).json({ message: 'Cart updated', cart });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update cart', error: error.message });
  }
};

/**
 * Remove item from cart
 */
const removeFromCart = async (req, res) => {
  try {
    const { userId } = req.user;
    const { productId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => 
      item.productId.toString() !== productId
    );

    await cart.save();
    res.status(200).json({ message: 'Item removed from cart', cart });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove item', error: error.message });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart
};