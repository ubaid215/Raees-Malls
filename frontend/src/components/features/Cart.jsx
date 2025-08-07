import React, { useEffect, useState } from "react";
import {
  CiShoppingCart,
  CiTrash,
  CiCirclePlus,
  CiCircleMinus,
} from "react-icons/ci";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import Button from "../core/Button";
import LoadingSkeleton from "../shared/LoadingSkelaton";
import { toast } from "react-toastify";

function CartProductCard({ item, onUpdateQuantity, onRemove }) {
  if (!item || !item.productId) {
    console.warn("CartProductCard: Invalid cart item:", item);
    return null;
  }

  // Normalize image URL - Fixed to use import.meta.env
  const imageUrl = item.image
    ? typeof item.image === "string"
      ? item.image.startsWith("http")
        ? item.image
        : `${import.meta.env.VITE_API_BASE_PROD_URL || "http://localhost:5000"}${item.image}`
      : item.image.url
        ? item.image.url.startsWith("http")
          ? item.image.url
          : `${import.meta.env.VITE_API_BASE_PROD_URL || "http://localhost:5000"}${item.image.url}`
        : "/images/placeholder-product.png"
    : item.productId?.images?.[0]?.url
      ? item.productId.images[0].url.startsWith("http")
        ? item.productId.images[0].url
        : `${import.meta.env.VITE_API_BASE_PROD_URL || "http://localhost:5000"}${item.productId.images[0].url}`
      : "/images/placeholder-product.png";

  const formattedPrice = new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format(item.price || 0);

  const isDisabled = item.isUnavailable || item.isVariantUnavailable;

  // Create variant options object for the new structure
  const variantOptions = {
    variantColor: item.variantColor,
    storageCapacity: item.storageCapacity,
    size: item.size,
  };

  return (
    <div
      className={`w-full bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex flex-col gap-3 ${isDisabled ? "opacity-60" : ""}`}
    >
      {/* Warning for unavailable items */}
      {isDisabled && (
        <div className="bg-yellow-100 text-yellow-800 text-xs p-2 rounded-md">
          This {item.isVariantUnavailable ? "variant" : "product"} is
          unavailable
        </div>
      )}

      {/* Image and Title Row */}
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 flex-shrink-0">
          <img
            src={imageUrl}
            alt={item.title || "Product"}
            className="w-full h-full object-cover rounded-md"
            onError={(e) => {
              console.warn(
                `CartProductCard: Image failed to load for ${item.title || "unknown"}:`,
                e.target.src
              );
              e.currentTarget.src = "/images/placeholder-product.png";
              e.currentTarget.onerror = null;
            }}
          />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-gray-900 hover:text-red-600 cursor-pointer line-clamp-2">
            {item.title || "Untitled Product"}
          </h2>
          <p className="text-xs text-gray-600 mt-1">SKU: {item.sku || "N/A"}</p>
          {/* Display variant information if available */}
          {(item.variantColor || item.storageCapacity || item.size) && (
            <div className="text-xs text-gray-500 mt-1 space-y-1">
              {item.variantColor && <p>Color: {item.variantColor}</p>}
              {item.storageCapacity && <p>Storage: {item.storageCapacity}</p>}
              {item.size && <p>Size: {item.size}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Details Section */}
      <div className="space-y-1 text-xs text-gray-600">
        <p className="line-clamp-1">
          Category: {item.productId?.category?.name || "No category"}
        </p>
        <p className="text-green-600">{item.stock || 0} in Stock</p>
        {item.shippingCost > 0 && (
          <p className="text-blue-600">
            Shipping:{" "}
            {new Intl.NumberFormat("en-PK", {
              style: "currency",
              currency: "PKR",
              minimumFractionDigits: 0,
            }).format(item.shippingCost)}
          </p>
        )}
      </div>

      {/* Price and Actions Row */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">{formattedPrice}</p>
          <p className="text-xs text-gray-500">
            Total:{" "}
            {new Intl.NumberFormat("en-PK", {
              style: "currency",
              currency: "PKR",
              minimumFractionDigits: 0,
            }).format((item.price || 0) * item.quantity)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              onClick={() =>
                onUpdateQuantity(
                  item.productId._id,
                  item.quantity - 1,
                  variantOptions
                )
              }
              className="border border-gray-300 text-gray-600 hover:bg-gray-50 p-2 rounded-full"
              disabled={isDisabled || item.quantity <= 1}
              aria-label={`Decrease quantity of ${item.title}`}
            >
              <CiCircleMinus size={16} />
            </Button>
            <span className="w-8 text-center text-sm">{item.quantity}</span>
            <Button
              onClick={() =>
                onUpdateQuantity(
                  item.productId._id,
                  item.quantity + 1,
                  variantOptions
                )
              }
              className="border border-gray-300 text-gray-600 hover:bg-gray-50 p-2 rounded-full"
              disabled={isDisabled || item.quantity >= (item.stock || 0)}
              aria-label={`Increase quantity of ${item.title}`}
            >
              <CiCirclePlus size={16} />
            </Button>
          </div>
          <Button
            onClick={() => onRemove(item.productId._id, variantOptions)}
            className="bg-red-600 text-white hover:bg-red-700 p-2 rounded-full"
            aria-label={`Remove ${item.title} from cart`}
          >
            <CiTrash size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Cart() {
  const { user } = useAuth();
  const {
    cartItems,
    isLoading,
    error,
    totalPrice,
    totalShippingCost,
    itemCount,
    fetchCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getItemUniqueKey,
    isFreeShipping,
  } = useCart();
  const navigate = useNavigate();
  const [redirectCount, setRedirectCount] = useState(0);

  useEffect(() => {
    // console.log("Cart: isLoading:", isLoading, "error:", error);
  }, [cartItems, isLoading, error]);

  useEffect(() => {
    if (!user && redirectCount < 2) {
      setRedirectCount((prev) => prev + 1);
      navigate("/login", { state: { from: "/cart" } });
    } else if (user) {
      fetchCart().catch((err) => {
        toast.error("Failed to load cart: " + (err.message || "Unknown error"));
      });
    }
  }, [user, navigate, redirectCount, fetchCart]);

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (
      cartItems.some((item) => item.isUnavailable || item.isVariantUnavailable)
    ) {
      toast.error(
        "Please remove unavailable items before proceeding to checkout"
      );
      return;
    }
    navigate("/checkout", { state: { cartItems } });
  };

  const formattedTotalPrice = new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format(totalPrice || 0);

  const formattedShippingCost = new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format(totalShippingCost || 0);

  const formattedGrandTotal = new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format((totalPrice || 0) + (totalShippingCost || 0));

  const handleRetry = async () => {
    try {
      await fetchCart();
      toast.success("Cart refreshed");
    } catch (err) {
      toast.error(
        "Failed to refresh cart: " + (err.message || "Unknown error")
      );
    }
  };

  const handleUpdateQuantity = async (
    productId,
    newQuantity,
    variantOptions = {}
  ) => {
    if (newQuantity < 1) return;
    try {
      const result = await updateQuantity(
        productId,
        newQuantity,
        variantOptions
      );
      if (!result.success) {
        toast.error(result.message || "Failed to update quantity");
      }
    } catch (err) {
      toast.error(
        "Failed to update quantity: " + (err.message || "Unknown error")
      );
    }
  };

  const handleRemoveItem = async (productId, variantOptions = {}) => {
    try {
      const result = await removeFromCart(productId, variantOptions);
      if (!result.success) {
        toast.error(result.message || "Failed to remove item");
      }
    } catch (err) {
      toast.error("Failed to remove item: " + (err.message || "Unknown error"));
    }
  };

  const handleClearCart = async () => {
    try {
      const result = await clearCart();
      if (!result.success) {
        toast.error(result.message || "Failed to clear cart");
      }
    } catch (err) {
      toast.error("Failed to clear cart: " + (err.message || "Unknown error"));
    }
  };

  if (isLoading && !cartItems.length) {
    return (
      <div className="min-h-screen bg-gray-100 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <LoadingSkeleton
            type="text"
            width="40"
            height="6"
            className="mb-6 mx-auto"
          />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm p-3 flex gap-3"
              >
                <LoadingSkeleton type="image" width="16" height="16" />
                <div className="flex-1 space-y-2">
                  <LoadingSkeleton type="text" width="60" height="4" />
                  <LoadingSkeleton type="text" width="40" height="3" />
                  <LoadingSkeleton type="text" width="30" height="3" />
                </div>
                <LoadingSkeleton type="text" width="16" height="8" />
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
        <div className="bg-white rounded-lg shadow-sm p-6 text-center max-w-sm w-full">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CiShoppingCart className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-base font-medium text-gray-700 mb-2">
            Unable to load your cart
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {error.status === 403
              ? "Please login to view your cart"
              : error.message || "An error occurred"}
          </p>
          <div className="space-y-2">
            {error.status === 403 ? (
              <Button
                onClick={() => navigate("/login", { state: { from: "/cart" } })}
                className="w-full bg-red-600 text-white hover:bg-red-700 py-2 rounded-md"
              >
                Login
              </Button>
            ) : (
              <Button
                onClick={handleRetry}
                className="w-full bg-red-600 text-white hover:bg-red-700 py-2 rounded-md"
              >
                Try Again
              </Button>
            )}
            <Button
              onClick={() => navigate("/products")}
              className="w-full bg-white text-gray-700 border border-red-500 hover:bg-red-50 py-2 rounded-md"
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-6">
          Your Shopping Cart
          {cartItems.length > 0 && (
            <span className="block text-xs md:text-sm font-normal text-gray-500 mt-1">
              {itemCount} item{itemCount !== 1 ? "s" : ""} in cart
            </span>
          )}
        </h1>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center max-w-sm mx-auto">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CiShoppingCart className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">
              Your cart is empty
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Looks like you haven't added any items yet
            </p>
            <Button
              onClick={() => navigate("/products")}
              className="w-full bg-red-600 text-white hover:bg-red-700 py-2 rounded-md"
            >
              Browse Products
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Free Shipping Banner */}
            {isFreeShipping && (
              <div className="bg-green-100 text-green-800 text-sm p-3 rounded-md text-center">
                🎉 Congratulations! You qualify for free shipping!
              </div>
            )}

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="p-4 text-gray-900 font-semibold">Product</th>
                    <th className="p-4 text-gray-900 font-semibold">
                      Quantity
                    </th>
                    <th className="p-4 text-gray-900 font-semibold">Price</th>
                    <th className="p-4 text-gray-900 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item) => {
                    if (!item || !item.productId) {
                      console.warn("Cart: Invalid cart item in table:", item);
                      return null;
                    }

                    // Create variant options object for the new structure
                    const variantOptions = {
                      variantColor: item.variantColor,
                      storageCapacity: item.storageCapacity,
                      size: item.size,
                    };

                    // Normalize image URL - Fixed to use import.meta.env
                    const imageUrl = item.image
                      ? typeof item.image === "string"
                        ? item.image.startsWith("http")
                          ? item.image
                          : `${import.meta.env.VITE_API_BASE_PROD_URL || "http://localhost:5000"}${item.image}`
                        : item.image.url
                          ? item.image.url.startsWith("http")
                            ? item.image.url
                            : `${import.meta.env.VITE_API_BASE_PROD_URL || "http://localhost:5000"}${item.image.url}`
                          : "/images/placeholder-product.png"
                      : item.productId?.images?.[0]?.url
                        ? item.productId.images[0].url.startsWith("http")
                          ? item.productId.images[0].url
                          : `${import.meta.env.VITE_API_BASE_PROD_URL || "http://localhost:5000"}${item.productId.images[0].url}`
                        : "/images/placeholder-product.png";

                    return (
                      <tr
                        key={getItemUniqueKey(item)}
                        className={`border-b border-gray-200 last:border-b-0 ${
                          item.isUnavailable || item.isVariantUnavailable
                            ? "opacity-60"
                            : ""
                        }`}
                      >
                        <td className="p-4 flex items-center gap-4">
                          <img
                            src={imageUrl}
                            alt={item.title}
                            className="w-16 h-16 object-cover rounded-lg"
                            onError={(e) => {
                              console.warn(
                                `Cart: Image failed to load for ${item.title || "unknown"}:`,
                                e.target.src
                              );
                              e.currentTarget.src =
                                "/images/placeholder-product.png";
                              e.currentTarget.onerror = null;
                            }}
                          />
                          <div>
                            <h3 className="text-base font-semibold text-gray-900 hover:text-red-600 cursor-pointer">
                              {item.title}
                            </h3>
                            <p className="text-sm text-gray-600">
                              SKU: {item.sku || "N/A"}
                            </p>
                            <p className="text-sm text-gray-600 truncate">
                              Category:{" "}
                              {item.productId?.category?.name || "No category"}
                            </p>
                            {/* Display variant information */}
                            {(item.variantColor ||
                              item.storageCapacity ||
                              item.size) && (
                              <div className="text-sm text-gray-500 mt-1">
                                {item.variantColor && (
                                  <span className="mr-2">
                                    Color: {item.variantColor}
                                  </span>
                                )}
                                {item.storageCapacity && (
                                  <span className="mr-2">
                                    Storage: {item.storageCapacity}
                                  </span>
                                )}
                                {item.size && <span>Size: {item.size}</span>}
                              </div>
                            )}
                            {(item.isUnavailable ||
                              item.isVariantUnavailable) && (
                              <p className="text-sm text-yellow-600">
                                This{" "}
                                {item.isVariantUnavailable
                                  ? "variant"
                                  : "product"}{" "}
                                is unavailable
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() =>
                                handleUpdateQuantity(
                                  item.productId._id,
                                  item.quantity - 1,
                                  variantOptions
                                )
                              }
                              className="border border-gray-300 text-gray-600 hover:bg-gray-50 p-2 rounded-full"
                              disabled={
                                item.isUnavailable ||
                                item.isVariantUnavailable ||
                                item.quantity <= 1
                              }
                            >
                              <CiCircleMinus size={20} />
                            </Button>
                            <span className="w-12 text-center text-sm">
                              {item.quantity}
                            </span>
                            <Button
                              onClick={() =>
                                handleUpdateQuantity(
                                  item.productId._id,
                                  item.quantity + 1,
                                  variantOptions
                                )
                              }
                              className="border border-gray-300 text-gray-600 hover:bg-gray-50 p-2 rounded-full"
                              disabled={
                                item.isUnavailable ||
                                item.isVariantUnavailable ||
                                item.quantity >= (item.stock || 0)
                              }
                            >
                              <CiCirclePlus size={20} />
                            </Button>
                          </div>
                        </td>
                        <td className="p-4 text-gray-900">
                          {new Intl.NumberFormat("en-PK", {
                            style: "currency",
                            currency: "PKR",
                            minimumFractionDigits: 0,
                          }).format((item.price || 0) * item.quantity)}
                        </td>
                        <td className="p-4">
                          <Button
                            onClick={() =>
                              handleRemoveItem(
                                item.productId._id,
                                variantOptions
                              )
                            }
                            className="bg-red-600 text-white hover:bg-red-700 p-2 rounded-full"
                          >
                            <CiTrash size={20} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
              {cartItems.map((item) => (
                <CartProductCard
                  key={getItemUniqueKey(item)}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemoveItem}
                />
              ))}
            </div>

            {/* Cart Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formattedTotalPrice}
                  </span>
                </div>
                {totalShippingCost > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Shipping:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formattedShippingCost}
                    </span>
                  </div>
                )}
                {isFreeShipping && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Shipping:</span>
                    <span className="text-sm font-medium text-green-600">
                      Free!
                    </span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-gray-900">
                      Total:
                    </span>
                    <span className="text-base font-semibold text-gray-900">
                      {isFreeShipping
                        ? formattedTotalPrice
                        : formattedGrandTotal}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <Button
                  onClick={handleClearCart}
                  className="bg-gray-600 text-white hover:bg-gray-700 px-4 py-2 rounded-md text-sm flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? "Clearing..." : "Clear Cart"}
                </Button>
                <Button
                  onClick={handleCheckout}
                  className="bg-red-600 text-white hover:bg-red-700 py-2 rounded-md text-sm flex-2"
                  aria-label="Proceed to checkout"
                  disabled={isLoading || cartItems.length === 0}
                >
                  {isLoading ? "Processing..." : "Proceed to Checkout"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cart;
