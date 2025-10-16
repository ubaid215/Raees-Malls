import React, { useEffect, useState } from "react";
import {
  FiPackage,
  FiTruck,
  FiAlertCircle,
  FiClock,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiDollarSign,
  FiXCircle,
  FiRefreshCw,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useOrder } from "../context/OrderContext";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import LoadingSkeleton from "../components/shared/LoadingSkelaton";
import Button from "../components/core/Button";
import socketService from "../services/socketService";

// Create a reusable image component with consistent URL handling
const ProductImage = ({ image, alt, className, ...props }) => {
  const [src, setSrc] = useState("");
  const [error, setError] = useState(false);

  const getImageUrl = (imageObj) => {
    if (!imageObj || !imageObj.url) return "/images/placeholder-product.png";
    
    if (imageObj.url.startsWith("http")) {
      return imageObj.url;
    }
    
    // Handle relative paths
    const baseUrl = import.meta.env.VITE_API_BASE_PROD_URL || "http://localhost:5000";
    return `${baseUrl}${imageObj.url}`;
  };

  useEffect(() => {
    if (image) {
      setSrc(getImageUrl(image));
      setError(false);
    } else {
      setSrc("/images/placeholder-product.png");
    }
  }, [image]);

  const handleError = () => {
    if (!error) {
      setSrc("/images/placeholder-product.png");
      setError(true);
    }
  };

  return (
    <img
      src={src}
      alt={alt || "Product image"}
      className={className}
      onError={handleError}
      loading="lazy"
      {...props}
    />
  );
};

const Order = () => {
  const { orders, pagination, loading, error, fetchUserOrders, isRegularUser } =
    useOrder();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newOrderIds, setNewOrderIds] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

 // Enhanced function to extract image from any product/variant structure
const getItemImage = (item) => {
  if (!item) return null;
  
  // Try to get image from the most specific source first
  
  // 1. Check if we have a color variant with images
  if (item.colorVariant?.color?.images?.[0]) {
    return item.colorVariant.color.images[0];
  }
  
  // 2. Check if we have a storage variant with color images
  if (item.storageVariant?.color?.images?.[0]) {
    return item.storageVariant.color.images[0];
  }
  
  // 3. Check if we have a size variant with color images
  if (item.sizeVariant?.color?.images?.[0]) {
    return item.sizeVariant.color.images[0];
  }
  
  // 4. Check if the item itself has an image
  if (item.itemImage) {
    return item.itemImage;
  }
  
  // 5. Check if we have a simple product with images
  if (item.simpleProduct?.images?.[0]) {
    return item.simpleProduct.images[0];
  }
  
  // 6. Check if the product itself has images
  if (item.productId?.images?.[0]) {
    return item.productId.images[0];
  }
  
  // 7. For storage options, check if there's a parent variant with images
  if (item.storageVariant && item.productId?.variants) {
    // Try to find any variant with images
    for (const variant of item.productId.variants) {
      if (variant.images?.[0]) return variant.images[0];
      if (variant.color?.images?.[0]) return variant.color.images[0];
    }
  }
  
  // 8. For size options, similar approach
  if (item.sizeVariant && item.productId?.variants) {
    for (const variant of item.productId.variants) {
      if (variant.images?.[0]) return variant.images[0];
      if (variant.color?.images?.[0]) return variant.color.images[0];
    }
  }
  
  return null;
};

  // Helper function to calculate item price based on variant type
  const calculateItemPrice = (item) => {
    if (!item) return 0;
    
    switch(item.variantType) {
      case 'simple':
        return item.simpleProduct?.discountPrice || item.simpleProduct?.price || 0;
      case 'color':
        return item.colorVariant?.discountPrice || item.colorVariant?.price || 0;
      case 'storage':
        return item.storageVariant?.storageOption?.discountPrice || 
               item.storageVariant?.storageOption?.price || 0;
      case 'size':
        return item.sizeVariant?.sizeOption?.discountPrice || 
               item.sizeVariant?.sizeOption?.price || 0;
      default:
        return item.price || 0;
    }
  };

  // Helper function to get item details including quantity and total
  const getItemDetails = (item) => {
    let quantity = 0;
    let finalUnitPrice = calculateItemPrice(item);
    
    switch(item.variantType) {
      case 'simple':
        quantity = item.simpleProduct?.quantity || 0;
        break;
      case 'color':
        quantity = item.colorVariant?.quantity || 0;
        break;
      case 'storage':
        quantity = item.storageVariant?.quantity || 0;
        break;
      case 'size':
        quantity = item.sizeVariant?.quantity || 0;
        break;
      default:
        quantity = item.quantity || 0;
    }
    
    return {
      quantity,
      finalUnitPrice,
      itemTotal: quantity * finalUnitPrice
    };
  };

  const getVariantDetails = (item) => {
    if (!item) return null;
    
    const variantInfo = {};
    
    switch(item.variantType) {
      case 'color':
        if (item.colorVariant) {
          variantInfo.colorName = item.colorVariant.color?.name;
        }
        break;
      case 'storage':
        if (item.storageVariant) {
          variantInfo.colorName = item.storageVariant.color?.name;
          variantInfo.storageCapacity = item.storageVariant.storageOption?.capacity;
        }
        break;
      case 'size':
        if (item.sizeVariant) {
          variantInfo.colorName = item.sizeVariant.color?.name;
          variantInfo.size = item.sizeVariant.sizeOption?.size;
        }
        break;
      default:
        break;
    }
    
    return Object.entries(variantInfo)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  // Helper function to format payment method for display
  const formatPaymentMethod = (method) => {
    if (!method) return "Unknown";
    
    const methodMap = {
      'cash_on_delivery': 'Cash on Delivery',
      'alfa_wallet': 'Alfa Wallet',
      'alfalah_bank': 'Bank Alfalah',
      'credit_card': 'Credit Card',
      'debit_card': 'Debit Card'
    };
    
    return methodMap[method] || method.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Helper function to format payment status for display
  const formatPaymentStatus = (status) => {
    if (!status) return "Unknown";
    
    const statusMap = {
      'pending': 'Pending',
      'completed': 'Completed',
      'failed': 'Failed',
      'not_required': 'Not Required',
      'refunded': 'Refunded'
    };
    
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  useEffect(() => {
    if (!isRegularUser || !user) {
      console.log("Order: Not authenticated or not a regular user");
      toast.error("Please log in to view your orders.");
      navigate("/login");
      return;
    }

    console.log("Order: Fetching orders for user:", user._id);
    fetchUserOrders(pagination.page);

    const setupSocket = () => {
      try {
        if (!socketService.getConnectionState()) {
          socketService.connect(user._id, user.role);
          console.log(
            "Order: Socket connection established for user:",
            user._id
          );
        }

        socketService.off("orderCreated");
        socketService.off("orderStatusUpdated");
        socketService.off("disconnect");
        socketService.off("reconnect");

        socketService.on("orderCreated", (newOrder) => {
          console.log("Order: New order received via socket:", newOrder);
          if (!newOrder || !newOrder.orderId) {
            console.error("Order: Invalid order data received:", newOrder);
            return;
          }

          setNewOrderIds((prev) => [...prev, newOrder.orderId]);
          toast.info(`New Order Placed: ${newOrder.orderId}`, {
            position: "top-right",
            autoClose: 5000,
          });
          fetchUserOrders(pagination.page);

          setTimeout(() => {
            setNewOrderIds((prev) =>
              prev.filter((id) => id !== newOrder.orderId)
            );
          }, 30000);
        });

        socketService.on("orderStatusUpdated", (updatedOrder) => {
          if (!updatedOrder || !updatedOrder.orderId) {
            console.error("Order: Invalid order data received:", updatedOrder);
            return;
          }
          toast.info(
            `Order ${updatedOrder.orderId} status updated to ${updatedOrder.status}`
          );
          fetchUserOrders(pagination.page);
        });

        socketService.on("disconnect", () => {
          console.log("Order: Socket disconnected");
          toast.warning("Lost connection to server. Reconnecting...");
        });

        socketService.on("reconnect", () => {
          console.log("Order: Socket reconnected");
          toast.success("Reconnected to server");
          fetchUserOrders(pagination.page);
        });
      } catch (err) {
        console.error("Order: Socket setup error:", err);
        toast.error("Failed to setup socket connection");
      }
    };

    setupSocket();

    return () => {
      console.log("Order: Cleaning up socket listeners");
      socketService.off("orderCreated");
      socketService.off("orderStatusUpdated");
      socketService.off("disconnect");
      socketService.off("reconnect");
    };
  }, [user, isRegularUser, fetchUserOrders, pagination.page, navigate]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      console.log("Order: Changing page to:", newPage);
      fetchUserOrders(newPage);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
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
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-medium ${statusStyles[status] || "bg-gray-100 text-gray-800"}`}
      >
        {status === "pending" && <FiAlertCircle className="mr-1" />}
        {status === "processing" && <FiClock className="mr-1" />}
        {status === "shipped" && <FiTruck className="mr-1" />}
        {status === "delivered" && <FiCheckCircle className="mr-1" />}
        <span className="capitalize">{status || "Unknown"}</span>
      </span>
    );
  };

  const getPaymentMethodBadge = (method) => {
    const methodStyles = {
      cash_on_delivery: "bg-green-100 text-green-800",
      alfa_wallet: "bg-blue-100 text-blue-800",
      alfalah_bank: "bg-indigo-100 text-indigo-800",
      credit_card: "bg-purple-100 text-purple-800",
      debit_card: "bg-pink-100 text-pink-800",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${methodStyles[method] || "bg-gray-100 text-gray-800"}`}
      >
        {method === "cash_on_delivery" && <FiDollarSign className="mr-1" />}
        {(method === "alfa_wallet" || method === "alfalah_bank" || method === "credit_card" || method === "debit_card") && <FiCreditCard className="mr-1" />}
        <span>{formatPaymentMethod(method)}</span>
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      not_required: "bg-gray-100 text-gray-800",
      refunded: "bg-orange-100 text-orange-800",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || "bg-gray-100 text-gray-800"}`}
      >
        {status === "pending" && <FiClock className="mr-1" />}
        {status === "completed" && <FiCheckCircle className="mr-1" />}
        {status === "failed" && <FiXCircle className="mr-1" />}
        {status === "not_required" && <FiDollarSign className="mr-1" />}
        {status === "refunded" && <FiRefreshCw className="mr-1" />}
        <span>{formatPaymentStatus(status)}</span>
      </span>
    );
  };

  const handleSelectOrder = (order) => {
    console.log("Order: Selected order:", order.orderId);
    setSelectedOrder(order);
  };

  const handleBackToList = () => {
    setSelectedOrder(null);
  };

  if (loading && !orders.length) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <LoadingSkeleton type="text" width="64" height="8" className="mb-6" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6">
                <LoadingSkeleton type="text" width="full" height="10" />
                <LoadingSkeleton
                  type="text"
                  width="80"
                  height="6"
                  className="mt-2"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center max-w-md w-full">
          <p className="text-red-600 text-lg font-medium mb-4">{error}</p>
          <Button
            onClick={() => fetchUserOrders(pagination.page)}
            className="w-full bg-red-600 text-white hover:bg-red-700"
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            My Orders
          </h1>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-3 py-1 rounded inline-flex items-center ${socketService.getConnectionState() ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
            >
              <span
                className={`w-2 h-2 rounded-full mr-2 ${socketService.getConnectionState() ? "bg-green-500" : "bg-red-500"}`}
              ></span>
              {socketService.getConnectionState()
                ? "Connected"
                : "Disconnected"}
            </span>
          </div>
        </div>

        {selectedOrder ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Order {selectedOrder.orderId || "Unknown"}
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={handleBackToList}
                  className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  <FiChevronLeft />
                  Back
                </Button>
              </div>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(
                      selectedOrder.createdAt || Date.now()
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Status</p>
                  {getOrderStatusBadge(selectedOrder.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  {getPaymentMethodBadge(selectedOrder.paymentMethod)}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Status</p>
                  {getPaymentStatusBadge(selectedOrder.paymentStatus)}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatPrice(selectedOrder.totalAmount)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 font-medium mb-2">Items</p>
                <ul className="space-y-4">
                  {(selectedOrder.items || []).map((item, index) => {
                    const variantDetails = getVariantDetails(item);
                    const itemDetails = getItemDetails(item);
                    const itemImage = getItemImage(item);
                    
                    return (
                      <li key={index} className="flex items-start gap-4">
                        <ProductImage
                          image={itemImage}
                          alt={item.productId?.title || "Product"}
                          className="w-12 h-12 object-contain rounded-md border border-gray-200"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {item.productId?.title || "Untitled Product"}
                          </p>
                          {variantDetails && (
                            <p className="text-sm text-gray-500">
                              {variantDetails}
                            </p>
                          )}
                          <p className="text-sm text-gray-600">
                            Quantity: {itemDetails.quantity}
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatPrice(itemDetails.finalUnitPrice)} each
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            Total: {formatPrice(itemDetails.itemTotal)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            SKU: {item.sku || 'N/A'}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium mb-2">
                  Shipping Address
                </p>
                {selectedOrder.shippingAddress ? (
                  <p className="text-sm text-gray-900">
                    {selectedOrder.shippingAddress.fullName},{" "}
                    {selectedOrder.shippingAddress.addressLine1},
                    {selectedOrder.shippingAddress.addressLine2 &&
                      ` ${selectedOrder.shippingAddress.addressLine2}, `}
                    {selectedOrder.shippingAddress.city},{" "}
                    {selectedOrder.shippingAddress.state}{" "}
                    {selectedOrder.shippingAddress.postalCode},
                    {selectedOrder.shippingAddress.country}
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    No shipping address provided
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Subtotal</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatPrice(selectedOrder.subtotal)}
                  </p>
                </div>
                {selectedOrder.discountAmount > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Discount</p>
                    <p className="text-lg font-semibold text-red-600">
                      -{formatPrice(selectedOrder.discountAmount)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Shipping</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatPrice(selectedOrder.totalShippingCost)}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatPrice(selectedOrder.totalAmount)}
                </p>
              </div>
              {selectedOrder.trackingNumber && (
                <div>
                  <p className="text-sm text-gray-600">Tracking Number</p>
                  <p className="text-sm text-gray-900">
                    {selectedOrder.trackingNumber}
                  </p>
                  <Button
                    onClick={() =>
                      window.open(
                        `https://tracking.example.com/${selectedOrder.trackingNumber}`,
                        "_blank"
                      )
                    }
                    className="mt-2 bg-red-600 text-white hover:bg-red-700"
                  >
                    Track Order
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                <p className="text-gray-600">No orders found</p>
              </div>
            ) : (
              orders
                .filter((order) => order && order.orderId)
                .map((order) => {
                  // Get the first item from the order for display
                  const firstItem =
                    order.items && order.items.length > 0
                      ? order.items[0]
                      : null;
                  const additionalItemsCount = order.items
                    ? order.items.length - 1
                    : 0;
                  const firstItemImage = firstItem ? getItemImage(firstItem) : null;

                  return (
                    <div
                      key={order.orderId}
                      className={`bg-white rounded-lg shadow-sm border ${newOrderIds.includes(order.orderId) ? "border-yellow-400 ring-2 ring-yellow-200 animate-pulse" : "border-gray-200"} p-6 cursor-pointer hover:shadow-md transition-shadow`}
                      onClick={() => handleSelectOrder(order)}
                    >
                      {newOrderIds.includes(order.orderId) && (
                        <div className="mb-2 bg-yellow-50 text-yellow-800 px-3 py-1 rounded text-sm flex items-center">
                          <FiAlertCircle className="mr-2" />
                          New order placed!
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-6">
                        {/* Product Image and Title */}
                        <div className="flex gap-4 flex-1">
                          {firstItem && (
                            <div className="flex-shrink-0">
                              <ProductImage
                                image={firstItemImage}
                                alt={firstItem.productId?.title || "Product"}
                                className="w-16 h-16 object-contain rounded-md border border-gray-200"
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {firstItem?.productId?.title || "Product"}
                              {additionalItemsCount > 0 && (
                                <span className="text-sm text-gray-500 ml-2">
                                  +{additionalItemsCount} more item
                                  {additionalItemsCount > 1 ? "s" : ""}
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Order #{order.orderId}
                            </p>
                            {firstItem && (
                              <p className="text-xs text-gray-500 mt-1">
                                {getVariantDetails(firstItem)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Order Details */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Date</p>
                            <p className="font-medium text-gray-900">
                              {new Date(
                                order.createdAt || Date.now()
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total</p>
                            <p className="font-medium text-gray-900">
                              {formatPrice(order.totalAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Order Status</p>
                            {getOrderStatusBadge(order.status)}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Payment</p>
                            <div className="space-y-1">
                              {getPaymentMethodBadge(order.paymentMethod)}
                              {getPaymentStatusBadge(order.paymentStatus)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}

            {orders.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <Button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="w-full sm:w-auto flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  <FiChevronLeft />
                  Previous
                </Button>
                <p className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages} (
                  {pagination.total} orders)
                </p>
                <Button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="w-full sm:w-auto flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Next
                  <FiChevronRight />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Order;