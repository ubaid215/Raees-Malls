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
import { useReview } from "../../context/ReviewContext";
import { toast } from "react-toastify";
import LoadingSkeleton from "../../components/shared/LoadingSkelaton";
import Button from "../../components/core/Button";
import socketService from "../../services/socketService";
import ReviewForm from "../../components/core/ReviewForm";

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
  const { addReview } = useReview();
  const [isLoading, setIsLoading] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedReviewItem, setSelectedReviewItem] = useState(null);
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

  // Enhanced function to extract image from any product/variant structure
  const getItemImage = (item) => {
    if (!item) return null;
    
    // Try to get image from the most specific source first
    
    // 1. Check if we have a color variant with images
    if (item.colorVariant?.images?.[0]) {
      return item.colorVariant.images[0];
    }
    
    // 2. Check if we have a storage variant with color images
    if (item.storageVariant?.color?.images?.[0]) {
      return item.storageVariant.color.images[0];
    }
    
    // 3. Check if we have a size variant with color images
    if (item.sizeVariant?.color?.images?.[0]) {
      return item.sizeVariant.color.images[0];
    }
    
    // 4. Check if we have a simple product with images
    if (item.simpleProduct?.images?.[0]) {
      return item.simpleProduct.images[0];
    }
    
    // 5. Check if the product itself has images
    if (item.productId?.images?.[0]) {
      return item.productId.images[0];
    }
    
    // 6. For storage options, check if there's a parent variant with images
    if (item.storageVariant && item.productId?.variants) {
      // Try to find any variant with images
      for (const variant of item.productId.variants) {
        if (variant.images?.[0]) return variant.images[0];
        if (variant.color?.images?.[0]) return variant.color.images[0];
      }
    }
    
    // 7. For size options, similar approach
    if (item.sizeVariant && item.productId?.variants) {
      for (const variant of item.productId.variants) {
        if (variant.images?.[0]) return variant.images[0];
        if (variant.color?.images?.[0]) return variant.color.images[0];
      }
    }
    
    return null;
  };

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

  // Helper function to calculate item price based on variant type
  const calculateItemPrice = (item) => {
    if (!item) return 0;

    switch (item.variantType) {
      case "simple":
        return (
          item.simpleProduct?.discountPrice || item.simpleProduct?.price || 0
        );
      case "color":
        return (
          item.colorVariant?.discountPrice || item.colorVariant?.price || 0
        );
      case "storage":
        return (
          item.storageVariant?.storageOption?.discountPrice ||
          item.storageVariant?.storageOption?.price ||
          0
        );
      case "size":
        return (
          item.sizeVariant?.sizeOption?.discountPrice ||
          item.sizeVariant?.sizeOption?.price ||
          0
        );
      default:
        return item.price || 0;
    }
  };

  // Helper function to get item details including quantity and total
  const getItemDetails = (item) => {
    let quantity = 0;
    let finalUnitPrice = calculateItemPrice(item);

    switch (item.variantType) {
      case "simple":
        quantity = item.simpleProduct?.quantity || 0;
        break;
      case "color":
        quantity = item.colorVariant?.quantity || 0;
        break;
      case "storage":
        quantity = item.storageVariant?.quantity || 0;
        break;
      case "size":
        quantity = item.sizeVariant?.quantity || 0;
        break;
      default:
        quantity = item.quantity || 0;
    }

    return {
      quantity,
      finalUnitPrice,
      itemTotal: quantity * finalUnitPrice,
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

  useEffect(() => {
    if (user) {
      fetchUserOrders(pagination.page);

      const setupSocket = () => {
        try {
          if (!socketService.getConnectionState()) {
            socketService.connect(user._id, user.role);
          }

          socketService.off("orderCreated");
          socketService.off("orderStatusUpdated");
          socketService.off("disconnect");
          socketService.off("reconnect");

          socketService.on("orderCreated", (newOrder) => {
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

  const handleOpenReviewModal = (productId, orderId) => {
    setSelectedReviewItem({ productId, orderId });
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async (productId, orderId, rating, comment) => {
    try {
      await addReview(productId, orderId, rating, comment);
      toast.success("Review submitted successfully");
      setIsReviewModalOpen(false);
      fetchUserOrders(pagination.page);
    } catch (err) {
      toast.error(err.message || "Failed to submit review");
    }
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
        <div className="relative flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            My Profile
          </h1>
          <Button
            onClick={handleLogout}
            className="absolute right-5  flex items-center justify-center gap-1 sm:gap-2 bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-md"
          >
            <FiLogOut className="w-3 h-3 sm:w-4 sm:h-4" />
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
                <LoadingSkeleton
                  type="text"
                  width="w-full"
                  height="h-12 sm:h-16"
                />
                <LoadingSkeleton
                  type="text"
                  width="w-full"
                  height="h-12 sm:h-16"
                />
              </div>
            ) : orderError ? (
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600 text-sm sm:text-base">
                  {orderError}
                </p>
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
                    <p className="text-gray-600 text-sm sm:text-base">
                      No orders found
                    </p>
                  ) : (
                    validOrders.slice(0, 3).map((order) => {
                      return (
                        <div
                          key={order.orderId}
                          className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/orders/${order.orderId}`)}
                        >
                          {(order.items || []).map((item, index) => {
                            const itemDetails = getItemDetails(item);
                            const itemImage = getItemImage(item);
                            const variantDetails = getVariantDetails(item);
                            
                            return (
                              <div
                                key={index}
                                className="flex gap-2 sm:gap-4 mb-2"
                              >
                                <div className="flex-shrink-0">
                                  <ProductImage
                                    image={itemImage}
                                    alt={item.productId?.title || "Product"}
                                    className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-md border border-gray-200"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2 mb-2">
                                    <div className="min-w-0">
                                      <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                                        {item.productId?.title || "Product"}
                                      </h3>
                                      {variantDetails && (
                                        <p className="text-xs text-gray-500">
                                          {variantDetails}
                                        </p>
                                      )}
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
                                        {formatPrice(itemDetails.itemTotal)}
                                      </p>
                                      {getOrderStatusBadge(order.status)}
                                    </div>
                                  </div>
                                  <p className="text-xs sm:text-sm text-gray-600">
                                    Qty: {itemDetails.quantity}
                                  </p>
                                  {order.status === "delivered" &&
                                    !item.reviewed && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenReviewModal(
                                            item.productId._id,
                                            order.orderId
                                          );
                                        }}
                                        className="mt-2 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors animate-split-bounce"
                                        title="Add Review"
                                      >
                                        <svg
                                          className="w-4 h-4 sm:w-5 sm:h-5"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                          xmlns="http://www.w3.org/2000/svg"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M12 4v16m8-8H4"
                                          />
                                        </svg>
                                      </button>
                                    )}
                                </div>
                              </div>
                            );
                          })}
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
                              {(order.items || []).map((item, index) => {
                                const itemDetails = getItemDetails(item);
                                const variantDetails = getVariantDetails(item);
                                return (
                                  <li
                                    key={index}
                                    className="flex justify-between"
                                  >
                                    <span className="text-gray-700">
                                      {itemDetails.quantity} ×{" "}
                                      {item.productId?.title ||
                                        "Untitled Product"}
                                      {variantDetails && (
                                        <span className="ml-1 text-xs text-gray-500">
                                          ({variantDetails})
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-gray-900 font-medium">
                                      {formatPrice(itemDetails.itemTotal)}
                                    </span>
                                  </li>
                                );
                              })}
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
              <div className="flex items-center justify-between w-full mt-6 gap-2">
                {/* Previous Button - Left Side */}
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span className="hidden xs:inline">Previous</span>
                </button>

                {/* Page Numbers - Center (Scrollable on small screens) */}
                <div className="flex-1 flex items-center justify-center overflow-x-auto px-2 hide-scrollbar">
                  <div className="flex items-center space-x-1 mx-auto">
                    {/* Show first page + ellipsis if needed */}
                    {pagination.page > 3 && pagination.totalPages > 5 && (
                      <>
                        <button
                          onClick={() => handlePageChange(1)}
                          className={`min-w-[36px] h-9 rounded-full flex items-center justify-center text-sm ${
                            pagination.page === 1
                              ? "bg-red-600 text-white"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          1
                        </button>
                        {pagination.page > 4 && (
                          <span className="px-1 text-gray-400">...</span>
                        )}
                      </>
                    )}

                    {/* Dynamic page numbers */}
                    {Array.from(
                      { length: Math.min(5, pagination.totalPages) },
                      (_, i) => {
                        const pageNum =
                          pagination.page <= 3
                            ? i + 1
                            : pagination.page >= pagination.totalPages - 2
                              ? pagination.totalPages - 4 + i
                              : pagination.page - 2 + i;

                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`min-w-[36px] h-9 rounded-full flex items-center justify-center text-sm ${
                              pagination.page === pageNum
                                ? "bg-red-600 text-white"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                    )}

                    {/* Show last page + ellipsis if needed */}
                    {pagination.page < pagination.totalPages - 2 &&
                      pagination.totalPages > 5 && (
                        <>
                          {pagination.page < pagination.totalPages - 3 && (
                            <span className="px-1 text-gray-400">...</span>
                          )}
                          <button
                            onClick={() =>
                              handlePageChange(pagination.totalPages)
                            }
                            className={`min-w-[36px] h-9 rounded-full flex items-center justify-center text-sm ${
                              pagination.page === pagination.totalPages
                                ? "bg-red-600 text-white"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {pagination.totalPages}
                          </button>
                        </>
                      )}
                  </div>
                </div>

                {/* Next Button - Right Side */}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                >
                  <span className="hidden xs:inline">Next</span>
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditModalOpen && (
          <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50">
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

        {isReviewModalOpen && selectedReviewItem && (
          <ReviewForm
            productId={selectedReviewItem.productId}
            orderId={selectedReviewItem.orderId}
            onSubmit={handleSubmitReview}
            onClose={() => setIsReviewModalOpen(false)}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes split-bounce {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }
        .animate-split-bounce {
          animation: split-bounce 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Profile;
