import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FiCheckCircle, FiCreditCard, FiLock, FiTruck, FiMapPin } from "react-icons/fi";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import Button from "../components/core/Button";
import Input from "../components/core/Input";
import { useCart } from "../context/CartContext";
import { useOrder } from "../context/OrderContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Wallet, Banknote, Shield, CreditCard } from "lucide-react";

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
  const [orderCounts, setOrderCounts] = useState({});
  const [useExistingAddress, setUseExistingAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("cash_on_delivery");

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

  // Payment methods configuration with enhanced styling
  const paymentMethods = [
    {
      id: "cash_on_delivery",
      name: "Cash on Delivery",
      description: "Pay when you receive your order",
      icon: <FiTruck className="h-5 w-5" />,
      available: true,
      color: "emerald"
    },
    {
      id: "credit_card",
      name: "Credit/Debit Card",
      description: "Pay securely with your card",
      icon: <CreditCard className="h-5 w-5" />,
      available: true,
      color: "blue"
    },
    {
      id: "alfa_wallet",
      name: "Alfa Wallet",
      description: "Pay using your Alfa Wallet",
      icon: <Wallet className="h-5 w-5" />,
      available: true,
      color: "purple"
    },
    {
      id: "alfalah_bank",
      name: "Alfalah Bank",
      description: "Pay via Alfalah Bank Account",
      icon: <Banknote className="h-5 w-5" />,
      available: true,
      color: "green"
    }
  ];

  const getPaymentMethodColor = (methodId) => {
    const method = paymentMethods.find(m => m.id === methodId);
    return method?.color || "gray";
  };

  // Initialize form when user data loads
  useEffect(() => {
    if (user) {
      setValue("email", user.email || "");
      
      // Check if user has saved addresses
      if (user.addresses && user.addresses.length > 0) {
        const defaultAddress = user.addresses.find(addr => addr.isDefault) || user.addresses[0];
        setUseExistingAddress(true);
        setSelectedAddressId(defaultAddress._id?.toString() || "");
        populateAddressForm(defaultAddress);
      } else {
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

    // Handle different variant types
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
          ...(item.variantColor && {
            color: {
              name: item.variantColor,
              code: item.colorCode || '#000000'
            }
          })
        }
      };
    }

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

    // Simple product (no variants)
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
    let shipping = effectiveShippingCost || 0;
    
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

  // Modified onSubmit to handle payment methods
  const onSubmit = async (data) => {
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
        paymentMethod: selectedPaymentMethod,
        orderNotes: data.orderNotes?.trim() || "",
        totalShippingCost: shipping,
        subtotal,
        total
      };

      // Handle address selection
      if (useExistingAddress && selectedAddressId) {
        orderData.useExistingAddress = true;
        orderData.existingAddressId = selectedAddressId;
        
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
      const result = await placeNewOrder(orderData);

      // Handle successful order placement
      if (result.payment) {
        // Online payment - redirect to payment processing
        toast.info("Redirecting to payment gateway...");
      } else {
        // COD order - show success
        setOrderDetails({
          orderId: result.order.orderId,
          items: effectiveCartItems,
          total,
          createdAt: new Date().toISOString()
        });

        // Clear cart and update user if needed
        clearCart();
        if (data.saveAddress && !useExistingAddress) {
          await fetchUser();
        }

        // Show success message
        if (hasOrderedTwice) {
          setOrderSuccess(true);
          toast.success(`Order #${result.order.orderId} placed successfully!`, {
            autoClose: 5000
          });
        } else {
          toast.success(`Order #${result.order.orderId} placed successfully!`, {
            autoClose: 3000
          });
          navigate(`/orders/${result.order.orderId}`);
        }
      }

    } catch (error) {
      console.error("Order placement error:", error);
      let errorMessage = "Failed to place order. Please try again.";

      if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.join("\n");
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { autoClose: 8000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess && orderDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiCheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Order Placed Successfully!
          </h2>
          <p className="text-gray-600 mb-2">
            Your order ID: <span className="font-semibold text-blue-600">{orderDetails.orderId}</span>
          </p>
          <p className="text-gray-600 mb-6">
            We've sent a confirmation to your email.
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={() => navigate(`/orders/${orderDetails.orderId}`)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105"
            >
              View Order Details
            </Button>
            <Button
              onClick={() => navigate("/products")}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 rounded-xl font-medium transition-all duration-200"
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiMapPin className="h-10 w-10 text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Your Cart is Empty
          </h2>
          <p className="text-gray-600 mb-6">
            You haven't added any items to your cart yet.
          </p>
          <Button
            onClick={() => navigate("/products")}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Checkout
          </h1>
          <p className="text-gray-600">Complete your purchase securely</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Form Section */}
          <div className="flex-1">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" id="checkout-form">
              
              {/* Contact Information */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FiMapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Contact Information
                  </h2>
                </div>
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
                  className="bg-gray-50 border-gray-200 focus:border-blue-500"
                />
              </div>

              {/* Payment Method Selection */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Payment Method
                  </h2>
                </div>
                <div className="grid gap-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                        selectedPaymentMethod === method.id
                          ? `border-${method.color}-500 bg-${method.color}-50 shadow-sm`
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => method.available && setSelectedPaymentMethod(method.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`text-${method.color}-600`}>
                            {method.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {method.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {method.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method.id}
                            checked={selectedPaymentMethod === method.id}
                            onChange={() => method.available && setSelectedPaymentMethod(method.id)}
                            className={`text-${method.color}-600 focus:ring-${method.color}-500`}
                            disabled={!method.available}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Address Selection */}
              {user?.addresses && user.addresses.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FiMapPin className="h-4 w-4 text-purple-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Shipping Address
                    </h2>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    {user.addresses.map((address) => (
                      <div key={address._id} className={`border-2 rounded-xl p-4 transition-all ${
                        selectedAddressId === address._id.toString() 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <label className="flex items-start gap-4 cursor-pointer">
                          <input
                            type="radio"
                            name="addressSelection"
                            value={address._id}
                            checked={selectedAddressId === address._id.toString()}
                            onChange={(e) => handleAddressSelection(e.target.value)}
                            className="mt-1 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">
                                {address.fullName}
                              </span>
                              {address.isDefault && (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-2 space-y-1">
                              <p>{address.addressLine1}{address.addressLine2 && `, ${address.addressLine2}`}</p>
                              <p>{address.city}, {address.state} {address.postalCode}</p>
                              <p>{address.country} • {address.phone}</p>
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                    
                    {/* Add new address option */}
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-gray-400 transition-colors">
                      <label className="flex items-center gap-4 cursor-pointer">
                        <input
                          type="radio"
                          name="addressSelection"
                          value="new"
                          checked={!useExistingAddress}
                          onChange={(e) => handleAddressSelection(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="font-semibold text-gray-900">
                            Use a new address
                          </span>
                          <p className="text-sm text-gray-600 mt-1">
                            Enter a different shipping address
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Address Entry */}
              {(!useExistingAddress || !user?.addresses?.length) && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FiMapPin className="h-4 w-4 text-orange-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Shipping Information
                    </h2>
                  </div>

                  <div className="grid gap-4">
                    <div className="grid md:grid-cols-2 gap-4">
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
                        className="bg-gray-50 border-gray-200 focus:border-blue-500"
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
                        className="bg-gray-50 border-gray-200 focus:border-blue-500"
                      />
                    </div>

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
                      className="bg-gray-50 border-gray-200 focus:border-blue-500"
                    />

                    <Input
                      label="Address Line 2 (Optional)"
                      {...register("addressLine2", {
                        maxLength: {
                          value: 200,
                          message: "Cannot exceed 200 characters",
                        },
                      })}
                      className="bg-gray-50 border-gray-200 focus:border-blue-500"
                    />

                    <div className="grid md:grid-cols-3 gap-4">
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
                        className="bg-gray-50 border-gray-200 focus:border-blue-500"
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
                        className="bg-gray-50 border-gray-200 focus:border-blue-500"
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
                        className="bg-gray-50 border-gray-200 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <select
                        {...register("country", { required: "Country is required" })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                      >
                        <option value="Pakistan">Pakistan</option>
                      </select>
                    </div>

                    <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                      <input
                        type="checkbox"
                        {...register("saveAddress")}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        Save this address for future orders
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Information */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Billing Information
                  </h2>
                </div>
                
                <div className="flex items-center p-4 bg-gray-50 rounded-xl mb-4">
                  <input
                    type="checkbox"
                    {...register("billingSameAsShipping")}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-gray-700 font-medium">
                    Same as shipping address
                  </span>
                </div>

                {!billingSameAsShipping && (
                  <div className="grid gap-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        label="Full Name"
                        {...register("billingFullName", {
                          required: "Billing name is required",
                        })}
                        error={errors.billingFullName?.message}
                        className="bg-white border-blue-200 focus:border-blue-500"
                      />

                      <Input
                        label="Phone Number"
                        {...register("billingPhone", {
                          required: "Billing phone is required",
                        })}
                        error={errors.billingPhone?.message}
                        className="bg-white border-blue-200 focus:border-blue-500"
                      />
                    </div>

                    <Input
                      label="Address Line 1"
                      {...register("billingAddressLine1", {
                        required: "Billing address is required",
                      })}
                      error={errors.billingAddressLine1?.message}
                      className="bg-white border-blue-200 focus:border-blue-500"
                    />

                    <Input
                      label="Address Line 2 (Optional)"
                      {...register("billingAddressLine2")}
                      className="bg-white border-blue-200 focus:border-blue-500"
                    />

                    <div className="grid md:grid-cols-3 gap-4">
                      <Input
                        label="City"
                        {...register("billingCity", {
                          required: "Billing city is required",
                        })}
                        error={errors.billingCity?.message}
                        className="bg-white border-blue-200 focus:border-blue-500"
                      />

                      <Input
                        label="State/Province"
                        {...register("billingState", {
                          required: "Billing state is required",
                        })}
                        error={errors.billingState?.message}
                        className="bg-white border-blue-200 focus:border-blue-500"
                      />

                      <Input
                        label="Postal Code"
                        {...register("billingPostalCode", {
                          required: "Billing postal code is required",
                        })}
                        error={errors.billingPostalCode?.message}
                        className="bg-white border-blue-200 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Order Notes */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <FiMapPin className="h-4 w-4 text-gray-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Order Notes (Optional)
                  </h2>
                </div>
                <textarea
                  {...register("orderNotes", {
                    maxLength: {
                      value: 500,
                      message: "Cannot exceed 500 characters",
                    },
                  })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                  rows={4}
                  placeholder="Special instructions, delivery notes, gift messages, etc."
                />
              </div>

              {/* Submit Button - Mobile */}
              <div className="lg:hidden bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky bottom-0">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                >
                  {isSubmitting ? "Placing Order..." : 
                   selectedPaymentMethod === "cash_on_delivery" ? "Place Order" : 
                   "Proceed to Payment"}
                </Button>
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-600">
                  <FiLock className="h-4 w-4" />
                  <span>Secure SSL Encryption</span>
                </div>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:w-96">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6 max-h-80 overflow-y-auto">
                {effectiveCartItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                    <img
                      src={item.image?.url || item.productId?.images?.[0]?.url || "/placeholder.png"}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {item.title || item.productId?.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Qty: {item.quantity} × {formatPrice(item.discountPrice || item.price)}
                      </p>
                      {(item.variantColor || item.storageCapacity || item.size) && (
                        <p className="text-xs text-gray-500 mt-1">
                          {[item.variantColor, item.storageCapacity, item.size].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {formatPrice((item.discountPrice || item.price) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium text-gray-900">{shipping === 0 ? "FREE" : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-blue-600">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Payment Method Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-700">
                  <strong className="text-gray-900">Payment Method:</strong> {
                    paymentMethods.find(m => m.id === selectedPaymentMethod)?.name
                  }
                </p>
              </div>

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200 mb-4">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Secure Checkout</span>
              </div>

              {/* Submit Button - Desktop */}
              <div className="hidden lg:block">
                <Button
                  type="submit"
                  form="checkout-form"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                >
                  {isSubmitting ? "Placing Order..." : 
                   selectedPaymentMethod === "cash_on_delivery" ? "Place Order" : 
                   "Proceed to Payment"}
                </Button>
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-600">
                  <FiLock className="h-4 w-4" />
                  <span>Your payment information is secure</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;