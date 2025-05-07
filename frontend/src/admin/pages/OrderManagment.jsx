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
  
  const pendingOrdersCount = (orders || []).filter(order => order && order.status === 'pending').length;

  const fetchOrders = useCallback(async (page = 1, limit = pagination?.limit || 10, status = filterStatus, search = '') => {
    try {
      console.log('OrderManagement: Fetching orders for page:', page, 'limit:', limit, 'status:', status, 'search:', search);
      await fetchAllOrders(page, limit, status, search);
    } catch (err) {
      console.error('OrderManagement: fetchOrders error:', err);
      if (err.message?.includes('Invalid or expired token')) {
        try {
          console.log('OrderManagement: Refreshing admin token');
          await refreshAdminToken();
          await fetchAllOrders(page, limit, status, search);
        } catch (refreshErr) {
          console.error('OrderManagement: Token refresh failed:', refreshErr);
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
          console.log("OrderManagement: Socket connection established for admin:", admin?._id);
        }
        
        socketService.off('orderCreated');
        socketService.off('orderStatusUpdated');
        socketService.off('reconnect');
        socketService.off('disconnect');

        socketService.on('orderCreated', (newOrder) => {
          console.log("OrderManagement: New order received via socket:", newOrder);
          if (!newOrder || !newOrder.orderId) {
            console.error("OrderManagement: Invalid order data received:", newOrder);
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
          console.log("OrderManagement: Order status updated via socket:", updatedOrder);
          if (!updatedOrder || !updatedOrder.orderId) {
            console.error("OrderManagement: Invalid order data received:", updatedOrder);
            return;
          }
          toast.info(`Order ${updatedOrder.orderId} status updated to ${updatedOrder.status}`);
          fetchOrders(pagination.page, pagination?.limit || 10, filterStatus);
        });

        socketService.on('reconnect', () => {
          console.log("OrderManagement: Socket reconnected");
          toast.success("Reconnected to server");
          fetchOrders(pagination.page, pagination?.limit || 10, filterStatus);
        });

        socketService.on('disconnect', () => {
          console.log("OrderManagement: Socket disconnected");
          toast.warning("Lost connection to server. Reconnecting...");
        });
      } catch (err) {
        console.error("OrderManagement: Socket setup error:", err);
        toast.error("Failed to setup socket connection");
      }
    };
    
    if (admin) {
      setupSocket();
    }
    
    return () => {
      console.log("OrderManagement: Cleaning up socket listeners");
      socketService.off('orderCreated');
      socketService.off('orderStatusUpdated');
      socketService.off('reconnect');
      socketService.off('disconnect');
    };
  }, [fetchOrders, pagination?.limit, pagination?.page, filterStatus, admin]);

  useEffect(() => {
    if (!isAdminAuthenticated || !admin) {
      console.log('OrderManagement: Not authenticated or no admin');
      toast.error('You must be logged in as an admin to access this page.');
      return;
    }

    console.log('OrderManagement: Fetching orders on mount for admin:', admin._id);
    fetchOrders(1, pagination?.limit || 10, filterStatus);
    
    const pingInterval = setInterval(() => {
      try {
        if (socketService.getConnectionState()) {
          socketService.emit('ping');
        } else {
          console.log("OrderManagement: Socket not connected, attempting to reconnect");
          socketService.connect(admin?._id, admin?.role);
        }
      } catch (err) {
        console.error("OrderManagement: Socket ping error:", err);
      }
    }, 30000);
    
    return () => {
      clearInterval(pingInterval);
    };
  }, [fetchOrders, isAdminAuthenticated, admin, filterStatus, pagination?.limit]);

  const handleStatusFilter = (status) => {
    console.log('OrderManagement: Setting filter status:', status);
    setFilterStatus(status);
    fetchOrders(1, pagination?.limit || 10, status);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    console.log('OrderManagement: Handling search with term:', searchTerm);
    if (searchTerm) {
      if (searchTerm.includes('@')) {
        try {
          await fetchOrders(1, pagination?.limit || 10, filterStatus, searchTerm);
        } catch (err) {
          toast.error('No orders found for this email');
          fetchOrders(1, pagination?.limit || 10, filterStatus);
        }
      } else if (/^ORD-[A-F0-9]{8}$/i.test(searchTerm)) {
        const filteredOrders = (orders || []).filter(order => 
          order && order.orderId && order.orderId.toLowerCase() === searchTerm.toLowerCase()
        );
        if (filteredOrders.length > 0) {
          console.log('OrderManagement: Found orders by ID:', filteredOrders);
          setOrders(filteredOrders);
        } else {
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
    console.log('OrderManagement: Refreshing orders');
    toast.info("Refreshing orders...");
    fetchOrders(1, pagination?.limit || 10, filterStatus);
  };

  const handleMarkProcessing = async (orderId) => {
    try {
      console.log('OrderManagement: Marking order as processing:', orderId);
      await updateStatus(orderId, "processing");
      toast.success(`Order ${orderId} marked as processing`);
      setNewOrderIds(prev => prev.filter(id => id !== orderId));
    } catch (error) {
      console.error('OrderManagement: Error marking processing:', error);
      toast.error(error.message || "Failed to update order status");
    }
  };

  const handleMarkShipped = async (orderId) => {
    try {
      console.log('OrderManagement: Marking order as shipped:', orderId);
      await updateStatus(orderId, "shipped");
      toast.success(`Order ${orderId} marked as shipped`);
    } catch (error) {
      console.error('OrderManagement: Error marking shipped:', error);
      toast.error(error.message || "Failed to update order status");
    }
  };

  const handleMarkDelivered = async (orderId) => {
    try {
      console.log('OrderManagement: Marking order as delivered:', orderId);
      await updateStatus(orderId, "delivered");
      toast.success(`Order ${orderId} marked as delivered`);
    } catch (error) {
      console.error('OrderManagement: Error marking delivered:', error);
      toast.error(error.message || "Failed to update order status");
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      console.log('OrderManagement: Cancelling order:', orderId);
      await updateStatus(orderId, "cancelled");
      toast.success(`Order ${orderId} has been cancelled`);
    } catch (error) {
      console.error('OrderManagement: Error cancelling order:', error);
      toast.error(error.message || "Failed to cancel order");
    }
  };

  const handleDownloadInvoice = async (orderId) => {
    try {
      console.log('OrderManagement: Downloading invoice for order:', orderId);
      await downloadOrderInvoice(orderId);
      toast.success(`Invoice for order ${orderId} downloaded`);
    } catch (error) {
      console.error('OrderManagement: Error downloading invoice:', error);
      toast.error(error.message || "Failed to download invoice");
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      console.log('OrderManagement: Changing page to:', newPage);
      fetchOrders(newPage, pagination?.limit || 10, filterStatus);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(price || 0);
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
        <span className="capitalize">{status || 'Unknown'}</span>
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
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    placeholder="Search by order ID or customer email"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <Button
                  type="submit"
                  className="ml-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
                  disabled={loading}
                >
                  Search
                </Button>
              </form>
            </div>
            <div className="flex items-center space-x-2">
              <FiFilter className="text-gray-600 text-sm" />
              <select
                value={filterStatus}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
        
        {(orders || []).length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-gray-600 text-sm">
              {filterStatus ? `No ${filterStatus} orders found.` : "No orders found."}
            </p>
            {(filterStatus || searchTerm) && (
              <Button
                onClick={() => {
                  setFilterStatus('');
                  setSearchTerm('');
                  fetchOrders(1, pagination?.limit || 10, '');
                }}
                className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            {(orders || []).map((order) => {
              if (!order || !order.orderId) {
                console.warn("OrderManagement: Invalid order data skipped:", order);
                return null;
              }
              
              const isNewOrder = newOrderIds.includes(order.orderId);
              
              return (
                <div
                  key={order.orderId}
                  className={`mb-4 bg-white rounded-lg shadow-sm border ${isNewOrder ? 'border-yellow-400 ring-2 ring-yellow-200 animate-pulse' : 'border-gray-200'} p-4`}
                >
                  {isNewOrder && (
                    <div className="mb-2 bg-yellow-50 text-yellow-800 px-3 py-1 rounded text-xs flex items-center">
                      <FiAlertCircle className="mr-2" />
                      New order received!
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-600">Order ID</p>
                      <p className="font-medium text-gray-900 text-sm">{order.orderId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Status</p>
                      {getOrderStatusBadge(order.status)}
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Order Date</p>
                      <p className="font-medium text-gray-900 text-sm">
                        {new Date(order.createdAt || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Customer</p>
                      <p className="font-medium text-gray-900 text-sm">{order.userId?.name || 'N/A'} ({order.userId?.email || 'N/A'})</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Total Amount</p>
                      <p className="font-medium text-gray-900 text-sm">{formatPrice(order.totalPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Tracking Number</p>
                      <p className="font-medium text-gray-900 text-sm">{order.trackingNumber || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-xs text-gray-600 font-medium mb-2">Items</p>
                    {(order.items || []).map((item, index) => (
                      <div key={index} className="flex items-start mb-2 last:mb-0">
                        <img
                          src={item.productId?.image || '/placeholder.png'}
                          alt={item.productId?.title || 'Product'}
                          className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded mr-3"
                          
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">
                            {(item.productId?.title || 'Untitled Product')}
                            {item.variantId && (
                              <span className="ml-1 text-xs text-gray-500">
                                (Variant: {item.variantValue || item.variantId})
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-600">Quantity: {item.quantity || 1}</p>
                          <p className="text-xs text-gray-600">Price: {formatPrice(item.price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                    {order.status === "pending" && (
                      <>
                        <Button
                          onClick={() => handleMarkProcessing(order.orderId)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs"
                        >
                          Start Processing
                        </Button>
                        <Button
                          onClick={() => handleCancelOrder(order.orderId)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-xs"
                        >
                          Cancel Order
                        </Button>
                      </>
                    )}
                    {order.status === "processing" && (
                      <Button
                        onClick={() => handleMarkShipped(order.orderId)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-xs"
                      >
                        Mark as Shipped
                      </Button>
                    )}
                    {order.status === "shipped" && (
                      <Button
                        onClick={() => handleMarkDelivered(order.orderId)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-xs"
                      >
                        Mark as Delivered
                      </Button>
                    )}
                    <Button
                      onClick={() => handleDownloadInvoice(order.orderId)}
                      icon={FiDownload}
                      className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1 rounded-md text-xs"
                    >
                      Download Invoice
                    </Button>
                  </div>
                </div>
              );
            })}
            
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4">
              <Button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="w-full sm:w-auto border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md text-sm mb-2 sm:mb-0"
              >
                Previous
              </Button>
              <p className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages} (Total Orders: {pagination.total})
              </p>
              <Button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="w-full sm:w-auto border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md text-sm"
              >
                Next
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default memo(OrderManagement);