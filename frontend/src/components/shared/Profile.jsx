import React, { useEffect, useState } from "react";
import {
  FiUser,
  FiPackage,
  FiTruck,
  FiLogOut,
  FiAlertCircle,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useOrder } from "../../context/OrderContext";
import { toast } from "react-toastify";
import LoadingSkeleton from "../../components/shared/LoadingSkelaton";
import Button from "../../components/core/Button";
import socketService from "../../services/socketService";

const Profile = () => {
  const {
    user,
    logoutUser,
    fetchUser,
    updateUser,
    needsFetch,
    error: authError,
    loading: authLoading,
  } = useAuth();
  const {
    orders,
    pagination,
    loading: orderLoading,
    error: orderError,
    fetchUserOrders,
    cancelOrder,
  } = useOrder();
  const [isLoading, setIsLoading] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    addresses: [],
  });
  const [formErrors, setFormErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        addresses: user.addresses || [],
      });
    }
  }, [user]);

  const handleFetchUser = async () => {
    setIsLoading(true);
    try {
      await fetchUser();
    } catch (err) {
      console.error("fetchUser error:", err);
      const errorMessage = err.message || "Failed to fetch user data";
      if (err.message.includes("Too many requests")) {
        toast.error(errorMessage);
      } else if (err.response?.status === 401 || err.response?.status === 404) {
        toast.error("Session expired. Please log in again.");
        logoutUser();
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userId");
        navigate("/login");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getImageUrl = (item) => {
    const baseUrl =
      import.meta.env.VITE_API_BASE_PROD_URL || "http://localhost:5000";
    return item.image
      ? typeof item.image === "string"
        ? item.image.startsWith("http")
          ? item.image
          : `${baseUrl}${item.image}`
        : item.image.url
          ? item.image.url.startsWith("http")
            ? item.image.url
            : `${baseUrl}${item.image.url}`
          : "/images/placeholder-product.png"
      : item.productId?.image?.url
        ? item.productId.image.url.startsWith("http")
          ? item.productId.image.url
          : `${baseUrl}${item.productId.image.url}`
        : item.productId?.images?.[0]?.url
          ? item.productId.images[0].url.startsWith("http")
            ? item.productId.images[0].url
            : `${baseUrl}${item.productId.images[0].url}`
          : "/images/placeholder-product.png";
  };

  useEffect(() => {
    if (user) {
      // console.log('Profile: Fetching orders for user:', user._id);
      fetchUserOrders(pagination.page);

      const setupSocket = () => {
        try {
          if (!socketService.getConnectionState()) {
            socketService.connect(user._id, user.role);
            // console.log('Profile: Socket connection established for user:', user._id);
          }

          socketService.off("orderCreated");
          socketService.off("orderStatusUpdated");
          socketService.off("disconnect");
          socketService.off("reconnect");

          socketService.on("orderCreated", (newOrder) => {
            // console.log('Profile: New order received via socket:', newOrder);
            if (!newOrder || !newOrder.orderId) {
              console.error("Profile: Invalid order data received:", newOrder);
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
            // console.log('Profile: Order status updated via socket:', updatedOrder);
            if (!updatedOrder || !updatedOrder.orderId) {
              console.error(
                "Profile: Invalid order data received:",
                updatedOrder
              );
              return;
            }
            toast.info(
              `Order ${updatedOrder.orderId} status updated to ${updatedOrder.status}`
            );
            fetchUserOrders(pagination.page);
          });

          socketService.on("disconnect", () => {
            console.log("Profile: Socket disconnected");
            toast.warning("Lost connection to server. Reconnecting...");
          });

          socketService.on("reconnect", () => {
            console.log("Profile: Socket reconnected");
            toast.success("Reconnected to server");
            fetchUserOrders(pagination.page);
          });
        } catch (err) {
          console.error("Profile: Socket setup error:", err);
          toast.error("Failed to setup socket connection");
        }
      };

      setupSocket();

      return () => {
        console.log("Profile: Cleaning up socket listeners");
        socketService.off("orderCreated");
        socketService.off("orderStatusUpdated");
        socketService.off("disconnect");
        socketService.off("reconnect");
      };
    }
  }, [user, fetchUserOrders, pagination.page]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      socketService.disconnect();
      navigate("/login");
    } catch (err) {
      toast.error(err.message || "Failed to log out");
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      console.log("Profile: Changing page to:", newPage);
      fetchUserOrders(newPage);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      console.log("Profile: Cancelling order:", orderId);
      await cancelOrder(orderId);
      toast.success(`Order ${orderId} has been cancelled`);
    } catch (error) {
      console.error("Profile: Error cancelling order:", error);
      toast.error(error.message || "Failed to cancel order");
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
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || "bg-gray-100 text-gray-800"}`}
      >
        {status === "pending" && <FiAlertCircle className="mr-1 text-xs" />}
        {status === "processing" && <FiClock className="mr-1 text-xs" />}
        {status === "shipped" && <FiTruck className="mr-1 text-xs" />}
        {status === "delivered" && <FiCheckCircle className="mr-1 text-xs" />}
        <span className="capitalize">{status || "Unknown"}</span>
      </span>
    );
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Valid email is required";
    }
    formData.addresses.forEach((addr, index) => {
      if (!addr.fullName?.trim())
        errors[`address_${index}_fullName`] = "Full name is required";
      if (!addr.street?.trim())
        errors[`address_${index}_street`] = "Street is required";
      if (!addr.city?.trim())
        errors[`address_${index}_city`] = "City is required";
      if (!addr.state?.trim())
        errors[`address_${index}_state`] = "State is required";
      if (!addr.zip?.trim())
        errors[`address_${index}_zip`] = "Zip code is required";
      if (!addr.country?.trim())
        errors[`address_${index}_country`] = "Country is required";
      if (!addr.phone?.trim() || !/^\+?[\d\s-]{10,}$/.test(addr.phone)) {
        errors[`address_${index}_phone`] = "Valid phone number is required";
      }
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e, index = null, field = null) => {
    if (index !== null && field) {
      const updatedAddresses = [...formData.addresses];
      updatedAddresses[index] = {
        ...updatedAddresses[index],
        [field]: e.target.value,
      };
      setFormData({ ...formData, addresses: updatedAddresses });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
    setFormErrors({});
  };

  const handleCheckboxChange = (index) => {
    const updatedAddresses = formData.addresses.map((addr, i) => ({
      ...addr,
      isDefault: i === index,
    }));
    setFormData({ ...formData, addresses: updatedAddresses });
  };

  const handleAddAddress = () => {
    setFormData({
      ...formData,
      addresses: [
        ...formData.addresses,
        {
          fullName: "",
          street: "",
          addressLine2: "",
          city: "",
          state: "",
          zip: "",
          country: "",
          phone: "",
          isDefault: formData.addresses.length === 0,
        },
      ],
    });
  };

  const handleRemoveAddress = (index) => {
    const updatedAddresses = formData.addresses.filter((_, i) => i !== index);
    if (
      updatedAddresses.length > 0 &&
      !updatedAddresses.some((addr) => addr.isDefault)
    ) {
      updatedAddresses[0].isDefault = true;
    }
    setFormData({ ...formData, addresses: updatedAddresses });
    setFormErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await updateUser(formData);
      setIsEditModalOpen(false);
      setFormErrors({});
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error("Profile: Update profile error:", err);
      toast.error(err.message || "Failed to update profile");
    }
  };

  if (!user && !isLoading && (needsFetch || authError)) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center max-w-md w-full">
          {authError && (
            <p className="text-red-600 text-lg font-medium mb-4">{authError}</p>
          )}
          <Button
            onClick={handleFetchUser}
            className="w-full bg-blue-600 text-white hover:bg-blue-700 mb-4"
            disabled={isLoading}
          >
            {isLoading
              ? "Loading..."
              : authError
                ? "Retry Now"
                : "Load Profile"}
          </Button>
          <Button
            onClick={() => navigate("/login")}
            className="w-full bg-gray-600 text-white hover:bg-gray-700"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <LoadingSkeleton
              type="text"
              width="w-64"
              height="h-8"
              className="mb-2"
            />
            <LoadingSkeleton type="text" width="w-32" height="h-6" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <LoadingSkeleton
                type="text"
                width="w-48"
                height="h-6"
                className="mb-4"
              />
              <LoadingSkeleton
                type="text"
                width="w-80"
                height="h-5"
                className="mb-2"
              />
              <LoadingSkeleton type="text" width="w-80" height="h-5" />
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 md:col-span-2">
              <LoadingSkeleton
                type="text"
                width="w-48"
                height="h-6"
                className="mb-4"
              />
              <LoadingSkeleton type="text" width="w-full" height="h-10" />
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 md:col-span-3">
              <LoadingSkeleton
                type="text"
                width="w-48"
                height="h-6"
                className="mb-4"
              />
              <LoadingSkeleton type="text" width="w-full" height="h-20" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            My Profile
          </h1>
          <Button
            onClick={handleLogout}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700 px-4 py-2 text-sm"
          >
            <FiLogOut />
            <span>Logout</span>
          </Button>
        </div>

        <div
          className={`mb-3 text-xs px-3 py-1 rounded inline-flex items-center ${socketService.getConnectionState() ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          <span
            className={`w-2 h-2 rounded-full mr-2 ${socketService.getConnectionState() ? "bg-green-500" : "bg-red-500"}`}
          ></span>
          {socketService.getConnectionState()
            ? "Connected to server"
            : "Disconnected - Reconnecting..."}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <FiUser className="text-blue-600 text-xl sm:text-2xl" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Personal Information
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base">
              <div>
                <p className="text-gray-600">Full Name</p>
                <p className="font-medium text-gray-900">
                  {user.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Email Address</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
              <div>
                <p className="text-gray-600">Role</p>
                <p className="font-medium text-gray-900 capitalize">
                  {user.role || "User"}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Addresses</p>
                {Array.isArray(user.addresses) && user.addresses.length > 0 ? (
                  user.addresses.map((addr, index) => (
                    <div key={index} className="mb-2">
                      <p className="font-medium text-gray-900">
                        {`${addr.fullName}, ${addr.street}${addr.addressLine2 ? `, ${addr.addressLine2}` : ""}, ${addr.city}, ${addr.state}, ${addr.zip}, ${addr.country}`}
                        {addr.phone && `, Phone: ${addr.phone}`}
                        {addr.isDefault && (
                          <span className="ml-2 text-sm text-green-600">
                            (Default)
                          </span>
                        )}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600">No addresses saved</p>
                )}
              </div>
              <Button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 text-sm"
              >
                Edit Profile
              </Button>
            </div>
          </div>

          {/* Updated Responsive Recent Orders Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 md:col-span-2">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="bg-blue-100 p-2 sm:p-3 rounded-full">
                <FiPackage className="text-blue-600 text-lg sm:text-xl md:text-2xl" />
              </div>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
                Recent Orders
              </h2>
            </div>
            {orderLoading ? (
              <div className="space-y-3 sm:space-y-4">
                <LoadingSkeleton type="text" width="w-full" height="h-12 sm:h-16" />
                <LoadingSkeleton type="text" width="w-full" height="h-12 sm:h-16" />
              </div>
            ) : orderError ? (
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600 text-sm sm:text-base">{orderError}</p>
                <Button
                  onClick={() => fetchUserOrders(pagination.page)}
                  className="mt-2 bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 text-sm"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {(() => {
                  const validOrders = (orders || []).filter(
                    (order) => order && order.orderId
                  );
                  return validOrders.length === 0 ? (
                    <p className="text-gray-600 text-sm sm:text-base">No orders found</p>
                  ) : (
                    validOrders.slice(0, 3).map((order) => {
                      // Get the first item from the order for display
                      const firstItem =
                        order.items && order.items.length > 0
                          ? order.items[0]
                          : null;
                      const additionalItemsCount = order.items
                        ? order.items.length - 1
                        : 0;

                      return (
                        <div
                          key={order.orderId}
                          className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/orders/${order.orderId}`)}
                        >
                          <div className="flex gap-2 sm:gap-4">
                            {/* Product Image - Smaller on mobile */}
                            {firstItem && (
                              <div className="flex-shrink-0">
                                <img
                                  src={getImageUrl(firstItem)}
                                  alt={
                                    firstItem.productId?.title ||
                                    firstItem.title ||
                                    "Product"
                                  }
                                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-md border border-gray-200"
                                  onError={(e) => {
                                    console.warn(
                                      `Order: Image failed to load for ${firstItem.productId?.title || firstItem.title || "unknown"}:`,
                                      e.target.src
                                    );
                                    e.currentTarget.src =
                                      "/images/placeholder-product.png";
                                    e.currentTarget.onerror = null;
                                  }}
                                />
                              </div>
                            )}

                            {/* Order Details - Compact layout */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2 mb-2">
                                <div className="min-w-0">
                                  <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                                    {firstItem?.productId?.title || "Product"}
                                    {additionalItemsCount > 0 && (
                                      <span className="text-xs sm:text-sm text-gray-500 ml-1 sm:ml-2">
                                        +{additionalItemsCount} more
                                      </span>
                                    )}
                                  </h3>
                                  <p className="text-xs sm:text-sm text-gray-600">
                                    #{order.orderId}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(
                                      order.createdAt || Date.now()
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 sm:gap-1">
                                  <p className="font-semibold text-gray-900 text-sm sm:text-base">
                                    {formatPrice(order.totalPrice)}
                                  </p>
                                  {getOrderStatusBadge(order.status)}
                                </div>
                              </div>

                              {/* Quantity info - Smaller on mobile */}
                              {firstItem && (
                                <p className="text-xs sm:text-sm text-gray-600">
                                  Qty: {firstItem.quantity || 1}
                                  {firstItem.variantId && (
                                    <span className="ml-1 sm:ml-2">
                                      • {firstItem.variantValue || "Variant"}
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  );
                })()}
                <Button
                  onClick={() => navigate("/orders")}
                  className="w-full border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-2 text-sm"
                  disabled={orderError}
                >
                  View All Orders
                </Button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:col-span-3">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-blue-100 p-3 rounded-full">
                <FiTruck className="text-blue-600 text-xl sm:text-2xl" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Current Orders
              </h2>
            </div>
            {orderLoading ? (
              <div className="space-y-6">
                <LoadingSkeleton type="text" width="w-full" height="h-20" />
                <LoadingSkeleton type="text" width="w-full" height="h-20" />
              </div>
            ) : orderError ? (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600">{orderError}</p>
                <Button
                  onClick={() => fetchUserOrders(pagination.page)}
                  className="mt-2 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 text-sm"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const validOrders = (orders || []).filter(
                    (order) =>
                      order &&
                      order.orderId &&
                      order.status !== "delivered" &&
                      order.status !== "cancelled"
                  );
                  // console.log('Profile: Valid current orders:', validOrders);
                  return validOrders.length === 0 ? (
                    <p className="text-gray-600 text-sm sm:text-base">
                      No current orders
                    </p>
                  ) : (
                    validOrders.map((order) => {
                      const isNewOrder = newOrderIds.includes(order.orderId);
                      return (
                        <div
                          key={order.orderId}
                          className={`border rounded-lg p-4 ${isNewOrder ? "border-yellow-400 ring-2 ring-yellow-200 animate-pulse" : "border-gray-200"}`}
                        >
                          {isNewOrder && (
                            <div className="mb-2 bg-yellow-50 text-yellow-800 px-3 py-1 rounded text-sm flex items-center">
                              <FiAlertCircle className="mr-2" />
                              New order placed!
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                            <div>
                              <p className="font-medium text-gray-900">
                                Order {order.orderId || "Unknown"}
                              </p>
                              <p className="text-sm text-gray-600">
                                Placed on{" "}
                                {new Date(
                                  order.createdAt || Date.now()
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            {getOrderStatusBadge(order.status)}
                          </div>
                          <div className="mb-4">
                            <p className="text-sm text-gray-600 font-medium mb-2">
                              Items:
                            </p>
                            <ul className="space-y-2 text-sm sm:text-base">
                              {(order.items || []).map((item, index) => (
                                <li
                                  key={index}
                                  className="flex justify-between"
                                >
                                  <span className="text-gray-700">
                                    {item.quantity || 1} ×{" "}
                                    {item.productId?.title ||
                                      "Untitled Product"}
                                    {item.variantId && (
                                      <span className="ml-1 text-xs text-gray-500">
                                        (Variant:{" "}
                                        {item.variantValue ||
                                          item.variantId ||
                                          "Unknown"}
                                        )
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-gray-900 font-medium">
                                    {formatPrice(item.price)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t pt-4">
                            <div>
                              <p className="text-sm text-gray-600">
                                Tracking Number
                              </p>
                              <p className="font-medium text-gray-900">
                                {order.trackingNumber || "N/A"}
                              </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              <Button
                                onClick={() =>
                                  window.open(
                                    `https://tracking.example.com/${order.trackingNumber || ""}`,
                                    "_blank"
                                  )
                                }
                                className="w-full sm:w-auto border border-blue-600 text-blue-600 hover:bg-blue-50"
                                disabled={!order.trackingNumber}
                              >
                                Track Order
                              </Button>
                              {order.status === "pending" && (
                                <Button
                                  onClick={() =>
                                    handleCancelOrder(order.orderId)
                                  }
                                  className="w-full sm:w-auto bg-gray-600 text-white hover:bg-gray-700"
                                >
                                  Cancel Order
                                </Button>
                              )}
                              <Button
                                onClick={() =>
                                  navigate(`/orders/${order.orderId}`)
                                }
                                className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700"
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  );
                })()}
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

        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Edit Profile
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full border rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${formErrors.name ? "border-red-500" : "border-gray-300"}`}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full border rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${formErrors.email ? "border-red-500" : "border-gray-300"}`}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.email}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Addresses
                  </label>
                  {formData.addresses.map((address, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-md p-4 mb-4"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor={`fullName_${index}`}
                            className="block text-sm font-medium text-gray-700"
                          >
                            Full Name
                          </label>
                          <input
                            type="text"
                            id={`fullName_${index}`}
                            value={address.fullName || ""}
                            onChange={(e) =>
                              handleInputChange(e, index, "fullName")
                            }
                            className={`mt-1 block w-full border rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${formErrors[`address_${index}_fullName`] ? "border-red-500" : "border-gray-300"}`}
                          />
                          {formErrors[`address_${index}_fullName`] && (
                            <p className="mt-1 text-sm text-red-600">
                              {formErrors[`address_${index}_fullName`]}
                            </p>
                          )}
                        </div>
                        <div>
                          <label
                            htmlFor={`street_${index}`}
                            className="block text-sm font-medium text-gray-700"
                          >
                            Street
                          </label>
                          <input
                            type="text"
                            id={`street_${index}`}
                            value={address.street || ""}
                            onChange={(e) =>
                              handleInputChange(e, index, "street")
                            }
                            className={`mt-1 block w-full border rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${formErrors[`address_${index}_street`] ? "border-red-500" : "border-gray-300"}`}
                          />
                          {formErrors[`address_${index}_street`] && (
                            <p className="mt-1 text-sm text-red-600">
                              {formErrors[`address_${index}_street`]}
                            </p>
                          )}
                        </div>
                        <div>
                          <label
                            htmlFor={`addressLine2_${index}`}
                            className="block text-sm font-medium text-gray-700"
                          >
                            Address Line 2 (Optional)
                          </label>
                          <input
                            type="text"
                            id={`addressLine2_${index}`}
                            value={address.addressLine2 || ""}
                            onChange={(e) =>
                              handleInputChange(e, index, "addressLine2")
                            }
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`city_${index}`}
                            className="block text-sm font-medium text-gray-700"
                          >
                            City
                          </label>
                          <input
                            type="text"
                            id={`city_${index}`}
                            value={address.city || ""}
                            onChange={(e) =>
                              handleInputChange(e, index, "city")
                            }
                            className={`mt-1 block w-full border rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${formErrors[`address_${index}_city`] ? "border-red-500" : "border-gray-300"}`}
                          />
                          {formErrors[`address_${index}_city`] && (
                            <p className="mt-1 text-sm text-red-600">
                              {formErrors[`address_${index}_city`]}
                            </p>
                          )}
                        </div>
                        <div>
                          <label
                            htmlFor={`state_${index}`}
                            className="block text-sm font-medium text-gray-700"
                          >
                            State
                          </label>
                          <input
                            type="text"
                            id={`state_${index}`}
                            value={address.state || ""}
                            onChange={(e) =>
                              handleInputChange(e, index, "state")
                            }
                            className={`mt-1 block w-full border rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${formErrors[`address_${index}_state`] ? "border-red-500" : "border-gray-300"}`}
                          />
                          {formErrors[`address_${index}_state`] && (
                            <p className="mt-1 text-sm text-red-600">
                              {formErrors[`address_${index}_state`]}
                            </p>
                          )}
                        </div>
                        <div>
                          <label
                            htmlFor={`zip_${index}`}
                            className="block text-sm font-medium text-gray-700"
                          >
                            Zip Code
                          </label>
                          <input
                            type="text"
                            id={`zip_${index}`}
                            value={address.zip || ""}
                            onChange={(e) => handleInputChange(e, index, "zip")}
                            className={`mt-1 block w-full border rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${formErrors[`address_${index}_zip`] ? "border-red-500" : "border-gray-300"}`}
                          />
                          {formErrors[`address_${index}_zip`] && (
                            <p className="mt-1 text-sm text-red-600">
                              {formErrors[`address_${index}_zip`]}
                            </p>
                          )}
                        </div>
                        <div>
                          <label
                            htmlFor={`country_${index}`}
                            className="block text-sm font-medium text-gray-700"
                          >
                            Country
                          </label>
                          <input
                            type="text"
                            id={`country_${index}`}
                            value={address.country || ""}
                            onChange={(e) =>
                              handleInputChange(e, index, "country")
                            }
                            className={`mt-1 block w-full border rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${formErrors[`address_${index}_country`] ? "border-red-500" : "border-gray-300"}`}
                          />
                          {formErrors[`address_${index}_country`] && (
                            <p className="mt-1 text-sm text-red-600">
                              {formErrors[`address_${index}_country`]}
                            </p>
                          )}
                        </div>
                        <div>
                          <label
                            htmlFor={`phone_${index}`}
                            className="block text-sm font-medium text-gray-700"
                          >
                            Phone
                          </label>
                          <input
                            type="text"
                            id={`phone_${index}`}
                            value={address.phone || ""}
                            onChange={(e) =>
                              handleInputChange(e, index, "phone")
                            }
                            className={`mt-1 block w-full border rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${formErrors[`address_${index}_phone`] ? "border-red-500" : "border-gray-300"}`}
                          />
                          {formErrors[`address_${index}_phone`] && (
                            <p className="mt-1 text-sm text-red-600">
                              {formErrors[`address_${index}_phone`]}
                            </p>
                          )}
                        </div>
                        <div className="sm:col-span-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={address.isDefault || false}
                              onChange={() => handleCheckboxChange(index)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">
                              Set as Default Address
                            </span>
                          </label>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRemoveAddress(index)}
                        className="mt-4 w-full bg-red-600 text-white hover:bg-red-700"
                      >
                        Remove Address
                      </Button>
                    </div>
                  ))}
                  <Button
                    onClick={handleAddAddress}
                    className="w-full border border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    Add Address
                  </Button>
                </div>
                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setFormData({
                        name: user.name || "",
                        email: user.email || "",
                        addresses: user.addresses || [],
                      });
                      setFormErrors({});
                    }}
                    className="bg-gray-600 text-white hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    disabled={authLoading}
                  >
                    {authLoading ? "Submitting..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
