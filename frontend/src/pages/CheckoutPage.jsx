import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FiCheckCircle } from "react-icons/fi";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import Button from "../components/core/Button";
import Input from "../components/core/Input";
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

  // Use passed cart data or fallback to context
  const effectiveCartItems = cartState?.cartItems || contextCartItems;
  const effectiveTotalPrice = cartState?.totalPrice || totalPrice;
  const effectiveShippingCost = cartState?.totalShippingCost || totalShippingCost;

  // Default address handling with better fallbacks
  const getDefaultAddress = useCallback(() => {
    return (
      user?.addresses?.find((addr) => addr.isDefault) ||
      user?.addresses?.[0] || 
      {
        fullName: user?.name || "",
        phone: "",
        addressLine1: "",
        city: "",
        state: "",
        postalCode: "",
        country: "Pakistan"
      }
    );
  }, [user]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: user?.email || "",
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

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      const defaultAddress = getDefaultAddress();
      setValue("email", user.email || "");
      setValue("fullName", defaultAddress.fullName || "");
      setValue("phone", defaultAddress.phone || "");
      setValue("addressLine1", defaultAddress.addressLine1 || "");
      setValue("addressLine2", defaultAddress.addressLine2 || "");
      setValue("country", defaultAddress.country || "Pakistan");
      setValue("city", defaultAddress.city || "");
      setValue("state", defaultAddress.state || "");
      setValue("postalCode", defaultAddress.postalCode || "");
    }
  }, [user, getDefaultAddress, setValue]);

  const billingSameAsShipping = watch("billingSameAsShipping");

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: "/checkout" }, replace: true });
      return;
    }
    
    // If no cart data passed and no items in context, redirect to cart
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

    // Log the item being processed for debugging
    console.log("Processing cart item:", {
      productId,
      variantColor: item.variantColor,
      storageCapacity: item.storageCapacity,
      size: item.size,
      price: item.discountPrice || item.price,
      stock: item.stock || item.productId?.stock,
      variantId: item.variantId,
      storageOptionId: item.storageOptionId,
      sizeOptionId: item.sizeOptionId
    });

    const baseItem = {
      productId,
      quantity: item.quantity || 1,
      price: item.discountPrice || item.price,
      title: item.title || item.productId?.title,
      image: item.image || item.productId?.images?.[0]
    };

    // Ensure price and stock are valid numbers
    const itemPrice = item.discountPrice || item.price || 0;
    const itemStock = item.stock || item.productId?.stock || 0;
    const itemSku = item.sku || item.productId?.sku || '';

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
            price: itemPrice,
            quantity: item.quantity || 1,
            sku: itemSku,
            stock: itemStock
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
            price: itemPrice,
            quantity: item.quantity || 1,
            sku: itemSku,
            stock: itemStock
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
          price: itemPrice,
          quantity: item.quantity || 1,
          sku: itemSku,
          stock: itemStock
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
            price: itemPrice,
            quantity: item.quantity || 1,
            sku: itemSku,
            stock: itemStock
          }
        }
      };
    }

    // 5. Simple product (no variants)
    return {
      ...baseItem,
      variantType: 'simple',
      simpleProduct: {
        price: itemPrice,
        quantity: item.quantity || 1,
        sku: itemSku,
        stock: itemStock
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

  const onSubmit = async (data) => {
    if (effectiveCartItems.length === 0) {
      toast.error("Your cart is empty. Please add items to proceed.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare order items with proper variant handling
      const items = effectiveCartItems.map(mapCartItemToOrderItem);

      // Prepare shipping address
      const shippingAddress = {
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

      // Prepare the complete order data
      const orderData = {
        items,
        shippingAddress,
        saveAddress: Boolean(data.saveAddress),
        paymentMethod: "cash_on_delivery",
        orderNotes: data.orderNotes?.trim() || "",
        totalShippingCost: shipping,
        subtotal,
        total
      };

      // Add billing address if different from shipping
      if (!billingSameAsShipping) {
        orderData.billingAddress = {
          fullName: data.billingFullName?.trim() || shippingAddress.fullName,
          addressLine1: data.billingAddressLine1?.trim() || shippingAddress.addressLine1,
          addressLine2: data.billingAddressLine2?.trim() || shippingAddress.addressLine2,
          city: data.billingCity?.trim() || shippingAddress.city,
          state: data.billingState?.trim() || shippingAddress.state,
          postalCode: data.billingPostalCode?.trim() || shippingAddress.postalCode,
          country: data.billingCountry?.trim() || shippingAddress.country,
          phone: data.billingPhone?.trim() || shippingAddress.phone
        };
      }

      // Log the complete order data being sent to the backend
      console.log("Submitting order to backend:", {
        timestamp: new Date().toISOString(),
        orderData: JSON.stringify(orderData, null, 2),
        userId: user?._id || "unknown",
        cartItemsCount: effectiveCartItems.length,
        totalAmount: total
      });

      // Place the order
      const order = await placeNewOrder(orderData);

      // Log successful order response
      console.log("Order placement successful:", {
        timestamp: new Date().toISOString(),
        orderId: order.orderId,
        response: JSON.stringify(order, null, 2)
      });

      // Handle successful order
      setOrderDetails({
        orderId: order.orderId,
        items: effectiveCartItems,
        total,
        shippingAddress,
        createdAt: new Date().toISOString()
      });

      // Clear cart and update user if needed
      clearCart();
      if (data.saveAddress) {
        await fetchUser();
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

  if (orderSuccess && orderDetails) {
    return (
      <OrderConfirmation 
        orderDetails={orderDetails} 
        navigate={navigate} 
      />
    );
  }

  if (effectiveCartItems.length === 0) {
    return (
      <EmptyCart navigate={navigate} />
    );
  }

  return (
    <CheckoutForm
      register={register}
      errors={errors}
      handleSubmit={handleSubmit}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      billingSameAsShipping={billingSameAsShipping}
      cartItems={effectiveCartItems}
      subtotal={subtotal}
      shipping={shipping}
      total={total}
    />
  );
};

// Extracted components for better readability

const OrderConfirmation = ({ orderDetails, navigate }) => (
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


const EmptyCart = ({ navigate }) => (
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

const CheckoutForm = ({
  register,
  errors,
  handleSubmit,
  onSubmit,
  isSubmitting,
  billingSameAsShipping,
  cartItems,
  subtotal,
  shipping,
  total
}) => (
  <div className="w-full min-h-screen bg-gray-100 px-4 py-6">
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 text-center">
        Checkout
      </h1>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="checkout-form">
            <ContactInformation register={register} errors={errors} />
            <ShippingInformation register={register} errors={errors} />
            <BillingInformation 
              register={register} 
              errors={errors} 
              billingSameAsShipping={billingSameAsShipping} 
            />
            <OrderNotes register={register} />

            {/* Submit Button - Mobile */}
            <div className="lg:hidden">
              <OrderButton isSubmitting={isSubmitting} />
            </div>
          </form>
        </div>

        <OrderSummary 
          cartItems={cartItems}
          subtotal={subtotal}
          shipping={shipping}
          total={total}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  </div>
);

const ContactInformation = ({ register, errors }) => (
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
    />
  </div>
);

const ShippingInformation = ({ register, errors }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
    <h2 className="text-lg font-semibold text-gray-900 mb-3">
      Shipping Information
    </h2>

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
    />

    <Input
      label="Address Line 2 (Optional)"
      {...register("addressLine2", {
        maxLength: {
          value: 200,
          message: "Cannot exceed 200 characters",
        },
      })}
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
      />
    </div>

    <CountrySelect register={register} />

    <div className="mt-4">
      <label className="flex items-center">
        <input
          type="checkbox"
          {...register("saveAddress")}
          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
        />
        <span className="ml-2 text-sm text-gray-600">
          Save this address for future orders
        </span>
      </label>
    </div>
  </div>
);

const CountrySelect = ({ register, namePrefix = "" }) => (
  <div className="mt-3">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Country
    </label>
    <select
      {...register(`${namePrefix ? namePrefix + "Country" : "country"}`, {
        required: "Country is required",
      })}
      className="w-full border border-gray-300 rounded-md p-2 text-sm"
    >
      <option value="Pakistan">Pakistan</option>
    </select>
  </div>
);

const BillingInformation = ({ register, errors, billingSameAsShipping }) => (
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

        <CountrySelect register={register} namePrefix="billing" />
      </div>
    )}
  </div>
);

const OrderNotes = ({ register }) => (
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
);

const OrderSummary = ({ cartItems, subtotal, shipping, total, isSubmitting }) => (
  <div className="lg:w-80 lg:sticky lg:top-6">
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Order Summary
      </h2>

      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        {cartItems.map((item, index) => (
          <CartItem 
            key={`${item.productId?._id || item.productId}-${item.variantId || index}`} 
            item={item} 
          />
        ))}
      </div>

      <OrderTotals subtotal={subtotal} shipping={shipping} total={total} />

      {/* Submit Button - Desktop */}
      <div className="hidden lg:block">
        <OrderButton isSubmitting={isSubmitting} />
      </div>
    </div>
  </div>
);

const CartItem = ({ item }) => (
  <div className="flex items-center justify-between gap-2">
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
);

const OrderTotals = ({ subtotal, shipping, total }) => (
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
);

const OrderButton = ({ isSubmitting }) => (
  <Button
    type="submit"
    form="checkout-form"
    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md text-sm mb-3"
    disabled={isSubmitting}
    loading={isSubmitting}
  >
    {isSubmitting ? "Placing Order..." : "Place Order"}
  </Button>
);

const formatPrice = (price) => {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format(price);
};

export default CheckoutPage;