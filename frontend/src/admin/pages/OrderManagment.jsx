import React, { useState, memo, useCallback, useEffect } from "react";
import { 
  FiDownload, 
  FiCheckCircle, 
  FiTruck, 
  FiClock, 
  FiSearch, 
  FiFilter, 
  FiRefreshCw, 
  FiAlertCircle 
} from "react-icons/fi";
import { toast } from "react-toastify";
import LoadingSkeleton from "../../components/shared/LoadingSkelaton";
import Button from "../../components/core/Button";
import { useOrder } from '../../context/OrderContext';
import { useAdminAuth } from '../../context/AdminAuthContext'; 
import socketService from '../../services/socketService';

const OrderManagement = () => {
  const { orders, pagination, loading, error, fetchAllOrders, updateStatus, downloadOrderInvoice } = useOrder();
  const { admin, isAdminAuthenticated, logoutAdmin, refreshAdminToken } = useAdminAuth();
  
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [newOrderIds, setNewOrderIds] = useState([]);
  
  const pendingOrdersCount = (orders || []).filter(order => order.status === 'pending').length;

  const fetchOrders = useCallback(async (page = 1, limit = pagination?.limit || 10, status = filterStatus, search = '') => {
    try {
      await fetchAllOrders(page, limit, status, search);
    } catch (err) {
      if (err.message?.includes('Invalid or expired token')) {
        try {
          await refreshAdminToken();
          await fetchAllOrders(page, limit, status, search);
        } catch (refreshErr) {
          toast.error('Session expired. Please log in again.');
          await logoutAdmin();
        }
      } else {
        toast.error(err.message || 'Failed to fetch orders');
      }
    }
  }, [fetchAllOrders, refreshAdminToken, logoutAdmin, filterStatus, pagination?.limit]);

  useEffect(() => {
    const setupSocket = () => {
      try {
        if (!socketService.getConnectionState()) {
          socketService.connect(admin?._id, admin?.role);
          console.log("Socket connection established for admin:", admin?._id);
        }
        
        socketService.off('orderCreated');
        socketService.off('orderStatusUpdated');
        socketService.off('reconnect');
        socketService.off('disconnect');

        socketService.on('orderCreated', (newOrder) => {
          console.log("New order received via socket:", newOrder);
          if (!newOrder || !newOrder.orderId) {
            console.error("Invalid order data received:", newOrder);
            return;
          }
          
          setNewOrderIds(prev => [...prev, newOrder.orderId]);
          toast.info(`New Order Received: ${newOrder.orderId}`, {
            position: "top-right",
            autoClose: 5000,
            onClick: () => {
              setFilterStatus('pending');
              fetchOrders(1, pagination?.limit || 10, 'pending');
            }
          });
          
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
          fetchOrders(pagination.page, pagination?.limit || 10, filterStatus);
        });

        socketService.on('reconnect', () => {
          console.log("Socket reconnected");
          toast.success("Reconnected to server");
          fetchOrders(pagination.page, pagination?.limit || 10, filterStatus);
        });

        socketService.on('disconnect', () => {
          console.log("Socket disconnected");
          toast.warning("Lost connection to server. Reconnecting...");
        });
      } catch (err) {
        console.error("Socket setup error:", err);
        toast.error("Failed to setup socket connection");
      }
    };
    
    if (admin) {
      setupSocket();
    }
    
    return () => {
      console.log("Cleaning up socket listeners");
      socketService.off('orderCreated');
      socketService.off('orderStatusUpdated');
      socketService.off('reconnect');
      socketService.off('disconnect');
    };
  }, [fetchOrders, pagination?.limit, pagination?.page, filterStatus, admin]);

  useEffect(() => {
    if (!isAdminAuthenticated || !admin) {
      toast.error('You must be logged in as an admin to access this page.');
      return;
    }

    fetchOrders(1, pagination?.limit || 10, filterStatus);
    
    const pingInterval = setInterval(() => {
      try {
        if (socketService.getConnectionState()) {
          socketService.emit('ping');
        } else {
          console.log("Socket not connected, attempting to reconnect");
          socketService.connect(admin?._id, admin?.role);
        }
      } catch (err) {
        console.error("Socket ping error:", err);
      }
    }, 30000);
    
    return () => {
      clearInterval(pingInterval);
    };
  }, [fetchOrders, isAdminAuthenticated, admin, filterStatus, pagination?.limit]);

  const handleStatusFilter = (status) => {
    setFilterStatus(status);
    fetchOrders(1, pagination?.limit || 10, status);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm) {
      if (searchTerm.includes('@')) {
        fetchOrders(1, pagination?.limit || 10, filterStatus, searchTerm);
      } else if (/^ORD-[A-F0-9]{8}$/i.test(searchTerm)) {
        const filteredOrders = (orders || []).filter(order => 
          order.orderId.toLowerCase() === searchTerm.toLowerCase()
        );
        if (filteredOrders.length === 0) {
          toast.info("No orders found with that ID. Showing all orders.");
          fetchOrders(1, pagination?.limit || 10, filterStatus);
        }
      } else {
        toast.info("Please enter a valid order ID (ORD- followed by 8 characters) or customer email");
      }
    } else {
      fetchOrders(1, pagination?.limit || 10, filterStatus);
    }
  };

  const handleRefreshOrders = () => {
    toast.info("Refreshing orders...");
    fetchOrders(1, pagination?.limit || 10, filterStatus);
  };

  const handleMarkProcessing = async (orderId) => {
    try {
      await updateStatus(orderId, "processing");
      toast.success(`Order ${orderId} marked as processing`);
      setNewOrderIds(prev => prev.filter(id => id !== orderId));
    } catch (error) {
      toast.error(error.message || "Failed to update order status");
    }
  };

  const handleMarkShipped = async (orderId) => {
    try {
      await updateStatus(orderId, "shipped");
      toast.success(`Order ${orderId} marked as shipped`);
    } catch (error) {
      toast.error(error.message || "Failed to update order status");
    }
  };

  const handleMarkDelivered = async (orderId) => {
    try {
      await updateStatus(orderId, "delivered");
      toast.success(`Order ${orderId} marked as delivered`);
    } catch (error) {
      toast.error(error.message || "Failed to update order status");
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await updateStatus(orderId, "cancelled");
      toast.success(`Order ${orderId} has been cancelled`);
    } catch (error) {
      toast.error(error.message || "Failed to cancel order");
    }
  };

  const handleDownloadInvoice = async (orderId) => {
    try {
      await downloadOrderInvoice(orderId);
      toast.success(`Invoice for order ${orderId} downloaded`);
    } catch (error) {
      toast.error(error.message || "Failed to download invoice");
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchOrders(newPage, pagination?.limit || 10, filterStatus);
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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || "bg-gray-100 text-gray-800"}`}>
        {status === "pending" && <FiAlertCircle className="mr-1" />}
        {status === "processing" && <FiClock className="mr-1" />}
        {status === "shipped" && <FiTruck className="mr-1" />}
        {status === "delivered" && <FiCheckCircle className="mr-1" />}
        <span className="capitalize">{status}</span>
      </span>
    );
  };

  if (!isAdminAuthenticated || !admin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-sm w-full text-center">
          <p className="text-red-600 text-sm mb-4">You must be logged in as an admin to access this page.</p>
          <Button
            onClick={() => window.location.href = '/admin/login'}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md text-sm"
          >
            Go to Admin Login
          </Button>
        </div>
      </div>
    );
  }

  if (admin.role !== 'admin' && admin.role !== 'administrator') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-sm w-full text-center">
          <p className="text-red-600 text-sm mb-4">
            Unauthorized access. Your role ({admin.role}) is not permitted to view this page.
          </p>
          <Button
            onClick={() => logoutAdmin()}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md text-sm"
          >
            Logout
          </Button>
        </div>
      </div>
    );
  }

  if (loading && (orders || []).length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <LoadingSkeleton type="text" width="40" height="6" className="mb-2" />
            <LoadingSkeleton type="text" width="60" height="4" />
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {[...Array(6)].map((_, j) => (
                  <LoadingSkeleton key={j} type="text" width="20" height="4" className="mb-2" />
                ))}
              </div>
              {[...Array(2)].map((_, j) => (
                <div key={j} className="flex items-start mb-4 last:mb-0">
                  <LoadingSkeleton type="image" width="16" height="16" className="mr-3" />
                  <div className="flex-1">
                    <LoadingSkeleton type="text" width="40" height="4" className="mb-2" />
                    <LoadingSkeleton type="text" width="30" height="3" className="mb-1" />
                    <LoadingSkeleton type="text" width="20" height="3" />
                  </div>
                </div>
              ))}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
                <LoadingSkeleton type="text" width="24" height="8" />
                <LoadingSkeleton type="text" width="24" height="8" />
                <LoadingSkeleton type="text" width="24" height="8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-sm w-full text-center">
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <Button
            onClick={() => fetchOrders(1, pagination?.limit || 10, filterStatus)}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md text-sm"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Order Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              {pendingOrdersCount > 0 ? (
                <span className="flex items-center">
                  <span className="font-semibold text-yellow-600 mr-1">{pendingOrdersCount}</span> pending orders require your attention
                </span>
              ) : (
                "Manage and track all customer orders"
              )}
            </p>
          </div>
          
          <div className="mt-3 md:mt-0 flex items-center">
            <Button
              onClick={handleRefreshOrders}
              icon={FiRefreshCw}
              className="mr-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-md text-sm"
              disabled={loading}
            >
              Refresh
            </Button>
            {loading && <span className="text-xs text-gray-500 ml-2">Loading...</span>}
          </div>
        </div>
        
        <div className={`mb-3 text-xs px-3 py-1 rounded inline-flex items-center ${socketService.getConnectionState() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <span className={`w-2 h-2 rounded-full mr-2 ${socketService.getConnectionState() ? 'bg-green-500' : 'bg-red-500'}`}></span>
          {socketService.getConnectionState() ? 'Connected to server' : 'Disconnected - Click refresh to reconnect'}
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <form onSubmit={handleSearch} className="flex items-center">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Search by order ID or email"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="ml-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Search
                </Button>
              </form>
            </div>
            
            <div className="flex items-center space-x-1">
              <div className="flex items-center">
                <FiFilter className="mr-2 text-gray-400" />
                <span className="text-sm text-gray-500 mr-2">Filter:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button
                  onClick={() => handleStatusFilter('')}
                  className={`text-xs px-2 py-1 rounded ${filterStatus === '' ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  All
                </Button>
                <Button
                  onClick={() => handleStatusFilter('pending')}
                  className={`text-xs px-2 py-1 rounded ${filterStatus === 'pending' ? 'bg-yellow-200 text-yellow-800' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'}`}
                >
                  Pending
                </Button>
                <Button
                  onClick={() => handleStatusFilter('processing')}
                  className={`text-xs px-2 py-1 rounded ${filterStatus === 'processing' ? 'bg-blue-200 text-blue-800' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                >
                  Processing
                </Button>
                <Button
                  onClick={() => handleStatusFilter('shipped')}
                  className={`text-xs px-2 py-1 rounded ${filterStatus === 'shipped' ? 'bg-purple-200 text-purple-800' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                >
                  Shipped
                </Button>
                <Button
                  onClick={() => handleStatusFilter('delivered')}
                  className={`text-xs px-2 py-1 rounded ${filterStatus === 'delivered' ? 'bg-green-200 text-green-800' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                >
                  Delivered
                </Button>
                <Button
                  onClick={() => handleStatusFilter('cancelled')}
                  className={`text-xs px-2 py-1 rounded ${filterStatus === 'cancelled' ? 'bg-red-200 text-red-800' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                >
                  Cancelled
                </Button>
              </div>
            </div>
          </div>
        </div>

        {(orders || []).length === 0 ? (
          <div className="bg-white shadow-sm rounded-lg p-6 text-center">
            <p className="text-sm text-gray-500">
              {searchTerm ? 
                `No orders found for "${searchTerm}"` : 
                filterStatus ? 
                  `No orders with status "${filterStatus}"` : 
                  "No orders found."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(orders || []).map((order) => {
              const isNewOrder = newOrderIds.includes(order.orderId);
              
              return (
                <div
                  key={order.orderId}
                  className={`bg-white rounded-lg shadow-sm border ${
                    isNewOrder ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-gray-200'
                  } p-4 transition-all ${isNewOrder ? 'animate-pulse' : ''}`}
                >
                  {isNewOrder && (
                    <div className="mb-2 bg-yellow-50 text-yellow-800 px-3 py-1 rounded text-sm flex items-center">
                      <FiAlertCircle className="mr-2" />
                      New order received! Requires your attention.
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-600">Order ID</p>
                      <p className="text-sm font-medium text-gray-900">{order.orderId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Total Amount</p>
                      <p className="text-sm font-medium text-gray-900">{formatPrice(order.totalPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Customer</p>
                      <p className="text-sm font-medium text-gray-900">{order.userId?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{order.userId?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Shipping Address</p>
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">
                        {order.shippingAddress
                          ? `${order.shippingAddress.fullName}, ${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}, ${order.shippingAddress.country}`
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Status</p>
                      <div className="mt-1">
                        {getOrderStatusBadge(order.status)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <p className="text-xs text-gray-600 mb-2">Order Items ({order.items?.length || 0})</p>
                    {(order.items || []).map((item) => (
                      <div key={item._id} className="flex items-start">
                        <img
                          src={item.productId?.image?.url || "/placeholder-product.png"}
                          alt={item.productId?.title || 'Product'}
                          className="w-12 h-12 object-cover rounded-md mr-3 border border-gray-200"
                          onError={(e) => (e.currentTarget.src = "/placeholder-product.png")}
                        />
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {item.productId?.title || 'Untitled Product'}
                            {item.variantId && (
                              <span className="ml-1 text-xs text-gray-500">
                                (Variant: {item.variantValue || item.variantId})
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-gray-600">SKU: {item.sku}</p>
                          <p className="text-xs font-medium text-gray-900 mt-1">
                            {item.quantity} x {formatPrice(item.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    {order.status === 'pending' && (
                      <Button
                        variant="primary"
                        onClick={() => handleMarkProcessing(order.orderId)}
                        icon={FiClock}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-sm py-2"
                      >
                        Start Processing
                      </Button>
                    )}
                    
                    {(order.status === 'pending' || order.status === 'processing') && (
                      <Button
                        variant="primary"
                        onClick={() => handleMarkShipped(order.orderId)}
                        icon={FiTruck}
                        className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white text-sm py-2"
                      >
                        Mark as Shipped
                      </Button>
                    )}
                    
                    {(order.status === 'pending' || order.status === 'processing' || order.status === 'shipped') && (
                      <Button
                        variant="primary"
                        onClick={() => handleMarkDelivered(order.orderId)}
                        icon={FiCheckCircle}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-sm py-2"
                      >
                        Mark as Delivered
                      </Button>
                    )}
                    
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <Button
                        variant="outline"
                        onClick={() => handleCancelOrder(order.orderId)}
                        className="w-full sm:w-auto border-gray-300 text-gray-600 hover:bg-gray-50 text-sm py-2"
                      >
                        Cancel Order
                      </Button>
                    )}
                    
                    <Button
                      variant="primary"
                      onClick={() => handleDownloadInvoice(order.orderId)}
                      icon={FiDownload}
                      className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-sm py-2"
                    >
                      Download Invoice
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(orders || []).length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
            <Button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="w-full sm:w-auto border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md text-sm"
            >
              Previous Page
            </Button>
            <p className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages} 
              ({pagination.total} total orders)
            </p>
            <Button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="w-full sm:w-auto border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md text-sm"
            >
              Next Page
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(OrderManagement);