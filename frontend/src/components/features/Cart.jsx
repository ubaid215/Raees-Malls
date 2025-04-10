// 📁 src/components/features/Cart.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../core/Button';

const Cart = ({ cartItems = [], onQuantityChange, onRemoveItem }) => {
  // Safely calculate totals with default empty array
  const safeCartItems = Array.isArray(cartItems) ? cartItems : [];
  
  const subtotal = safeCartItems.reduce((sum, item) => sum + (item?.price || 0) * (item?.quantity || 0), 0);
  const tax = subtotal * 0.1; // Example 10% tax
  const shipping = subtotal > 0 ? 10 : 0; // $10 shipping if items exist
  const total = subtotal + tax + shipping;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cart Items */}
        <div className="lg:w-2/3">
          {safeCartItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Your cart is empty</p>
              <Link to="/products">
                <Button variant="primary">Continue Shopping</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {safeCartItems.map((item) => (
                <div key={item?.id} className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-200">
                  {/* Product Image */}
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item?.image && (
                      <img 
                        src={item.image} 
                        alt={item?.name || 'Product'} 
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">{item?.name || 'Unnamed Product'}</h2>
                        <p className="text-sm text-gray-600">{item?.variant || ''}</p>
                      </div>
                      <button 
                        onClick={() => item?.id && onRemoveItem?.(item.id)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center border border-gray-300 rounded">
                          <button 
                            onClick={() => item?.id && onQuantityChange?.(item.id, (item?.quantity || 0) - 1)}
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                            disabled={(item?.quantity || 0) <= 1}
                          >
                            -
                          </button>
                          <span className="px-3 py-1">{item?.quantity || 0}</span>
                          <button 
                            onClick={() => item?.id && onQuantityChange?.(item.id, (item?.quantity || 0) + 1)}
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-gray-900 font-medium">
                          ${(item?.price || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-lg font-semibold">
                        ${((item?.price || 0) * (item?.quantity || 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Order Summary - Only show if items exist */}
        {safeCartItems.length > 0 && (
          <div className="lg:w-1/3">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">${shipping.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              
              <Button variant="primary" className="w-full mb-4">
                Confirm Payment
              </Button>
              
              <Link to="/products" className="block text-center text-blue-600 hover:text-blue-800">
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Default props for safety
Cart.defaultProps = {
  cartItems: [],
  onQuantityChange: () => {},
  onRemoveItem: () => {}
};

export default Cart;