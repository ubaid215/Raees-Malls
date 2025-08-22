import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FiCheckCircle, FiClock, FiLock } from "react-icons/fi";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import Button from "../components/core/Button";
import Input from "../components/core/Input";
import PaymentAnnouncementBanner from "../components/core/PaymentAnnouncementBanner";
import { useCart } from "../context/CartContext";
import { useOrder } from "../context/OrderContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const CheckoutPage = () => {
  const location = useLocation();
  const cartState = location.state;
  const { 
    cartItems: contextCartItems, 
    clearCart, 
    totalPrice, 
    totalShippingCost 
  } = useCart();
  const { placeNewOrder } = useOrder();
  const { user, fetchUser } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [orderCounts, setOrderCounts] = useState({}); // Track order counts for variants
  const [useExistingAddress, setUseExistingAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  
  // Payment gateway integration flag - set to false to disable ordering
  const [paymentGatewayActive, setPaymentGatewayActive] = useState(false); // to enable order system make it true
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);

  // Use passed cart data or fallback to context
  const effectiveCartItems = cartState?.cartItems || contextCartItems;
  const effectiveTotalPrice = cartState?.totalPrice || totalPrice;
  const effectiveShippingCost = cartState?.totalShippingCost || totalShippingCost;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      fullName: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      country: "Pakistan",
      city: "",
      state: "",
      postalCode: "",
      saveAddress: true,
      orderNotes: "",
      billingSameAsShipping: true,
    },
  });

  // Initialize form when user data loads
  useEffect(() => {
    if (user) {
      setValue("email", user.email || "");
      
      // Check if user has saved addresses
      if (user.addresses && user.addresses.length > 0) {
        // Find default address or use first one
        const defaultAddress = user.addresses.find(addr => addr.isDefault) || user.addresses[0];
        
        setUseExistingAddress(true);
        setSelectedAddressId(defaultAddress._id?.toString() || "");
        
        // Populate form with default address
        populateAddressForm(defaultAddress);
      } else {
        // No saved addresses, use manual entry
        setUseExistingAddress(false);
        setValue("fullName", user.name || "");
      }
    }
  }, [user, setValue]);

  const populateAddressForm = (address) => {
    setValue("fullName", address.fullName || user?.name || "");
    setValue("phone", address.phone || "");
    setValue("addressLine1", address.addressLine1 || "");
    setValue("addressLine2", address.addressLine2 || "");
    setValue("city", address.city || "");
    setValue("state", address.state || "");
    setValue("postalCode", address.postalCode || "");
    setValue("country", address.country || "Pakistan");
  };

  // Handle address selection change
  const handleAddressSelection = (addressId) => {
    if (addressId === "new") {
      setUseExistingAddress(false);
      setSelectedAddressId("");
      // Clear form for manual entry
      setValue("fullName", user?.name || "");
      setValue("phone", "");
      setValue("addressLine1", "");
      setValue("addressLine2", "");
      setValue("city", "");
      setValue("state", "");
      setValue("postalCode", "");
      setValue("country", "Pakistan");
    } else {
      setUseExistingAddress(true);
      setSelectedAddressId(addressId);
      // Find and populate selected address
      const selectedAddress = user.addresses.find(addr => addr._id.toString() === addressId);
      if (selectedAddress) {
        populateAddressForm(selectedAddress);
      }
    }
  };

  const billingSameAsShipping = watch("billingSameAsShipping");

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: "/checkout" }, replace: true });
      return;
    }
    
    if ((!cartState || !cartState.cartItems) && contextCartItems.length === 0) {
      navigate("/cart");
      return;
    }
  }, [user, navigate, cartState, contextCartItems.length]);

  // Helper function to generate a unique key for each variant
  const getVariantKey = (item) => {
    if (item.storageCapacity) {
      return `storage-${item.productId?._id || item.productId}-${item.storageCapacity}`;
    } else if (item.variantColor && item.size) {
      return `size-color-${item.productId?._id || item.productId}-${item.size}-${item.variantColor}`;
    } else if (item.variantColor) {
      return `color-${item.productId?._id || item.productId}-${item.variantColor}`;
    } else if (item.size) {
      return `size-${item.productId?._id || item.productId}-${item.size}`;
    } else {
      return `simple-${item.productId?._id || item.productId}`;
    }
  };

  // Check if any variant has been ordered twice
  const hasOrderedTwice = useMemo(() => {
    return effectiveCartItems.some(item => {
      const key = getVariantKey(item);
      return orderCounts[key] >= 2;
    });
  }, [effectiveCartItems, orderCounts]);

  // Helper function to map cart items to order items
  const mapCartItemToOrderItem = (item) => {
    const productId = item.productId?._id || item.productId;
    if (!productId) {
      throw new Error(`Invalid product in cart: ${item.title}`);
    }

    // Update order count for this variant
    const variantKey = getVariantKey(item);
    setOrderCounts(prev => ({
      ...prev,
      [variantKey]: (prev[variantKey] || 0) + 1
    }));

    const baseItem = {
      productId,
      quantity: item.quantity || 1,
      price: item.discountPrice || item.price,
      title: item.title || item.productId?.title,
      image: item.image || item.productId?.images?.[0]
    };

    // 1. Products with storage capacity (storage variants)
    if (item.storageCapacity) {
      return {
        ...baseItem,
        variantType: 'storage',
        variantId: item.variantId,
        storageOptionId: item.storageOptionId || item._id,
        storageVariant: {
          storageOption: {
            capacity: item.storageCapacity,
            price: item.discountPrice || item.price,
            quantity: item.quantity || 1,
            sku: item.sku || item.productId?.sku || '',
            stock: item.stock || item.productId?.stock || 0
          },
          // Include color info if available (for storage + color combinations)
          ...(item.variantColor && {
            color: {
              name: item.variantColor,
              code: item.colorCode || '#000000'
            }
          })
        }
      };
    }

    // 2. Products with BOTH color and size options (size variants with color)
    if (item.variantColor && item.size) {
      return {
        ...baseItem,
        variantType: 'size',
        variantId: item.variantId || item._id,
        sizeOptionId: item.sizeOptionId || item._id,
        sizeVariant: {
          sizeOption: {
            size: item.size,
            price: item.discountPrice || item.price,
            quantity: item.quantity || 1,
            sku: item.sku || item.productId?.sku || '',
            stock: item.stock || item.productId?.stock || 0
          },
          color: {
            name: item.variantColor,
            code: item.colorCode || '#000000',
            image: item.colorImage || item.image?.url || null
          }
        }
      };
    }

    // 3. Products with ONLY color options (simple color variants)
    if (item.variantColor) {
      return {
        ...baseItem,
        variantType: 'color',
        variantId: item.variantId || item._id,
        colorVariant: {
          color: {
            name: item.variantColor,
            code: item.colorCode || '#000000',
            image: item.colorImage || item.image?.url || null
          },
          price: item.discountPrice || item.price,
          quantity: item.quantity || 1,
          sku: item.sku || item.productId?.sku || '',
          stock: item.stock || item.productId?.stock || 0
        }
      };
    }

    // 4. Products with ONLY size options (simple size variants)
    if (item.size) {
      return {
        ...baseItem,
        variantType: 'size',
        variantId: item.variantId || item._id,
        sizeOptionId: item.sizeOptionId || item._id,
        sizeVariant: {
          sizeOption: {
            size: item.size,
            price: item.discountPrice || item.price,
            quantity: item.quantity || 1,
            sku: item.sku || item.productId?.sku || '',
            stock: item.stock || item.productId?.stock || 0
          }
        }
      };
    }

    // 5. Simple product (no variants)
    return {
      ...baseItem,
      variantType: 'simple',
      simpleProduct: {
        price: item.discountPrice || item.price,
        quantity: item.quantity || 1,
        sku: item.sku || item.productId?.sku || '',
        stock: item.stock || item.productId?.stock || 0
      }
    };
  };

  // Memoized calculation of order totals
  const { subtotal, shipping, total } = useMemo(() => {
    const subtotal = effectiveTotalPrice || 0;

    // Calculate shipping cost - use effective shipping cost or calculate from items
    let shipping = effectiveShippingCost || 0;
    
    // If no effective shipping cost, calculate from individual items
    if (!effectiveShippingCost) {
      const uniqueProducts = new Set();
      effectiveCartItems.forEach((item) => {
        const productId = item.productId?._id || item.productId;
        if (!uniqueProducts.has(productId)) {
          shipping += item.shippingCost || 0;
          uniqueProducts.add(productId);
        }
      });
    }

    return {
      subtotal,
      shipping,
      tax: 0,
      total: subtotal + shipping,
    };
  }, [effectiveTotalPrice, effectiveShippingCost, effectiveCartItems]);

  // Modified onSubmit to handle disabled state
  const onSubmit = async (data) => {
    // Check if payment gateway is active
    if (!paymentGatewayActive) {
      setShowComingSoonModal(true);
      return;
    }

    if (effectiveCartItems.length === 0) {
      toast.error("Your cart is empty. Please add items to proceed.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare order items with proper variant handling
      const items = effectiveCartItems.map(mapCartItemToOrderItem);

      // Prepare order data based on address selection
      const orderData = {
        items,
        paymentMethod: "cash_on_delivery",
        orderNotes: data.orderNotes?.trim() || "",
        totalShippingCost: shipping,
        subtotal,
        total
      };

      // FIX: Add proper handling for existing addresses
      if (useExistingAddress && selectedAddressId) {
        // Use existing address - send both flags
        orderData.useExistingAddress = true;
        orderData.existingAddressId = selectedAddressId;
        
        // Also include the shipping address for validation/fallback
        orderData.shippingAddress = {
          fullName: data.fullName.trim(),
          addressLine1: data.addressLine1.trim(),
          addressLine2: data.addressLine2?.trim() || "",
          city: data.city.trim(),
          state: data.state.trim(),
          postalCode: data.postalCode.trim(),
          country: data.country.trim(),
          phone: data.phone.trim(),
          email: data.email.trim()
        };
      } else {
        // Use manual address entry
        orderData.useExistingAddress = false;
        orderData.shippingAddress = {
          fullName: data.fullName.trim(),
          addressLine1: data.addressLine1.trim(),
          addressLine2: data.addressLine2?.trim() || "",
          city: data.city.trim(),
          state: data.state.trim(),
          postalCode: data.postalCode.trim(),
          country: data.country.trim(),
          phone: data.phone.trim(),
          email: data.email.trim()
        };
        orderData.saveAddress = Boolean(data.saveAddress);
      }

      // Add billing address if different from shipping
      if (!billingSameAsShipping) {
        orderData.billingAddress = {
          fullName: data.billingFullName?.trim() || data.fullName.trim(),
          addressLine1: data.billingAddressLine1?.trim() || data.addressLine1.trim(),
          addressLine2: data.billingAddressLine2?.trim() || data.addressLine2?.trim() || "",
          city: data.billingCity?.trim() || data.city.trim(),
          state: data.billingState?.trim() || data.state.trim(),
          postalCode: data.billingPostalCode?.trim() || data.postalCode.trim(),
          country: data.billingCountry?.trim() || data.country.trim(),
          phone: data.billingPhone?.trim() || data.phone.trim()
        };
      }

      // Place the order
      const order = await placeNewOrder(orderData);

      // Handle successful order
      setOrderDetails({
        orderId: order.orderId,
        items: effectiveCartItems,
        total,
        createdAt: new Date().toISOString()
      });

      // Clear cart and update user if needed
      clearCart();
      if (data.saveAddress && !useExistingAddress) {
        await fetchUser(); // Refresh user data to get updated addresses
      }

      // Check if any variant has been ordered twice
      if (hasOrderedTwice) {
        setOrderSuccess(true);
        toast.success(`Order #${order.orderId} placed successfully!`, {
          autoClose: 5000
        });
      } else {
        // If no variant has been ordered twice, just show a regular success message
        toast.success(`Order #${order.orderId} placed successfully!`, {
          autoClose: 3000
        });
        // Navigate to order confirmation page
        navigate(`/orders/${order.orderId}`);
      }

    } catch (error) {
      // Log error details
      console.error("Order placement error:", {
        timestamp: new Date().toISOString(),
        errorMessage: error.message,
        errorResponse: error.response ? JSON.stringify(error.response.data, null, 2) : "No response data",
        stack: error.stack
      });

      let errorMessage = "Failed to place order. Please try again.";

      if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.join("\n");
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, {
        autoClose: 8000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Coming Soon Modal Component
  const ComingSoonModal = () => {
    if (!showComingSoonModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <FiClock className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Payment Gateway Integration in Progress
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              We're currently working with our banking partners to integrate secure online payment options. 
              Order placement will be available once the integration is complete.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg p-3">
                <FiLock className="h-4 w-4" />
                <span>Secure payment options coming soon</span>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowComingSoonModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-md text-sm"
                >
                  Continue Browsing
                </Button>
                <Button
                  onClick={() => navigate("/products")}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm"
                >
                  Shop More
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (orderSuccess && orderDetails) {
    return (
      <div className="w-full min-h-screen bg-gray-100 flex items-center justify-center px-4 py-6">
        <div className="max-w-sm w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <FiCheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Order Placed Successfully!
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Your order ID: <span className="font-bold">{orderDetails.orderId}</span>
          </p>
          <p className="text-sm text-gray-600 mb-6">
            We've sent a confirmation to your email.
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={() => navigate(`/orders/${orderDetails.orderId}`)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm"
            >
              View Order Details
            </Button>
            <Button
              onClick={() => navigate("/products")}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md text-sm"
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (effectiveCartItems.length === 0) {
    return (
      <div className="w-full min-h-screen bg-gray-100 flex items-center justify-center px-4 py-6">
        <div className="max-w-sm w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Your Cart is Empty
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            You haven't added any items to your cart yet.
          </p>
          <Button
            onClick={() => navigate("/products")}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md text-sm"
          >
            Browse Products
          </Button>
        </div>
      </div>
    );
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="w-full min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 text-center">
          Checkout
        </h1>

        {/* Payment Gateway Announcement Banner */}
        <PaymentAnnouncementBanner />

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="checkout-form">
              
              {/* Contact Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Contact Information
                </h2>
                <Input
                  label="Email address"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Invalid email address",
                    },
                  })}
                  type="email"
                  error={errors.email?.message}
                  disabled={!paymentGatewayActive}
                />
              </div>

              {/* Address Selection */}
              {user?.addresses && user.addresses.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    Shipping Address
                  </h2>
                  
                  <div className="space-y-3 mb-4">
                    {user.addresses.map((address) => (
                      <div key={address._id} className="border border-gray-200 rounded-lg p-3">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="addressSelection"
                            value={address._id}
                            checked={selectedAddressId === address._id.toString()}
                            onChange={(e) => handleAddressSelection(e.target.value)}
                            className="mt-1 text-red-600 focus:ring-red-500"
                            disabled={!paymentGatewayActive}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {address.fullName}
                              {address.isDefault && (
                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {address.addressLine1}
                              {address.addressLine2 && `, ${address.addressLine2}`}
                            </div>
                            <div className="text-sm text-gray-600">
                              {address.city}, {address.state} {address.postalCode}
                            </div>
                            <div className="text-sm text-gray-600">
                              {address.country} • {address.phone}
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                    
                    {/* Add new address option */}
                    <div className="border border-gray-200 rounded-lg p-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="addressSelection"
                          value="new"
                          checked={!useExistingAddress}
                          onChange={(e) => handleAddressSelection(e.target.value)}
                          className="text-red-600 focus:ring-red-500"
                          disabled={!paymentGatewayActive}
                        />
                        <span className="font-medium text-gray-900">
                          Use a new address
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Address Entry */}
              {(!useExistingAddress || !user?.addresses?.length) && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    Shipping Information
                  </h2>

                  <div className="space-y-3">
                    <Input
                      label="Full Name"
                      {...register("fullName", { 
                        required: "Full name is required",
                        maxLength: {
                          value: 100,
                          message: "Cannot exceed 100 characters",
                        },
                      })}
                      error={errors.fullName?.message}
                      disabled={!paymentGatewayActive}
                    />

                    <Input
                      label="Phone Number"
                      {...register("phone", {
                        required: "Phone number is required",
                        pattern: {
                          value: /^\+?[\d\s-]{6,14}$/,
                          message: "Invalid phone number format",
                        },
                      })}
                      type="tel"
                      placeholder="e.g. +92 3001234567"
                      error={errors.phone?.message}
                      disabled={!paymentGatewayActive}
                    />

                    <Input
                      label="Address Line 1"
                      {...register("addressLine1", { 
                        required: "Address is required",
                        maxLength: {
                          value: 200,
                          message: "Cannot exceed 200 characters",
                        },
                      })}
                      error={errors.addressLine1?.message}
                      disabled={!paymentGatewayActive}
                    />

                    <Input
                      label="Address Line 2 (Optional)"
                      {...register("addressLine2", {
                        maxLength: {
                          value: 200,
                          message: "Cannot exceed 200 characters",
                        },
                      })}
                      disabled={!paymentGatewayActive}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        label="City"
                        {...register("city", { 
                          required: "City is required",
                          maxLength: {
                            value: 50,
                            message: "Cannot exceed 50 characters",
                          },
                        })}
                        error={errors.city?.message}
                        disabled={!paymentGatewayActive}
                      />

                      <Input
                        label="State/Province"
                        {...register("state", { 
                          required: "State is required",
                          maxLength: {
                            value: 50,
                            message: "Cannot exceed 50 characters",
                          },
                        })}
                        error={errors.state?.message}
                        disabled={!paymentGatewayActive}
                      />

                      <Input
                        label="Postal Code"
                        {...register("postalCode", { 
                          required: "Postal code is required",
                          maxLength: {
                            value: 20,
                            message: "Cannot exceed 20 characters",
                          },
                        })}
                        error={errors.postalCode?.message}
                        disabled={!paymentGatewayActive}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country
                      </label>
                      <select
                        {...register("country", { required: "Country is required" })}
                        className="w-full border border-gray-300 rounded-md p-2 text-sm"
                        disabled={!paymentGatewayActive}
                      >
                        <option value="Pakistan">Pakistan</option>
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          {...register("saveAddress")}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          disabled={!paymentGatewayActive}
                        />
                        <span className="ml-2 text-sm text-gray-600">
                          Save this address for future orders
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Billing Information
                </h2>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register("billingSameAsShipping")}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      disabled={!paymentGatewayActive}
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      Same as shipping address
                    </span>
                  </label>
                </div>

                {!billingSameAsShipping && (
                  <div className="space-y-3">
                    <Input
                      label="Full Name"
                      {...register("billingFullName", {
                        required: "Billing name is required",
                        maxLength: {
                          value: 100,
                          message: "Cannot exceed 100 characters",
                        },
                      })}
                      error={errors.billingFullName?.message}
                    />

                    <Input
                      label="Phone Number"
                      {...register("billingPhone", {
                        required: "Billing phone is required",
                        pattern: {
                          value: /^\+?[\d\s-]{6,14}$/,
                          message: "Invalid phone number format",
                        },
                      })}
                      error={errors.billingPhone?.message}
                    />

                    <Input
                      label="Address Line 1"
                      {...register("billingAddressLine1", {
                        required: "Billing address is required",
                        maxLength: {
                          value: 200,
                          message: "Cannot exceed 200 characters",
                        },
                      })}
                      error={errors.billingAddressLine1?.message}
                    />

                    <Input
                      label="Address Line 2 (Optional)"
                      {...register("billingAddressLine2", {
                        maxLength: {
                          value: 200,
                          message: "Cannot exceed 200 characters",
                        },
                      })}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        label="City"
                        {...register("billingCity", {
                          required: "Billing city is required",
                          maxLength: {
                            value: 50,
                            message: "Cannot exceed 50 characters",
                          },
                        })}
                        error={errors.billingCity?.message}
                      />

                      <Input
                        label="State/Province"
                        {...register("billingState", {
                          required: "Billing state is required",
                          maxLength: {
                            value: 50,
                            message: "Cannot exceed 50 characters",
                          },
                        })}
                        error={errors.billingState?.message}
                      />

                      <Input
                        label="Postal Code"
                        {...register("billingPostalCode", {
                          required: "Billing postal code is required",
                          maxLength: {
                            value: 20,
                            message: "Cannot exceed 20 characters",
                          },
                        })}
                        error={errors.billingPostalCode?.message}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country
                      </label>
                      <select
                        {...register("billingCountry", { required: "Country is required" })}
                        className="w-full border border-gray-300 rounded-md p-2 text-sm"
                      >
                        <option value="Pakistan">Pakistan</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Notes */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Order Notes (Optional)
                </h2>
                <textarea
                  {...register("orderNotes", {
                    maxLength: {
                      value: 500,
                      message: "Cannot exceed 500 characters",
                    },
                  })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  rows={3}
                  placeholder="Special instructions, delivery notes, etc."
                />
              </div>

              {/* Submit Button - Mobile */}
              <div className="lg:hidden">
                <Button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-md font-medium"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                >
                  {isSubmitting ? "Placing Order..." : "Place Order"}
                </Button>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:w-80 lg:sticky lg:top-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Order Summary
              </h2>

              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {effectiveCartItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image?.url || item.productId?.images?.[0]?.url || "/placeholder.png"}
                        alt={item.title}
                        className="w-12 h-12 object-cover rounded-md border border-gray-200"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.title || item.productId?.title}
                        </p>
                        <p className="text-xs text-gray-600">
                          Qty: {item.quantity} × {formatPrice(item.discountPrice || item.price)}
                        </p>
                        {/* Display variant info */}
                        {(item.variantColor || item.storageCapacity || item.size) && (
                          <p className="text-xs text-gray-500">
                            {[item.variantColor, item.storageCapacity, item.size].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatPrice((item.discountPrice || item.price) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-gray-200 pt-3 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>{shipping === 0 ? "FREE" : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              {/* Submit Button - Desktop */}
              <div className="hidden lg:block">
                <Button
                  type="submit"
                  form="checkout-form"
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md text-sm mb-3"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                >
                  {isSubmitting ? "Placing Order..." : "Place Order"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;