import React, { useState, useEffect, memo } from "react";
import { FiDownload, FiCheckCircle, FiTruck } from "react-icons/fi";
import { toast } from "react-toastify";
import LoadingSkeleton from "../../components/shared/LoadingSkelaton";
import Button from "../../components/core/Button";
import { getAllOrders, updateOrderStatus, downloadInvoice } from "../../services/orderService";

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });

  useEffect(() => {
const fetchOrders = async () => {
  try {
    setLoading(true);
    setError(null);
    const response = await getAllOrders({ page: pagination.page, limit: pagination.limit });
    if (response.data && response.data.success) {
      setOrders(response.data.orders || []);  // Add fallback empty array
      setPagination({
        page: response.data.page || 1,
        limit: response.data.limit || 10,
        totalPages: response.data.totalPages || 1,
      });
    } else {
      throw new Error(response?.data?.message || "Failed to fetch orders");
    }
  } catch (err) {
    console.error("Order fetch error:", err);
    setError(err.message || "Failed to fetch orders");
    toast.error(err.message || "Failed to fetch orders");
    setOrders([]); // Initialize with empty array on error
  } finally {
    setLoading(false);
  }
};

    fetchOrders();
  }, [pagination.page, pagination.limit]);

  const handleMarkShipped = async (orderId) => {
    try {
      const response = await updateOrderStatus(orderId, { status: "shipped" });
      if (response.data.success) {
        setOrders((prev) =>
          prev.map((order) =>
            order.orderId === orderId ? { ...order, status: "shipped", updatedAt: new Date() } : order
          )
        );
        toast.success(`Order ${orderId} marked as shipped`);
      } else {
        throw new Error(response.data.message || "Failed to update status");
      }
    } catch (error) {
      toast.error(error.message || "Failed to mark order as shipped");
    }
  };

  const handleMarkDelivered = async (orderId) => {
    try {
      const response = await updateOrderStatus(orderId, { status: "delivered" });
      if (response.data.success) {
        setOrders((prev) =>
          prev.map((order) =>
            order.orderId === orderId ? { ...order, status: "delivered", updatedAt: new Date() } : order
          )
        );
        toast.success(`Order ${orderId} marked as delivered`);
      } else {
        throw new Error(response.data.message || "Failed to update status");
      }
    } catch (error) {
      toast.error(error.message || "Failed to mark order as delivered");
    }
  };

  const handleDownloadInvoice = async (orderId) => {
    try {
      const response = await downloadInvoice(orderId);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Invoice for order ${orderId} downloaded`);
    } catch (error) {
      toast.error(error.message || "Failed to download invoice");
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <LoadingSkeleton type="text" width="64" height="8" className="mb-2" />
            <LoadingSkeleton type="text" width="96" height="4" />
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {[...Array(6)].map((_, j) => (
                  <LoadingSkeleton key={j} type="text" width="20" height="4" className="mb-2" />
                ))}
              </div>
              {[...Array(2)].map((_, j) => (
                <div key={j} className="flex items-start mb-6 last:mb-0">
                  <LoadingSkeleton type="image" width="80" height="80" className="mr-4" />
                  <div className="flex-1">
                    <LoadingSkeleton type="text" width="48" height="5" className="mb-2" />
                    <LoadingSkeleton type="text" width="64" height="4" className="mb-1" />
                    <LoadingSkeleton type="text" width="32" height="4" />
                  </div>
                </div>
              ))}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
                <LoadingSkeleton type="text" width="32" height="9" />
                <LoadingSkeleton type="text" width="32" height="9" />
                <LoadingSkeleton type="text" width="32" height="9" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-md w-full text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button
            onClick={() => setPagination((prev) => ({ ...prev, page: 1 }))}
            variant="outline"
            className="border-red-600 text-red-600 hover:bg-red-50"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">All Orders</h1>
          <p className="text-gray-600 mt-1">Manage and track all customer orders</p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white shadow-sm rounded-lg p-6 text-center">
            <p className="text-gray-500">No orders found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.orderId}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Order ID</p>
                    <p className="font-medium text-gray-900">{order.orderId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="font-medium text-gray-900">${order.totalPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="font-medium text-gray-900">{order.userId.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Shipping Address</p>
                    <p className="font-medium text-gray-900 text-sm">
                      {`${order.shippingAddress.fullName}, ${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}, ${order.shippingAddress.country}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-medium text-gray-900 capitalize">{order.status}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  {order.items.map((item) => (
                    <div key={item._id} className="flex items-start">
                      <img
                        src={item.productId.image?.url || "/placeholder-product.png"}
                        alt={item.productId.title}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md mr-4 border border-gray-200"
                        onError={(e) => (e.currentTarget.src = "/placeholder-product.png")}
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.productId.title}</h3>
                        <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {item.quantity} x ${item.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                  <Button
                    variant={order.status === "shipped" || order.status === "delivered" ? "outline" : "primary"}
                    onClick={() => handleMarkShipped(order.orderId)}
                    icon={order.status === "shipped" ? FiTruck : null}
                    className={`w-full sm:w-auto ${
                      order.status === "shipped" || order.status === "delivered"
                        ? "border-gray-300 text-gray-600 hover:bg-gray-50"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                    disabled={order.status === "shipped" || order.status === "delivered"}
                  >
                    {order.status === "shipped" ? "Shipped" : "Mark as Shipped"}
                  </Button>
                  <Button
                    variant={order.status === "delivered" ? "outline" : "primary"}
                    onClick={() => handleMarkDelivered(order.orderId)}
                    icon={order.status === "delivered" ? FiCheckCircle : null}
                    className={`w-full sm:w-auto ${
                      order.status === "delivered"
                        ? "border-gray-300 text-gray-600 hover:bg-gray-50"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                    disabled={order.status === "delivered"}
                  >
                    {order.status === "delivered" ? "Delivered" : "Mark as Delivered"}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleDownloadInvoice(order.orderId)}
                    icon={FiDownload}
                    className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                  >
                    Download Invoice
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {orders.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="w-full sm:w-auto border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2"
            >
              Previous
            </Button>
            <p className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="w-full sm:w-auto border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(OrderManagement);