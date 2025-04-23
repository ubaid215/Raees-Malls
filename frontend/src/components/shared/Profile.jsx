import React, { useState, useEffect } from 'react';
import { FiUser, FiPackage, FiTruck, FiLogOut } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useCartWishlist } from '../../context/CartWishlistContext';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, token, logout } = useAuth();
  const { loading, error, clearError } = useCartWishlist();
  const [orders, setOrders] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login page after logout
  };

  useEffect(() => {
    const fetchOrders = async () => {
      if (!token) {
        setFetchError('Please log in to view orders');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await axios.get('http://localhost:5000/api/orders', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(response.data || []);
        setFetchError(null);
      } catch (err) {
        setFetchError(err.response?.data?.message || 'Failed to fetch orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [token]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <p className="text-red-600 text-lg font-medium">Please log in to view your profile</p>
          <a href="/login" className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (isLoading || loading.fetch) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600 text-lg font-medium">Loading...</div>
      </div>
    );
  }

  if (error || fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <p className="text-red-600 text-lg font-medium">{error || fetchError}</p>
          <button
            onClick={clearError}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200"
          >
            Clear Error
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-red-600">My Profile</h1>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200"
          >
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Info Card */}
          <div className="bg-white rounded-xl shadow-md p-6 col-span-1 row-span-1">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <FiUser className="text-red-600 text-2xl" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Personal Information</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="text-lg font-medium text-gray-800">{user.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="text-lg font-medium text-gray-800">{user.email}</p>
              </div>
              <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200">
                Edit Profile
              </button>
            </div>
          </div>

          {/* Order Summary Card */}
          <div className="bg-white rounded-xl shadow-md p-6 col-span-1 md:col-span-2">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <FiPackage className="text-red-600 text-2xl" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Order Summary</h2>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-3 text-sm text-gray-500 font-medium border-b pb-2">
                <p>Order ID</p>
                <p className="text-center">Date</p>
                <p className="text-right">Total</p>
              </div>
              {orders.length === 0 ? (
                <p className="text-gray-600">No orders found</p>
              ) : (
                orders.map((order) => (
                  <div key={order.orderId} className="grid grid-cols-3 border-b pb-4">
                    <p className="font-medium text-red-600">{order.orderId}</p>
                    <p className="text-center text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</p>
                    <p className="text-right font-semibold">${order.total.toFixed(2)}</p>
                  </div>
                ))
              )}
              <button className="w-full mt-4 px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition duration-200">
                View All Orders
              </button>
            </div>
          </div>

          {/* Current Orders Card */}
          <div className="bg-white rounded-xl shadow-md p-6 col-span-1 md:col-span-3">
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-red-100 p-3 rounded-full">
                <FiTruck className="text-red-600 text-2xl" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Current Orders</h2>
            </div>
            <div className="space-y-6">
              {orders.length === 0 ? (
                <p className="text-gray-600">No current orders</p>
              ) : (
                orders.map((order) => (
                  <div key={order.orderId} className="border rounded-lg p-4 hover:shadow-md transition duration-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-medium text-gray-800">Order {order.orderId}</p>
                        <p className="text-sm text-gray-500">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        order.status === 'Delivered' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-2">Items:</p>
                      <ul className="space-y-2">
                        {order.items.map((item, index) => (
                          <li key={index} className="flex justify-between">
                            <span className="text-gray-700">
                              {item.quantity} × {item.productId.title}
                            </span>
                            <span className="text-gray-800 font-medium">${item.productId.price.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex justify-between items-center border-t pt-4">
                      <div>
                        <p className="text-sm text-gray-500">Tracking Number</p>
                        <p className="font-medium">{order.trackingNumber || 'N/A'}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-1 text-sm border border-red-600 text-red-600 rounded hover:bg-red-50 transition duration-200">
                          Track Order
                        </button>
                        <button className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition duration-200">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;