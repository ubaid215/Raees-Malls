import React, { useState, useEffect, useContext } from 'react';
import { FiUser, FiPackage, FiTruck, FiLogOut } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSkeleton from '../../components/shared/LoadingSkelaton';
import Button from '../../components/core/Button';
import { getUserOrders } from '../../services/OrderAPI';
import axios from 'axios';

const Profile = () => {
  const { user, logoutUser, setUser } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, totalPages: 1 });
  const navigate = useNavigate();

  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        withCredentials: true,
      });
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (err) {
      toast.error('Failed to fetch user data');
    }
  };

  const fetchOrders = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setFetchError('Please log in to view orders');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await getUserOrders({ page: pagination.page, limit: pagination.limit });
      if (response.data.success) {
        setOrders(response.data.orders || []);
        setPagination({
          page: response.data.page,
          limit: response.data.limit,
          totalPages: response.data.totalPages,
        });
        setFetchError(null);
      } else {
        throw new Error(response.data.message || 'Failed to fetch orders');
      }
    } catch (err) {
      setFetchError(err.message || 'Failed to fetch orders');
      toast.error(err.message || 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchOrders();
    } else {
      setIsLoading(false);
    }
  }, [user, pagination.page]);

  const handleLogout = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/auth/logout`,
        { refreshToken: localStorage.getItem('refreshToken') },
        { withCredentials: true }
      );
      logoutUser();
      navigate('/login');
    } catch (err) {
      toast.error('Failed to log out');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center max-w-md w-full">
          <p className="text-red-600 text-lg font-medium">Please log in to view your profile</p>
          <Button
            onClick={() => navigate('/login')}
            className="mt-4 w-full bg-red-600 text-white hover:bg-red-700"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <LoadingSkeleton type="text" width="64" height="8" className="mb-2" />
            <LoadingSkeleton type="text" width="32" height="6" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <LoadingSkeleton type="text" width="48" height="6" className="mb-4" />
              <LoadingSkeleton type="text" width="80" height="5" className="mb-2" />
              <LoadingSkeleton type="text" width="80" height="5" />
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 md:col-span-2">
              <LoadingSkeleton type="text" width="48" height="6" className="mb-4" />
              <LoadingSkeleton type="text" width="full" height="10" />
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 md:col-span-3">
              <LoadingSkeleton type="text" width="48" height="6" className="mb-4" />
              <LoadingSkeleton type="text" width="full" height="20" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center max-w-md w-full">
          <p className="text-red-600 text-lg font-medium">{fetchError}</p>
          <Button
            onClick={() => {
              setFetchError(null);
              fetchOrders();
            }}
            className="mt-4 w-full bg-red-600 text-white hover:bg-red-700"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Profile</h1>
          <Button
            onClick={handleLogout}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700"
          >
            <FiLogOut />
            <span>Logout</span>
          </Button>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Info Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <FiUser className="text-red-600 text-xl sm:text-2xl" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Personal Information</h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base">
              <div>
                <p className="text-gray-600">Full Name</p>
                <p className="font-medium text-gray-900">{user.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Email Address</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
              <div>
                <p className="text-gray-600">Addresses</p>
                {user.addresses?.length > 0 ? (
                  user.addresses.map((addr, index) => (
                    <p key={index} className="font-medium text-gray-900">
                      {`${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}, ${addr.country}`}
                    </p>
                  ))
                ) : (
                  <p className="text-gray-600">No addresses saved</p>
                )}
              </div>
              <Button
                onClick={() => navigate('/profile/edit')}
                className="w-full bg-red-600 text-white hover:bg-red-700"
              >
                Edit Profile
              </Button>
            </div>
          </div>

          {/* Order Summary Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:col-span-2">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <FiPackage className="text-red-600 text-xl sm:text-2xl" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Order Summary</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 text-sm sm:text-base text-gray-600 font-medium border-b pb-2">
                <p>Order ID</p>
                <p className="text-center">Date</p>
                <p className="text-right">Total</p>
              </div>
              {orders.length === 0 ? (
                <p className="text-gray-600">No orders found</p>
              ) : (
                orders.map((order) => (
                  <div key={order.orderId} className="grid grid-cols-3 border-b py-2 text-sm sm:text-base">
                    <p className="font-medium text-red-600 hover:underline cursor-pointer" onClick={() => navigate(`/order/${order.orderId}`)}>
                      {order.orderId}
                    </p>
                    <p className="text-center text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</p>
                    <p className="text-right font-semibold text-gray-900">PKR {order.totalPrice.toFixed(2)}</p>
                  </div>
                ))
              )}
              <Button
                onClick={() => navigate('/orders')}
                className="w-full border border-red-600 text-red-600 hover:bg-red-50"
              >
                View All Orders
              </Button>
            </div>
          </div>

          {/* Current Orders Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:col-span-3">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-red-100 p-3 rounded-full">
                <FiTruck className="text-red-600 text-xl sm:text-2xl" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Current Orders</h2>
            </div>
            <div className="space-y-6">
              {orders.length === 0 ? (
                <p className="text-gray-600 text-sm sm:text-base">No current orders</p>
              ) : (
                orders
                  .filter((order) => order.status !== 'delivered' && order.status !== 'cancelled')
                  .map((order) => (
                    <div key={order.orderId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                        <div>
                          <p className="font-medium text-gray-900">Order {order.orderId}</p>
                          <p className="text-sm text-gray-600">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                            order.status === 'shipped'
                              ? 'bg-blue-100 text-blue-800'
                              : order.status === 'processing'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 font-medium mb-2">Items:</p>
                        <ul className="space-y-2 text-sm sm:text-base">
                          {order.items.map((item, index) => (
                            <li key={index} className="flex justify-between">
                              <span className="text-gray-700">
                                {item.quantity} × {item.productId.title}
                              </span>
                              <span className="text-gray-900 font-medium">PKR {item.price.toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t pt-4">
                        <div>
                          <p className="text-sm text-gray-600">Tracking Number</p>
                          <p className="font-medium text-gray-900">{order.trackingNumber || 'N/A'}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                          <Button
                            onClick={() => window.open(`https://tracking.example.com/${order.trackingNumber || ''}`, '_blank')}
                            className="w-full sm:w-auto border border-red-600 text-red-600 hover:bg-red-50"
                            disabled={!order.trackingNumber}
                          >
                            Track Order
                          </Button>
                          <Button
                            onClick={() => navigate(`/order/${order.orderId}`)}
                            className="w-full sm:w-auto bg-red-600 text-white hover:bg-red-700"
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
            {orders.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                <Button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="w-full sm:w-auto border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Previous
                </Button>
                <p className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <Button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="w-full sm:w-auto border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;