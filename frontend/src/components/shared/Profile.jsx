import React, { useEffect, useState } from 'react';
import { FiUser, FiPackage, FiTruck, FiLogOut, FiAlertCircle, FiClock, FiCheckCircle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOrder } from '../../context/OrderContext';
import { toast } from 'react-toastify';
import LoadingSkeleton from '../../components/shared/LoadingSkelaton';
import Button from '../../components/core/Button';
import socketService from '../../services/socketService';

const Profile = () => {
  const { user, logoutUser, fetchUser, needsFetch, error: authError } = useAuth();
  const { orders, pagination, loading: orderLoading, error: orderError, fetchUserOrders } = useOrder();
  const [isLoading, setIsLoading] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState([]);
  const navigate = useNavigate();

  const handleFetchUser = async () => {
    setIsLoading(true);
    try {
      await fetchUser();
    } catch (err) {
      console.error('fetchUser error:', err);
      const errorMessage = err.message || 'Failed to fetch user data';
      if (err.message.includes('Too many requests')) {
        toast.error(errorMessage);
      } else if (err.response?.status === 401 || err.response?.status === 404) {
        toast.error('Session expired. Please log in again.');
        logoutUser();
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userId');
        navigate('/login');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserOrders(pagination.page);
      
      const setupSocket = () => {
        try {
          if (!socketService.getConnectionState()) {
            socketService.connect(user._id, user.role);
            console.log("Socket connection established for user:", user._id);
          }

          socketService.off('orderCreated');
          socketService.off('orderStatusUpdated');
          socketService.off('disconnect');
          socketService.off('reconnect');

          socketService.on('orderCreated', (newOrder) => {
            console.log("New order received via socket:", newOrder);
            if (!newOrder || !newOrder.orderId) {
              console.error("Invalid order data received:", newOrder);
              return;
            }
            
            setNewOrderIds(prev => [...prev, newOrder.orderId]);
            toast.info(`New Order Placed: ${newOrder.orderId}`, {
              position: "top-right",
              autoClose: 5000,
            });
            fetchUserOrders(pagination.page);
            
            setTimeout(() => {
              setNewOrderIds(prev => prev.filter(id => id !== newOrder.orderId));
            }, 30000);
          });

          socketService.on('orderStatusUpdated', (updatedOrder) => {
            console.log("Order status updated via socket:", updatedOrder);
            if (!updatedOrder || !updatedOrder.orderId) {
              console.error("Invalid order data received:", updatedOrder);
              return;
            }
            toast.info(`Order ${updatedOrder.orderId} status updated to ${updatedOrder.status}`);
            fetchUserOrders(pagination.page);
          });

          socketService.on('disconnect', () => {
            console.log("Socket disconnected");
            toast.warning("Lost connection to server. Reconnecting...");
          });

          socketService.on('reconnect', () => {
            console.log("Socket reconnected");
            toast.success("Reconnected to server");
            fetchUserOrders(pagination.page);
          });
        } catch (err) {
          console.error("Socket setup error:", err);
          toast.error("Failed to setup socket connection");
        }
      };

      setupSocket();

      return () => {
        console.log("Cleaning up socket listeners");
        socketService.off('orderCreated');
        socketService.off('orderStatusUpdated');
        socketService.off('disconnect');
        socketService.off('reconnect');
      };
    }
  }, [user, fetchUserOrders, pagination.page]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      socketService.disconnect();
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Failed to log out');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchUserOrders(newPage);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getOrderStatusBadge = (status) => {
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-medium ${statusStyles[status] || "bg-gray-100 text-gray-800"}`}>
        {status === "pending" && <FiAlertCircle className="mr-1" />}
        {status === "processing" && <FiClock className="mr-1" />}
        {status === "shipped" && <FiTruck className="mr-1" />}
        {status === "delivered" && <FiCheckCircle className="mr-1" />}
        <span className="capitalize">{status}</span>
      </span>
    );
  };

  if (!user && !isLoading && (needsFetch || authError)) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center max-w-md w-full">
          {authError && <p className="text-red-600 text-lg font-medium mb-4">{authError}</p>}
          <Button
            onClick={handleFetchUser}
            className="w-full bg-red-600 text-white hover:bg-red-700 mb-4"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : authError ? 'Retry Now' : 'Load Profile'}
          </Button>
          <Button
            onClick={() => navigate('/login')}
            className="w-full bg-gray-600 text-white hover:bg-gray-700"
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

  // Debug user and orders
  console.log('User object:', user);
  console.log('Orders:', orders);

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

        <div className={`mb-3 text-xs px-3 py-1 rounded inline-flex items-center ${socketService.getConnectionState() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <span className={`w-2 h-2 rounded-full mr-2 ${socketService.getConnectionState() ? 'bg-green-500' : 'bg-red-500'}`}></span>
          {socketService.getConnectionState() ? 'Connected to server' : 'Disconnected - Reconnecting...'}
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
                <p className="text-gray-600">Role</p>
                <p className="font-medium text-gray-900 capitalize">{user.role || 'User'}</p>
              </div>
              <div>
                <p className="text-gray-600">Addresses</p>
                {Array.isArray(user.addresses) && user.addresses.length > 0 ? (
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
            {orderLoading ? (
              <div className="space-y-4">
                <LoadingSkeleton type="text" width="full" height="10" />
                <LoadingSkeleton type="text" width="full" height="10" />
              </div>
            ) : orderError ? (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600">{orderError}</p>
                <Button
                  onClick={() => fetchUserOrders(pagination.page)}
                  className="mt-2 bg-red-600 text-white hover:bg-red-700"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 text-sm sm:text-base text-gray-600 font-medium border-b pb-2">
                  <p>Order ID</p>
                  <p className="text-center">Date</p>
                  <p className="text-right">Total</p>
                </div>
                {(orders || []).length === 0 ? (
                  <p className="text-gray-600">No orders found</p>
                ) : (
                  orders.map((order) => (
                    <div key={order.orderId} className="grid grid-cols-3 border-b py-2 text-sm sm:text-base">
                      <p className="font-medium text-red-600 hover:underline cursor-pointer" onClick={() => navigate(`/order/${order.orderId}`)}>
                        {order.orderId}
                      </p>
                      <p className="text-center text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</p>
                      <p className="text-right font-semibold text-gray-900">{formatPrice(order.totalPrice)}</p>
                    </div>
                  ))
                )}
                <Button
                  onClick={() => navigate('/orders')}
                  className="w-full border border-red-600 text-red-600 hover:bg-red-50"
                  disabled={orderError}
                >
                  View All Orders
                </Button>
              </div>
            )}
          </div>

          {/* Current Orders Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:col-span-3">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-red-100 p-3 rounded-full">
                <FiTruck className="text-red-600 text-xl sm:text-2xl" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Current Orders</h2>
            </div>
            {orderLoading ? (
              <div className="space-y-6">
                <LoadingSkeleton type="text" width="full" height="20" />
                <LoadingSkeleton type="text" width="full" height="20" />
              </div>
            ) : orderError ? (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600">{orderError}</p>
                <Button
                  onClick={() => fetchUserOrders(pagination.page)}
                  className="mt-2 bg-red-600 text-white hover:bg-red-700"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {(orders || []).length === 0 ? (
                  <p className="text-gray-600 text-sm sm:text-base">No current orders</p>
                ) : (
                  orders
                    .filter((order) => order.status !== 'delivered' && order.status !== 'cancelled')
                    .map((order) => {
                      const isNewOrder = newOrderIds.includes(order.orderId);
                      return (
                        <div key={order.orderId} className={`border rounded-lg p-4 ${isNewOrder ? 'border-yellow-400 ring-2 ring-yellow-200 animate-pulse' : 'border-gray-200'}`}>
                          {isNewOrder && (
                            <div className="mb-2 bg-yellow-50 text-yellow-800 px-3 py-1 rounded text-sm flex items-center">
                              <FiAlertCircle className="mr-2" />
                              New order placed!
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                            <div>
                              <p className="font-medium text-gray-900">Order {order.orderId}</p>
                              <p className="text-sm text-gray-600">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                            </div>
                            {getOrderStatusBadge(order.status)}
                          </div>
                          <div className="mb-4">
                            <p className="text-sm text-gray-600 font-medium mb-2">Items:</p>
                            <ul className="space-y-2 text-sm sm:text-base">
                              {order.items.map((item, index) => (
                                <li key={index} className="flex justify-between">
                                  <span className="text-gray-700">
                                    {item.quantity} × {item.productId?.title || 'Untitled Product'}
                                    {item.variantId && (
                                      <span className="ml-1 text-xs text-gray-500">
                                        (Variant: {item.variantValue || item.variantId})
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-gray-900 font-medium">{formatPrice(item.price)}</span>
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
                      );
                    })
                )}
              </div>
            )}
            {!orderError && (orders || []).length > 0 && (
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