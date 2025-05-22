import React, { useState, useEffect } from "react";
import { FiCheckCircle, FiMessageSquare } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import Button from "../components/core/Button";
import Input from "../components/core/Input";
import { useCart } from "../context/CartContext";
import { useOrder } from "../context/OrderContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const CheckoutPage = () => {
  const { cartItems, clearCart, removeAllFromCart } = useCart();
  const { placeNewOrder } = useOrder();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [redirectCount, setRedirectCount] = useState(0);
  const [orderDetails, setOrderDetails] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: user?.email || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone?.replace(/^\+\d{1,4}\s/, "") || "",
      countryCode: user?.phone?.match(/^\+\d{1,4}/)?.[0] || "+92",
      address1: user?.address?.address1 || "",
      address2: user?.address?.address2 || "",
      country: user?.address?.country || "Pakistan",
      city: user?.address?.city || "",
      state: user?.address?.state || "",
      postalCode: user?.address?.postalCode || "",
    },
  });

  const countryCode = watch("countryCode");

  const countryCodes = [
    { code: "+92", label: "Pakistan (+92)" },
    { code: "+1", label: "United States (+1)" },
    { code: "+44", label: "United Kingdom (+44)" },
    { code: "+91", label: "India (+91)" },
  ];

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!user && redirectCount < 2) {
      setRedirectCount((prev) => prev + 1);
      navigate("/login", { state: { from: "/checkout" } });
    }
  }, [user, navigate, redirectCount]);

  const calculateTotal = () => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    // Calculate shipping cost for unique products
    const uniqueProducts = new Set();
    let shipping = 0;
    for (const item of cartItems) {
      const productId =
        typeof item.productId === "object"
          ? item.productId._id
          : item.productId || item._id;
      if (!uniqueProducts.has(productId)) {
        shipping += item.shippingCost || 0;
        uniqueProducts.add(productId);
      }
    }
    // Apply free shipping if subtotal or totalItems >= 25,000
    shipping = subtotal >= 25000 || totalItems >= 25000 ? 0 : shipping;
    const tax = 0;
    return { subtotal, shipping, tax, total: subtotal + shipping + tax };
  };

  const onSubmit = async (data) => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty. Please add items to proceed.");
      return;
    }

    setIsSubmitting(true);
    try {
      const fullPhoneNumber = `${data.countryCode} ${data.phone}`;

      // Extract the actual ID from the product object
      const validatedItems = cartItems.map((item) => {
        let validProductId;
        if (
          item.productId &&
          typeof item.productId === "object" &&
          item.productId._id
        ) {
          validProductId = item.productId._id;
        } else if (item.productId && typeof item.productId === "string") {
          validProductId = item.productId;
        } else if (item._id) {
          validProductId = item._id;
        } else {
          validProductId = String(Math.random()).substring(2); // Last resort fallback
        }

        return {
          productId: validProductId,
          quantity: item.quantity,
          sku: item.sku || "UNKNOWN_SKU",
          price: item.price,
          title: item.title,
          shippingCost: item.shippingCost || 0,
        };
      });

      const { shipping } = calculateTotal();

      const order = {
        items: validatedItems,
        shippingAddress: {
          fullName: `${data.firstName} ${data.lastName}`,
          addressLine1: data.address1,
          addressLine2: data.address2 || "",
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
          phone: fullPhoneNumber,
        },
        totalShippingCost: shipping,
      };

      console.log("Submitting order:", JSON.stringify(order));

      const result = await placeNewOrder(order);
      setOrderDetails({
        ...order,
        orderId:
          result.order?.orderId ||
          `ORD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        total: calculateTotal().total,
        totalShippingCost: result.order?.totalShippingCost || shipping,
      });

      if (typeof clearCart === "function") {
        clearCart();
      } else if (typeof removeAllFromCart === "function") {
        removeAllFromCart();
      } else {
        console.warn("No cart clearing function available");
        try {
          cartItems.forEach((item) => {
            if (typeof removeFromCart === "function") {
              removeFromCart(item.productId);
            }
          });
        } catch (e) {
          console.warn("Could not clear cart items individually:", e);
        }
      }

      setOrderSuccess(true);
      toast.success("Order placed successfully!");
    } catch (error) {
      console.error("Order placement error:", error);
      let errorMessage = "Order submission failed. Please try again.";

      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (
          error.response.data &&
          typeof error.response.data === "string"
        ) {
          errorMessage = error.response.data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="w-full min-h-screen bg-gray-100 flex items-center justify-center px-4 py-6">
        <div className="max-w-sm w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <FiCheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Order Placed Successfully!
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Thank you for your order. We'll deliver it soon via Cash on
            Delivery.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => navigate("/products")}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md text-sm"
            >
              Continue Shopping
            </Button>
            {orderDetails && (
              <Button
                onClick={() => {
                  const {
                    shippingAddress,
                    items,
                    orderId,
                    total,
                    totalShippingCost,
                  } = orderDetails;
                  const message = `Hi, I just placed an order (${orderId}) with the following details:
    
*Order Summary:*
${items.map((item) => `- ${item.title} (Qty: ${item.quantity}, Shipping: ${formatPrice(item.shippingCost)}) - ${formatPrice(item.price * item.quantity)}`).join("\n")}

*Subtotal:* ${formatPrice(total - totalShippingCost)}
*Total Shipping:* ${formatPrice(totalShippingCost)}
*Total:* ${formatPrice(total)}

*Shipping Address:*
${shippingAddress.fullName}
${shippingAddress.addressLine1}${shippingAddress.addressLine2 ? `, ${shippingAddress.addressLine2}` : ""}
${shippingAddress.city}, ${shippingAddress.state}, ${shippingAddress.country}
${shippingAddress.postalCode}
Phone: ${shippingAddress.phone}

Please confirm my order. Thank you!`;
                  const phoneNumber = "923006530063";
                  window.open(
                    `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`,
                    "_blank"
                  );
                }}
                variant="outline"
                className="w-full border-green-600 text-green-600 hover:bg-green-50 py-2 rounded-md text-sm"
                icon={FaWhatsapp}
              >
                Share Order via WhatsApp
              </Button>
            )}
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
          <p className="text-sm text-gray-600 mb-4">
            Add some items to your cart to proceed with checkout.
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

  const { subtotal, shipping, tax, total } = calculateTotal();

  return (
    <div className="w-full min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 text-center">
          Checkout
        </h1>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left Column - Contact and Shipping */}
          <div className="flex-1">
            <form
              id="checkout-form"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
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
                  className="py-2 px-3 text-sm"
                  error={errors.email?.message}
                />
              </div>

              {/* Shipping Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Shipping Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <Input
                    label="First name"
                    {...register("firstName", {
                      required: "First name is required",
                    })}
                    className="py-2 px-3 text-sm"
                    error={errors.firstName?.message}
                  />
                  <Input
                    label="Last name"
                    {...register("lastName", {
                      required: "Last name is required",
                    })}
                    className="py-2 px-3 text-sm"
                    error={errors.lastName?.message}
                  />
                </div>
                <div className="flex gap-3 mb-3">
                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Country Code
                    </label>
                    <select
                      {...register("countryCode", {
                        required: "Country code is required",
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm py-2 px-3"
                    >
                      {countryCodes.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.countryCode && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.countryCode.message}
                      </p>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      label="Phone number"
                      {...register("phone", {
                        required: "Phone number is required",
                        pattern: {
                          value: /^\d{6,14}$/,
                          message: "Phone number must be 6 to 14 digits long",
                        },
                      })}
                      type="tel"
                      className="py-2 px-3 text-sm"
                      placeholder="3001234567"
                      error={errors.phone?.message}
                    />
                  </div>
                </div>
                <Input
                  label="Address line 1"
                  {...register("address1", { required: "Address is required" })}
                  className="py-2 px-3 text-sm mb-3"
                  error={errors.address1?.message}
                />
                <Input
                  label="Address line 2 (Optional)"
                  {...register("address2")}
                  className="py-2 px-3 text-sm mb-3"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <select
                      {...register("country", {
                        required: "Country is required",
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm py-2 px-3"
                    >
                      <option value="Pakistan">Pakistan</option>
                      <option value="United States">United States</option>
                    </select>
                    {errors.country && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.country.message}
                      </p>
                    )}
                  </div>
                  <Input
                    label="City"
                    {...register("city", { required: "City is required" })}
                    className="py-2 px-3 text-sm"
                    error={errors.city?.message}
                  />
                  <Input
                    label="State"
                    {...register("state", { required: "State is required" })}
                    className="py-2 px-3 text-sm"
                    error={errors.state?.message}
                  />
                  <Input
                    label="Postal code"
                    {...register("postalCode", {
                      required: "Postal code is required",
                    })}
                    className="py-2 px-3 text-sm"
                    error={errors.postalCode?.message}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Payment Method
                </h2>
                <div className="text-sm text-gray-600">
                  <p>Cash on Delivery</p>
                  <p className="text-xs text-gray-500 mt-1">
                    You will pay the total amount when the order is delivered.
                  </p>
                </div>
              </div>
            </form>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:w-80 lg:sticky lg:top-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Order Details
              </h2>

              {/* Cart Items */}
              <div className="space-y-3 mb-4">
                {cartItems.map((item, index) => (
                  <div
                    key={`${item.productId || item._id || index}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.title || "Product"}
                        className="w-12 h-12 object-cover rounded-md border border-gray-200"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder-product.png";
                          e.currentTarget.onerror = null;
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                          {item.title || "Untitled Product"}
                        </p>
                        <p className="text-xs text-gray-600">
                          Qty: {item.quantity}
                        </p>
                        <p className="text-xs text-gray-600">
                          Shipping: {formatPrice(item.shippingCost || 0)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Order Totals */}
              <div className="space-y-2 border-t border-gray-200 pt-3 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>{formatPrice(shipping)}</span>
                </div>
                {shipping === 0 && (
                  <p className="text-xs text-green-600">
                    Free shipping applied (Order above PKR 25,000)
                  </p>
                )}
                <div className="flex justify-between font-bold text-base pt-2">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <Button
                type="submit"
                form="checkout-form"
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md text-sm mb-3"
                disabled={isSubmitting || cartItems.length === 0}
              >
                {isSubmitting ? "Processing..." : "Place Order"}
              </Button>

              {/* WhatsApp Support Button */}
              <Button
                variant="outline"
                className="w-full border-green-600 text-green-600 hover:bg-green-50 py-2 rounded-md text-sm"
                icon={FiMessageSquare}
                onClick={() => {
                  const message = `Hi, I need help with my order. Here are my cart details:
                  
${cartItems.map((item) => `- ${item.title || "Product"} (Qty: ${item.quantity}, Shipping: ${formatPrice(item.shippingCost || 0)}) - ${formatPrice(item.price * item.quantity)}`).join("\n")}

Subtotal: ${formatPrice(subtotal)}
Total Shipping: ${formatPrice(shipping)}
Total: ${formatPrice(total)}

Can you assist me?`;
                  const phoneNumber = "923006530063";
                  window.open(
                    `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`,
                    "_blank"
                  );
                }}
              >
                Chat with Support
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;

const formatPrice = (price) => {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format(price);
};
