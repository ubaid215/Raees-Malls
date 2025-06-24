import React, { useState, useEffect, memo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import { getProductById } from "../../services/productService";
import { useCart } from "../../context/CartContext";
import Button from "../core/Button";
import LoadingSpinner from "../core/LoadingSpinner";
import { FaStar, FaStarHalfAlt, FaRegStar, FaWhatsapp } from "react-icons/fa";

// Magnifier Component
const Magnifier = ({ src, alt, className }) => {
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [backgroundPosition, setBackgroundPosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);

  const magnifierSize = 200; // Increased size for better visibility
  const zoomLevel = 2.5;

  const handleMouseMove = (e) => {
    if (!imageRef.current) return;

    const { left, top, width, height } =
      imageRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;

    if (x < 0 || x > width || y < 0 || y > height) {
      setShowMagnifier(false);
      return;
    }

    setShowMagnifier(true);
    setCursorPosition({ x, y });

    // Calculate background position for zoomed image
    const bgX = -(x * zoomLevel - magnifierSize / 2);
    const bgY = -(y * zoomLevel - magnifierSize / 2);
    setBackgroundPosition({ x: bgX, y: bgY });
  };

  const handleMouseLeave = () => {
    setShowMagnifier(false);
  };

  return (
    <div
      className="relative w-full h-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className={className}
        loading="lazy"
      />

      {showMagnifier && (
        <div
          className="absolute rounded-full border-2 border-white shadow-lg overflow-hidden pointer-events-none"
          style={{
            width: `${magnifierSize}px`,
            height: `${magnifierSize}px`,
            left: `${cursorPosition.x - magnifierSize / 2}px`,
            top: `${cursorPosition.y - magnifierSize / 2}px`,
            backgroundImage: `url(${src})`,
            backgroundSize: `${imageRef.current?.width * zoomLevel}px ${imageRef.current?.height * zoomLevel}px`,
            backgroundPosition: `${backgroundPosition.x}px ${backgroundPosition.y}px`,
            backgroundRepeat: "no-repeat",
            transform: "translateZ(0)", // Hardware acceleration
            zIndex: 10,
            boxShadow: "0 0 10px rgba(0,0,0,0.3)",
            // Circular mask effect
            maskImage:
              "radial-gradient(circle, white 0%, white 70%, transparent 71%)",
            WebkitMaskImage:
              "radial-gradient(circle, white 0%, white 70%, transparent 71%)",
          }}
        >
          {/* Optional: Add a crosshair or indicator in the center */}
          <div
            className="absolute top-1/2 left-1/2 w-4 h-4 transform -translate-x-1/2 -translate-y-1/2"
            style={{
              border: "2px solid rgba(255,255,255,0.8)",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />
        </div>
      )}
    </div>
  );
};

const ProductDetails = memo(() => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addItemToCart, isLoading: cartLoading } = useCart();
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [activeMedia, setActiveMedia] = useState({ type: "image", url: "" });
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    const fetchProductData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedProduct = await getProductById(productId, {
          isPublic: true,
        });
        // console.log('Fetched Product:', JSON.stringify(fetchedProduct, null, 2));

        if (!fetchedProduct) {
          throw new Error("Product not found");
        }

        setProduct(fetchedProduct);

        const initialMedia = fetchedProduct.videos?.[0]
          ? { type: "video", url: fetchedProduct.videos[0].url }
          : fetchedProduct.images?.[0]
            ? { type: "image", url: fetchedProduct.images[0].url }
            : { type: "image", url: "/images/placeholder-product.png" };
        console.log("Initial Media:", initialMedia);
        setActiveMedia(initialMedia);

        setSelectedVariant(null);
        console.log(
          "Variants available:",
          fetchedProduct.variants?.length || 0
        );
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to load product details");
        toast.error(err.message || "Failed to load product details");
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      fetchProductData();
    } else {
      setError("No product ID provided");
      setIsLoading(false);
    }
  }, [productId]);

  const handleAddToCart = async () => {
    const currentStock = selectedVariant
      ? selectedVariant.stock
      : product?.stock;
    const price = selectedVariant
      ? (selectedVariant.discountPrice ?? selectedVariant.price)
      : (product.discountPrice ?? product.price);

    if (!product || currentStock <= 0) {
      toast.error("Product is out of stock");
      return;
    }

    try {
      await addItemToCart(product._id, selectedVariant?._id || null, 1, price);
      toast.success("Added to cart");
    } catch (err) {
      toast.error(err.message || "Failed to add to cart");
    }
  };

  const handleWhatsAppInquiry = () => {
    if (!product) return;

    const currentPrice = selectedVariant
      ? (selectedVariant.discountPrice ?? selectedVariant.price)
      : (product.discountPrice ?? product.price);
    const originalPrice = selectedVariant
      ? selectedVariant.price
      : product.price;
    const currentStock = selectedVariant
      ? selectedVariant.stock
      : product.stock;
    const hasDiscount =
      Number.isFinite(currentPrice) &&
      Number.isFinite(originalPrice) &&
      currentPrice < originalPrice;

    const productName = product.title || "Product";
    const variantInfo = selectedVariant
      ? ` (${getVariantLabel(selectedVariant, product.variants.indexOf(selectedVariant))})`
      : "";
    const priceInfo = formatPrice(currentPrice);
    const originalPriceInfo = hasDiscount
      ? ` (Original: ${formatPrice(originalPrice)})`
      : "";
    const stockInfo =
      currentStock > 0 ? `${currentStock} available` : "Out of stock";
    const sku = selectedVariant?.sku || product.sku || "N/A";
    const colorInfo = selectedVariant
      ? selectedVariant.color?.name
        ? `Color: ${selectedVariant.color.name}`
        : ""
      : product.color?.name
        ? `Color: ${product.color.name}`
        : "";

    const message = `Hi! I'm interested in this product:

*${productName}${variantInfo}*
📦 SKU: ${sku}
💰 Price: ${priceInfo}${originalPriceInfo}
📋 Stock: ${stockInfo}
${colorInfo ? `🎨 ${colorInfo}` : ""}

Please provide more details and availability.`;

    const whatsappNumber = "923006530063";
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    setProduct(null);
  };

  const handleMediaClick = (media, type = "image", variantId = null) => {
    console.log("Media Clicked:", { media, type, variantId });
    setActiveMedia({ type, url: media.url });

    if (variantId) {
      const variant = product.variants.find((v) => v._id === variantId);
      setSelectedVariant(variant);
    } else {
      setSelectedVariant(null);
    }
  };

  const handleMediaError = (e) => {
    console.warn("Media failed to load:", e.target.src);
    e.target.src = "/images/placeholder-product.png";
    e.target.onerror = null;
    if (e.target.tagName === "VIDEO") {
      e.target.outerHTML = `<img
        src="/images/placeholder-product.png"
        alt="Placeholder product image"
        class="w-full h-full object-contain rounded-lg"
        loading="lazy"
      />`;
    }
  };

  const formatPrice = (price) => {
    console.log("Formatting Price:", price);
    if (!Number.isFinite(price)) {
      console.warn("Invalid price:", price);
      return "Price unavailable";
    }
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getVariantLabel = (variant, index) => {
    const firstAttr = variant.attributes?.[0];
    if (firstAttr?.value) {
      return firstAttr.value.charAt(0).toUpperCase() + firstAttr.value.slice(1);
    }
    return `Variant ${index + 1}`;
  };

  const renderStars = (rating = 0) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<FaStar key={i} className="text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<FaStarHalfAlt key={i} className="text-yellow-400" />);
      } else {
        stars.push(<FaRegStar key={i} className="text-yellow-400" />);
      }
    }
    return stars;
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleVariantSelect = (variant = null) => {
    setSelectedVariant(variant);
    if (variant && variant.images?.[0]) {
      setActiveMedia({ type: "image", url: variant.images[0].url });
    } else if (!variant && product.images?.[0]) {
      setActiveMedia({ type: "image", url: product.images[0].url });
    }
  };

  // Helper function to convert color name to CSS color
  const getColorStyle = (colorName) => {
    if (!colorName) return { backgroundColor: '#ffffff', border: '1px solid #ccc' };
    // Try to use the color name directly if it's a valid CSS color
    const div = document.createElement('div');
    div.style.backgroundColor = colorName;
    document.body.appendChild(div);
    const computedColor = window.getComputedStyle(div).backgroundColor;
    document.body.removeChild(div);
    // If computed color is not transparent or invalid, use it
    if (computedColor !== 'rgba(0, 0, 0, 0)' && computedColor !== '') {
      return { backgroundColor: colorName, border: '1px solid #ccc' };
    }
    // Fallback to a default color if invalid
    return { backgroundColor: '#ffffff', border: '1px solid #ccc' };
  };

  if (isLoading) {
    return (
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="py-8 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-7xl mx-auto">
          <p className="text-red-600 mb-4 text-sm sm:text-base">
            {error || "Product not found"}
          </p>
          <Button
            onClick={handleRetry}
            className="border border-red-600 text-red-600 hover:bg-red-50 px-4 py-2 rounded-md text-sm sm:text-base"
          >
            Retry
          </Button>
        </div>
      </section>
    );
  }

  const currentPrice = selectedVariant
    ? (selectedVariant.discountPrice ?? selectedVariant.price)
    : (product.discountPrice ?? product.price);
  const originalPrice = selectedVariant ? selectedVariant.price : product.price;
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock;
  console.log("Price and Stock:", {
    currentPrice,
    originalPrice,
    currentStock,
  });

  const hasDiscount =
    Number.isFinite(currentPrice) &&
    Number.isFinite(originalPrice) &&
    currentPrice < originalPrice;
  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          {/* Media section */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center h-96 relative">
              {activeMedia.type === "video" ? (
                <video
                  src={activeMedia.url}
                  className="w-full h-full object-contain rounded-lg"
                  muted
                  controls
                  preload="metadata"
                  onError={handleMediaError}
                />
              ) : (
                <Magnifier
                  src={activeMedia.url}
                  alt={product.title || "Product image"}
                  className="w-full h-full object-contain rounded-lg"
                />
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {/* Base Product Images */}
              {product.images?.length > 0 &&
                product.images.map((img, index) => (
                  <button
                    key={`img-${index}`}
                    type="button"
                    className={`flex-shrink-0 w-16 h-16 border-2 rounded-md cursor-pointer transition-all ${
                      activeMedia.url === img.url &&
                      activeMedia.type === "image" &&
                      !selectedVariant
                        ? "border-red-600"
                        : "border-gray-200"
                    }`}
                    onClick={() => handleMediaClick(img, "image")}
                    aria-label={`View image ${index + 1}`}
                  >
                    <img
                      src={img.url}
                      alt={`${product.title} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover rounded-md"
                      loading="lazy"
                      onError={handleMediaError}
                    />
                  </button>
                ))}

              {/* Base Product Videos */}
              {product.videos?.length > 0 &&
                product.videos.map((vid, index) => (
                  <button
                    key={`vid-${index}`}
                    type="button"
                    className={`flex-shrink-0 w-16 h-16 border-2 rounded-md cursor-pointer transition-all relative ${
                      activeMedia.url === vid.url &&
                      activeMedia.type === "video" &&
                      !selectedVariant
                        ? "border-red-600"
                        : "border-gray-200"
                    }`}
                    onClick={() => handleMediaClick(vid, "video")}
                    aria-label={`View video ${index + 1}`}
                  >
                    <video
                      src={vid.url}
                      className="w-full h-full object-cover rounded-md"
                      muted
                      preload="metadata"
                      onError={handleMediaError}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-white opacity-80"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </button>
                ))}

              {/* Variant Images */}
              {product.variants?.map((variant) =>
                variant.images?.map((img, index) => (
                  <button
                    key={`var-${variant._id}-img-${index}`}
                    type="button"
                    className={`flex-shrink-0 w-16 h-16 border-2 rounded-md cursor-pointer transition-all relative ${
                      activeMedia.url === img.url &&
                      activeMedia.type === "image" &&
                      selectedVariant?._id === variant._id
                        ? "border-red-600"
                        : "border-gray-200"
                    }`}
                    onClick={() => handleMediaClick(img, "image", variant._id)}
                    aria-label={`View ${getVariantLabel(variant, product.variants.indexOf(variant))} image ${index + 1}`}
                  >
                    <img
                      src={img.url}
                      alt={`${product.title} ${getVariantLabel(variant, product.variants.indexOf(variant))} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover rounded-md"
                      loading="lazy"
                      onError={handleMediaError}
                    />
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      V
                    </div>
                  </button>
                ))
              )}

              {/* Variant Videos */}
              {product.variants?.map((variant) =>
                variant.videos?.map((vid, index) => (
                  <button
                    key={`var-${variant._id}-vid-${index}`}
                    type="button"
                    className={`flex-shrink-0 w-16 h-16 border-2 rounded-md cursor-pointer transition-all relative ${
                      activeMedia.url === vid.url &&
                      activeMedia.type === "video" &&
                      selectedVariant?._id === variant._id
                        ? "border-red-600"
                        : "border-gray-200"
                    }`}
                    onClick={() => handleMediaClick(vid, "video", variant._id)}
                    aria-label={`View ${getVariantLabel(variant, product.variants.indexOf(variant))} video ${index + 1}`}
                  >
                    <video
                      src={vid.url}
                      className="w-full h-full object-cover rounded-md"
                      muted
                      preload="metadata"
                      onError={handleMediaError}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-white opacity-80"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      V
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              {product.title || "Untitled Product"}
              {selectedVariant && (
                <span className="text-lg font-medium text-red-600 ml-2">
                  (
                  {getVariantLabel(
                    selectedVariant,
                    product.variants.indexOf(selectedVariant)
                  )}
                  )
                </span>
              )}
            </h1>

            <p className="text-sm text-gray-600">
              SKU:{" "}
              <span className="font-medium">
                {selectedVariant?.sku || product.sku || "N/A"}
              </span>
            </p>

            <div className="flex items-center gap-3">
              <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
                {formatPrice(currentPrice)}
              </p>
              {hasDiscount && (
                <>
                  <p className="text-base text-gray-500 line-through">
                    {formatPrice(originalPrice)}
                  </p>
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded">
                    {discountPercentage}% OFF
                  </span>
                </>
              )}
            </div>

            <p
              className={`text-sm sm:text-base ${
                currentStock > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {currentStock > 0 ? `${currentStock} in stock` : "Out of stock"}
            </p>

            {selectedVariant ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800 font-medium">
                  Selected Variant:{" "}
                  {getVariantLabel(
                    selectedVariant,
                    product.variants.indexOf(selectedVariant)
                  )}
                </p>
                {selectedVariant.attributes?.length > 0 && (
                  <p className="text-sm text-blue-600 mt-1">
                    {selectedVariant.attributes
                      .map((a) => `${a.key}: ${a.value}`)
                      .join(", ")}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-600 font-medium">
                  Base Product Selected
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Click on variant images (marked with 'V') to view variant
                  details or select a specification below
                </p>
              </div>
            )}

            <div>
              <h1 className="font-semibold pb-4 text-xl">Specifications</h1>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Base Product Specification */}
                <button
                  type="button"
                  className={`p-3 font-semibold border-2 rounded-md hover:bg-red-50 cursor-pointer transition-all text-sm ${
                    !selectedVariant
                      ? "border-red-600 bg-red-50"
                      : "border-gray-200"
                  }`}
                  onClick={() => handleVariantSelect(null)}
                  aria-label="Select base product"
                >
                  {product.specifications
                    ?.map((spec) => `${spec.key}: ${spec.value}`)
                    .join(", ") || "Base Product"}
                </button>

                {/* Variant Specifications */}
                {product.variants?.map((variant, index) => (
                  <button
                    key={variant._id}
                    type="button"
                    className={`p-3 border-2 font-semibold rounded-md hover:bg-red-50 cursor-pointer transition-all text-sm ${
                      selectedVariant?._id === variant._id
                        ? "border-red-600 bg-red-50"
                        : "border-gray-200"
                    }`}
                    onClick={() => handleVariantSelect(variant)}
                    aria-label={`Select ${getVariantLabel(variant, index)} variant`}
                  >
                    {variant.specifications
                      ?.map((spec) => `${spec.key}: ${spec.value}`)
                      .join(", ") || getVariantLabel(variant, index)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h1 className="text-xl font-semibold pb-4">Color</h1>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Base Product Color */}
                {product.color?.name && (
                  <button
                    type="button"
                    className={`p-3 border-2 rounded-md hover:bg-red-50 cursor-pointer transition-all text-sm flex items-center gap-2 ${
                      !selectedVariant
                        ? "border-red-600 bg-red-50"
                        : "border-gray-200"
                    }`}
                    onClick={() => handleVariantSelect(null)}
                    aria-label={`Select base product color ${product.color.name}`}
                  >
                    <span
                      className="w-6 h-6 rounded-full"
                      style={getColorStyle(product.color.name)}
                    ></span>
                    {product.color.name}
                  </button>
                )}

                {/* Variant Colors */}
                {product.variants?.map((variant, index) => (
                  variant.color?.name && (
                    <button
                      key={variant._id}
                      type="button"
                      className={`p-3 border-2 rounded-md hover:bg-red-50 cursor-pointer transition-all text-sm flex items-center gap-2 ${
                        selectedVariant?._id === variant._id
                          ? "border-red-600 bg-red-50"
                          : "border-gray-200"
                      }`}
                      onClick={() => handleVariantSelect(variant)}
                      aria-label={`Select ${getVariantLabel(variant, index)} color ${variant.color.name}`}
                    >
                      <span
                        className="w-6 h-6 rounded-full"
                        style={getColorStyle(variant.color.name)}
                      ></span>
                      {variant.color.name}
                    </button>
                  )
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                onClick={handleAddToCart}
                className={`flex-1 py-3 px-4 rounded-md text-sm sm:text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 ${
                  currentStock > 0 && !cartLoading
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                disabled={currentStock <= 0 || cartLoading}
                aria-label="Add to cart"
              >
                {cartLoading ? "Adding..." : "Add to Cart"}
              </Button>
              <Button
                onClick={handleWhatsAppInquiry}
                className="flex-1 py-3 px-4 rounded-md text-sm sm:text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2"
                aria-label="Get details on WhatsApp"
              >
                <FaWhatsapp className="text-lg" />
                Get Details
              </Button>
            </div>

            <div className="mt-4">
              <h3
                className="text-base sm:text-lg font-medium text-gray-900 mb-2 cursor-pointer flex justify-between items-center"
                onClick={() => toggleSection("description")}
              >
                <span>Description</span>
                <span className="text-lg">
                  {expandedSection === "description" ? "−" : "+"}
                </span>
              </h3>
              {expandedSection === "description" && (
                <p className="text-gray-600 text-sm sm:text-base">
                  {product.description || "No description available"}
                </p>
              )}
            </div>

            {product.features?.length > 0 && (
              <div className="mt-4">
                <h3
                  className="text-base sm:text-lg font-medium text-gray-900 mb-2 cursor-pointer flex justify-between items-center"
                  onClick={() => toggleSection("features")}
                >
                  <span>Features</span>
                  <span className="text-lg">
                    {expandedSection === "features" ? "−" : "+"}
                  </span>
                </h3>
                {expandedSection === "features" && (
                  <ul className="text-gray-600 text-sm sm:text-base list-disc pl-5 space-y-1">
                    {product.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {selectedVariant && (
              <div className="mt-4">
                <h3
                  className="text-base sm:text-lg font-medium text-gray-900 mb-2 cursor-pointer flex justify-between items-center"
                  onClick={() => toggleSection("variant")}
                >
                  <span>Selected Variant Details</span>
                  <span className="text-lg">
                    {expandedSection === "variant" ? "−" : "+"}
                  </span>
                </h3>
                {expandedSection === "variant" && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedVariant.attributes?.map((attr, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 capitalize">
                              {attr.key}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">
                              {attr.value}
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                            SKU
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {selectedVariant.sku || "N/A"}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                            Price
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatPrice(selectedVariant.price)}
                          </td>
                        </tr>
                        {selectedVariant.discountPrice && (
                          <tr>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                              Discount Price
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {formatPrice(selectedVariant.discountPrice)}
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                            Stock
                          </td>
                          <td
                            className={`px-4 py-3 whitespace-nowrap text-sm ${
                              selectedVariant.stock > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {selectedVariant.stock > 0
                              ? `${selectedVariant.stock} in stock`
                              : "Out of stock"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {product.categoryId && (
              <div className="mt-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                  Category
                </h3>
                <span className="inline-block bg-gray-100 text-gray-600 text-xs sm:text-sm px-3 py-1 rounded-full">
                  {product.categoryId.name || "Uncategorized"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});

ProductDetails.propTypes = {
  _id: PropTypes.string,
  title: PropTypes.string,
  price: PropTypes.number,
  discountPrice: PropTypes.number,
  images: PropTypes.arrayOf(
    PropTypes.shape({
      url: PropTypes.string,
      alt: PropTypes.string,
      public_id: PropTypes.string,
    })
  ),
  videos: PropTypes.arrayOf(
    PropTypes.shape({
      url: PropTypes.string,
      public_id: PropTypes.string,
    })
  ),
  features: PropTypes.arrayOf(PropTypes.string),
  specifications: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      value: PropTypes.string,
    })
  ),
  sku: PropTypes.string,
  stock: PropTypes.number,
  averageRating: PropTypes.number,
  numReviews: PropTypes.number,
  description: PropTypes.string,
  categoryId: PropTypes.shape({
    _id: PropTypes.string,
    name: PropTypes.string,
  }),
  color: PropTypes.shape({
    name: PropTypes.string,
  }),
  variants: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      sku: PropTypes.string,
      price: PropTypes.number,
      discountPrice: PropTypes.number,
      stock: PropTypes.number,
      attributes: PropTypes.arrayOf(
        PropTypes.shape({
          key: PropTypes.string,
          value: PropTypes.string,
        })
      ),
      color: PropTypes.shape({
        name: PropTypes.string,
      }),
      images: PropTypes.arrayOf(
        PropTypes.shape({
          url: PropTypes.string,
          public_id: PropTypes.string,
        })
      ),
      videos: PropTypes.arrayOf(
        PropTypes.shape({
          url: String,
          public_id: String,
        })
      ),
    })
  ),
};

export default ProductDetails;