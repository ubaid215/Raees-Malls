import React, { useState, useEffect } from "react";
import { FiCheckCircle } from "react-icons/fi";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import Button from "../components/core/Button";
import Input from "../components/core/Input";
import { useCart } from "../context/CartContext";
import { useOrder } from "../context/OrderContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const CheckoutPage = () => {
  const { cartItems, clearCart } = useCart();
  const { placeOrder } = useOrder();
  const { user, fetchUser } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);

  // Default address handling
  const defaultAddress =
    user?.addresses?.find((addr) => addr.isDefault) ||
    user?.addresses?.[0] || {};

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: user?.email || "",
      fullName: defaultAddress.fullName || "",
      phone: defaultAddress.phone || "",
      addressLine1: defaultAddress.addressLine1 || "",
      addressLine2: defaultAddress.addressLine2 || "",
      country: defaultAddress.country || "Pakistan",
      city: defaultAddress.city || "",
      state: defaultAddress.state || "",
      postalCode: defaultAddress.postalCode || "",
      saveAddress: true,
      orderNotes: "",
      billingSameAsShipping: true,
    },
  });

  const billingSameAsShipping = watch("billingSameAsShipping");

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: "/checkout" } });
    }
  }, [user, navigate]);

  const calculateTotal = () => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + (item.discountPrice || item.price) * item.quantity,
      0
    );

    // Calculate shipping cost (once per unique product)
    const uniqueProducts = new Set();
    let shipping = 0;

    cartItems.forEach((item) => {
      const productId = item.productId?._id || item.productId;
      if (!uniqueProducts.has(productId)) {
        shipping += item.shippingCost || 0;
        uniqueProducts.add(productId);
      }
    });

    // Apply free shipping for orders over 2500 PKR or 10+ items
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    shipping = subtotal >= 2500 || totalItems >= 10 ? 0 : shipping;

    return {
      subtotal,
      shipping,
      tax: 0,
      total: subtotal + shipping,
    };
  };

  const getVariantDetails = (item) => {
    if (!item.productId) return {};
    
    const variantInfo = {};
    const product = item.productId;
    
    if (item.variantId && product.variants) {
      const variant = product.variants.find(v => v._id === item.variantId);
      if (variant) {
        if (variant.colorName) variantInfo.colorName = variant.colorName;
        if (variant.storageCapacity) variantInfo.storageCapacity = variant.storageCapacity;
        if (variant.size) variantInfo.size = variant.size;
      }
    }
    
    return variantInfo;
  };

  const onSubmit = async (data) => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty. Please add items to proceed.");
      return;
    }

    setIsSubmitting(true);

    try {
      const items = cartItems.map((item) => {
        const productId = item.productId?._id || item.productId;
        if (!productId) throw new Error("Product ID is missing");

        const variantInfo = getVariantDetails(item);
        
        return {
          productId,
          quantity: item.quantity,
          variantId: item.variantId || undefined,
          variantInfo: Object.keys(variantInfo).length > 0 ? variantInfo : undefined
        };
      });

      const { subtotal, shipping } = calculateTotal();

      // Prepare the complete order data
      const orderData = {
        items,
        shippingAddress: {
          fullName: data.fullName.trim(),
          addressLine1: data.addressLine1.trim(),
          addressLine2: data.addressLine2?.trim() || "",
          city: data.city.trim(),
          state: data.state.trim(),
          postalCode: data.postalCode.trim(),
          country: data.country.trim(),
          phone: data.phone.trim(),
          email: data.email.trim()
        },
        saveAddress: Boolean(data.saveAddress),
        paymentMethod: "cash_on_delivery",
        orderNotes: data.orderNotes?.trim() || "",
        totalShippingCost: shipping
      };

      // Add billing address if different from shipping
      if (!billingSameAsShipping) {
        orderData.billingAddress = {
          fullName: data.billingFullName.trim(),
          addressLine1: data.billingAddressLine1.trim(),
          addressLine2: data.billingAddressLine2?.trim() || "",
          city: data.billingCity.trim(),
          state: data.billingState.trim(),
          postalCode: data.billingPostalCode.trim(),
          country: data.billingCountry?.trim() || "Pakistan",
          phone: data.billingPhone.trim()
        };
      }

      console.log("Submitting order:", orderData);

      // Place the order
      const order = await placeOrder(orderData);

      // Handle successful order
      setOrderDetails({
        orderId: order.orderId,
        items: cartItems,
        total: calculateTotal().total,
        shippingAddress: orderData.shippingAddress
      });

      clearCart();
      if (data.saveAddress) await fetchUser();

      setOrderSuccess(true);
      toast.success(`Order #${order.orderId} placed successfully!`);

    } catch (error) {
      console.error("Order placement error:", error);
      let errorMessage = "Failed to place order.";

      if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.join("\n");
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
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
          
          <div className="space-y-3">
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

  if (cartItems.length === 0) {
    return (
      <div className="w-full min-h-screen bg-gray-100 flex items-center justify-center px-4 py-6">
        <div className="max-w-sm w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Your Cart is Empty
          </h2>
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

  const { subtotal, shipping, total } = calculateTotal();

  return (
    <div className="w-full min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 text-center">
          Checkout
        </h1>

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
                />
              </div>

              {/* Shipping Information */}
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

                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <select
                    {...register("country", {
                      required: "Country is required",
                    })}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  >
                    <option value="Pakistan">Pakistan</option>
                    <option value="United States">United States</option>
                  </select>
                </div>

                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register("saveAddress")}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      Save this address
                    </span>
                  </label>
                </div>
              </div>

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
                  placeholder="Special instructions..."
                />
              </div>

              {/* Submit Button - Mobile */}
              <div className="lg:hidden">
                <Button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md text-sm"
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
                {cartItems.map((item) => (
                  <div key={`${item.productId?._id || item.productId}-${item.variantId || ""}`} 
                       className="flex items-center justify-between gap-2">
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
                  <span>{formatPrice(shipping)}</span>
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

const formatPrice = (price) => {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format(price);
};

export default CheckoutPage;