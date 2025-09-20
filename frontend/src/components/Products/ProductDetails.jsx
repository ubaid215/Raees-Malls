import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
  FaShare,
  FaPlay,
  FaChevronDown,
  FaChevronUp,
  FaFire,
  FaPercentage,
  FaSearchPlus,
} from "react-icons/fa";
import { getProductById } from "../../services/productService";
import { useCart } from "../../context/CartContext";
import Button from "../core/Button";
import LoadingSpinner from "../core/LoadingSpinner";
import ProductReviews from "../../pages/ProductReviews";

const SafeHTMLRenderer = ({ html, className = "" }) => {
  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// Image Magnifier Component
const ImageMagnifier = ({
  src,
  alt,
  className = "",
  zoomLevel = 2.5,
  magnifierSize = 180,
  zoomPosition = "right",
}) => {
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);

  const handleMouseEnter = () => {
    setShowMagnifier(true);
  };

  const handleMouseLeave = () => {
    setShowMagnifier(false);
  };

  const handleMouseMove = (e) => {
    const elem = imgRef.current;
    if (!elem) return;

    const { top, left, width, height } = elem.getBoundingClientRect();
    
    // Calculate cursor position relative to the image
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    
    // Ensure the position stays within the image bounds
    const boundedX = Math.max(0, Math.min(100, x));
    const boundedY = Math.max(0, Math.min(100, y));
    
    setCursorPosition({ x: boundedX, y: boundedY });
  };

  return (
    <div className="relative">
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`${className} ${showMagnifier ? "cursor-zoom-in" : ""}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        onError={(e) => {
          e.target.src = "/images/placeholder-product.png";
          e.target.onerror = null;
        }}
      />
      
      {showMagnifier && (
        <div
          className="absolute hidden md:block border-2 border-white rounded-full pointer-events-none overflow-hidden shadow-lg"
          style={{
            left: `${cursorPosition.x}%`,
            top: `${cursorPosition.y}%`,
            width: `${magnifierSize}px`,
            height: `${magnifierSize}px`,
            transform: "translate(-50%, -50%)",
            zIndex: 10,
          }}
        >
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `url(${src})`,
              backgroundSize: `${zoomLevel * 100}%`,
              backgroundPosition: `${cursorPosition.x}% ${cursorPosition.y}%`,
              backgroundRepeat: 'no-repeat',
            }}
          />
        </div>
      )}
      
      {/* Zoom indicator */}
      <div className={`absolute bottom-3 right-3 bg-black/50 text-white p-2 rounded-full pointer-events-none transition-opacity duration-300 ${showMagnifier ? 'opacity-100' : 'opacity-0'}`}>
        <FaSearchPlus size={14} />
      </div>
    </div>
  );
};

const ProductDetails = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addItemToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedStorage, setSelectedStorage] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    description: false,
    features: false,
    specifications: false,
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [timeLeft, setTimeLeft] = useState({
    hours: 3,
    minutes: 0,
    seconds: 0,
  });

  // Helper to extract clean variant data (handles Mongoose docs)
  const getCleanVariant = (variant) => variant._doc || variant;

  // Countdown timer
  useEffect(() => {
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 3);

    const timer = setInterval(() => {
      const now = new Date();
      const difference = endTime - now;

      if (difference <= 0) {
        clearInterval(timer);
        return;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Responsive check
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Get all possible colors (handles Mongoose docs)
  const allColors = useMemo(() => {
    if (!product?.variants) return [];
    const colors = new Set();
    product.variants.forEach((variant) => {
      const variantData = getCleanVariant(variant);
      if (variantData.color?.name) {
        colors.add(variantData.color.name);
      }
    });
    return Array.from(colors);
  }, [product]);

  // Check if base product has stock
  const hasBaseStock = useMemo(() => {
    return product?.stock > 0;
  }, [product]);

  // Auto-selection logic when product data changes
  useEffect(() => {
    if (!product || !product.variants?.length) return;

    // If base product has no stock or we need to auto-select variants
    if (!hasBaseStock || !selectedColor) {
      const variants = product.variants.map(getCleanVariant);

      // Find first color with available stock
      let firstAvailableColor = null;
      let firstAvailableStorage = null;
      let firstAvailableSize = null;

      for (const variant of variants) {
        if (!variant.color?.name) continue;

        // Check if this variant has any available options
        const hasVariantStock = variant.stock > 0;
        const hasStorageStock = variant.storageOptions?.some(
          (opt) => opt.stock > 0
        );
        const hasSizeStock = variant.sizeOptions?.some((opt) => opt.stock > 0);

        if (hasVariantStock || hasStorageStock || hasSizeStock) {
          if (!firstAvailableColor) {
            firstAvailableColor = variant.color.name;

            // Auto-select first available storage if exists
            if (!firstAvailableStorage && hasStorageStock) {
              const availableStorage = variant.storageOptions.find(
                (opt) => opt.stock > 0
              );
              firstAvailableStorage = availableStorage?.capacity;
            }

            // Auto-select first available size if exists
            if (!firstAvailableSize && hasSizeStock) {
              const availableSize = variant.sizeOptions.find(
                (opt) => opt.stock > 0
              );
              firstAvailableSize = availableSize?.size;
            }
          }
        }
      }

      // Set selections
      if (firstAvailableColor && !selectedColor) {
        setSelectedColor(firstAvailableColor);
      }

      if (firstAvailableStorage && !selectedStorage) {
        setSelectedStorage(firstAvailableStorage);
      }

      if (firstAvailableSize && !selectedSize) {
        setSelectedSize(firstAvailableSize);
      }
    }
  }, [product, hasBaseStock, selectedColor, selectedStorage, selectedSize]);

  // Fetch product data
  useEffect(() => {
    const fetchProductData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedProduct = await getProductById(productId, {
          isPublic: true,
        });
        if (!fetchedProduct) throw new Error("Product not found");

        setProduct(fetchedProduct);
      } catch (err) {
        console.error("Error fetching product:", err);
        setError(err.message || "Failed to load product details");
        toast.error(err.message || "Failed to load product details");
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) fetchProductData();
  }, [productId]);

  // Get all media (images + videos)
  const allMedia = useMemo(() => {
    const media = [];

    // Base product media
    if (product?.images) {
      media.push(...product.images.map((img) => ({ ...img, type: "image" })));
    }
    if (product?.videos) {
      media.push(...product.videos.map((vid) => ({ ...vid, type: "video" })));
    }

    // Variant media for selected color
    if (selectedColor && product?.variants) {
      const colorVariant = product.variants.find((v) => {
        const variantData = getCleanVariant(v);
        return variantData.color?.name === selectedColor;
      });

      if (colorVariant) {
        const variantData = getCleanVariant(colorVariant);
        if (variantData.images) {
          media.push(
            ...variantData.images.map((img) => ({
              ...img,
              type: "image",
              variant: true,
            }))
          );
        }
        if (variantData.videos) {
          media.push(
            ...variantData.videos.map((vid) => ({
              ...vid,
              type: "video",
              variant: true,
            }))
          );
        }
      }
    }

    return media.length > 0
      ? media
      : [
          {
            url: "/images/placeholder-product.png",
            alt: "Product image",
            type: "image",
          },
        ];
  }, [product, selectedColor]);

  // Find IN-STOCK variants for selected color
  const availableVariants = useMemo(() => {
    if (!selectedColor || !product?.variants) return [];

    return product.variants.filter((variant) => {
      const variantData = getCleanVariant(variant);
      if (variantData.color?.name !== selectedColor) return false;

      return (
        variantData.stock > 0 ||
        variantData.storageOptions?.some((opt) => opt.stock > 0) ||
        variantData.sizeOptions?.some((opt) => opt.stock > 0)
      );
    });
  }, [selectedColor, product]);

  // Get available storage options
  const availableStorages = useMemo(() => {
    const options = new Set();
    availableVariants.forEach((variant) => {
      const variantData = getCleanVariant(variant);
      variantData.storageOptions?.forEach((opt) => {
        if (opt.stock > 0) options.add(opt.capacity);
      });
    });
    return Array.from(options);
  }, [availableVariants]);

  // Get available size options
  const availableSizes = useMemo(() => {
    const options = new Set();
    availableVariants.forEach((variant) => {
      const variantData = getCleanVariant(variant);
      variantData.sizeOptions?.forEach((opt) => {
        if (opt.stock > 0) options.add(opt.size);
      });
    });
    return Array.from(options);
  }, [availableVariants]);

  // Get first variant image for color selection
  const getColorImage = (colorName) => {
    const variant = product?.variants?.find((v) => {
      const variantData = getCleanVariant(v);
      return variantData.color?.name === colorName;
    });
    const variantData = variant ? getCleanVariant(variant) : null;
    return (
      variantData?.images?.[0] || { url: "/images/placeholder-product.png" }
    );
  };

  // Handle color change
  const handleColorChange = (color) => {
    setSelectedColor(color);
    setSelectedStorage(null);
    setSelectedSize(null);
    setActiveImageIndex(0);

    // Auto-select first available options for the new color
    const variantsForColor = product.variants
      .map((v) => getCleanVariant(v))
      .filter((v) => v.color?.name === color);

    // Auto-select first available storage
    const firstStorage = variantsForColor.flatMap(
      (v) => v.storageOptions?.filter((o) => o.stock > 0) || []
    )[0]?.capacity;
    if (firstStorage) {
      setSelectedStorage(firstStorage);
    }

    // Auto-select first available size
    const firstSize = variantsForColor.flatMap(
      (v) => v.sizeOptions?.filter((o) => o.stock > 0) || []
    )[0]?.size;
    if (firstSize) {
      setSelectedSize(firstSize);
    }
  };

  // Calculate price info
  const priceInfo = useMemo(() => {
    let originalPrice = product?.price || 0;
    let discountPrice = product?.discountPrice || originalPrice;

    // Get all variants as clean objects
    const variants = product?.variants?.map(getCleanVariant) || [];

    // Priority order: size option > storage option > simple variant > base product

    // Check for selected size option first
    if (selectedSize && selectedColor) {
      const option = variants
        .filter((v) => v.color?.name === selectedColor)
        .flatMap(
          (v) =>
            v.sizeOptions?.filter(
              (o) => o.size === selectedSize && o.stock > 0
            ) || []
        )[0];
      if (option) {
        originalPrice = option.price;
        discountPrice = option.discountPrice || option.price;
      }
    }
    // Check for selected storage option
    else if (selectedStorage && selectedColor) {
      const option = variants
        .filter((v) => v.color?.name === selectedColor)
        .flatMap(
          (v) =>
            v.storageOptions?.filter(
              (o) => o.capacity === selectedStorage && o.stock > 0
            ) || []
        )[0];
      if (option) {
        originalPrice = option.price;
        discountPrice = option.discountPrice || option.price;
      }
    }
    // Check for simple color variant
    else if (selectedColor) {
      const variant = variants.find(
        (v) => v.color?.name === selectedColor && v.stock > 0
      );
      if (variant) {
        originalPrice = variant.price;
        discountPrice = variant.discountPrice || variant.price;
      }
    }

    const hasDiscount = discountPrice < originalPrice;
    const discountPercentage = hasDiscount
      ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
      : 0;

    return {
      originalPrice,
      discountPrice,
      hasDiscount,
      discountPercentage,
    };
  }, [product, selectedColor, selectedStorage, selectedSize]);

  // Calculate stock count
  const stockCount = useMemo(() => {
    const variants = product?.variants?.map(getCleanVariant) || [];

    // Priority order: size option > storage option > simple variant > base product

    // Size option
    if (selectedSize && selectedColor) {
      const option = variants
        .filter((v) => v.color?.name === selectedColor)
        .flatMap(
          (v) =>
            v.sizeOptions?.filter(
              (o) => o.size === selectedSize && o.stock > 0
            ) || []
        )[0];
      return option?.stock || 0;
    }

    // Storage option
    if (selectedStorage && selectedColor) {
      const option = variants
        .filter((v) => v.color?.name === selectedColor)
        .flatMap(
          (v) =>
            v.storageOptions?.filter(
              (o) => o.capacity === selectedStorage && o.stock > 0
            ) || []
        )[0];
      return option?.stock || 0;
    }

    // Simple color variant
    if (selectedColor) {
      const variant = variants.find(
        (v) => v.color?.name === selectedColor && v.stock > 0
      );
      return variant?.stock || 0;
    }

    // Base product
    return product?.stock || 0;
  }, [product, selectedColor, selectedStorage, selectedSize]);

  // Format time for display
  const formatTime = (time) => {
    return time < 10 ? `0${time}` : time;
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (!selectedColor && product.variants?.length > 0) {
      toast.info("Please select a color");
      return;
    }

    if (availableStorages.length > 0 && !selectedStorage) {
      toast.info("Please select a storage option");
      return;
    }

    if (availableSizes.length > 0 && !selectedSize) {
      toast.info("Please select a size");
      return;
    }

    try {
      const variantOptions = {
        variantColor: selectedColor || null,
        storageCapacity: selectedStorage || null,
        size: selectedSize ? selectedSize.replace(/\s+/g, "") : null,
      };

      const result = await addItemToCart(product._id, variantOptions, 1);
      if (result.success) {
        toast.success("Added to cart");
      } else {
        throw new Error(result.message || "Failed to add to cart");
      }
    } catch (err) {
      console.error("Add to cart error:", err);
      toast.error(err.message || "Failed to add to cart");
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate("/checkout");
  };

  const handleShare = async () => {
    try {
      // Check if the Web Share API is available
      if (navigator.share && navigator.canShare) {
        const shareData = {
          title: product.title,
          text: `Check out this amazing product: ${product.title}`,
          url: window.location.href,
        };

        // Check if the data can be shared
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          console.log("Product shared successfully");
        } else {
          // Fallback to clipboard
          await navigator.clipboard.writeText(window.location.href);
          toast.success("Product link copied to clipboard!");
        }
      } else if (navigator.clipboard) {
        // Fallback to clipboard API
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Product link copied to clipboard!");
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = window.location.href;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand("copy");
          toast.success("Product link copied to clipboard!");
        } catch (err) {
          console.error("Failed to copy: ", err);
          toast.error("Failed to copy link. Please copy manually.");
        }

        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error("Error sharing:", error);

      // Final fallback - try clipboard again
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Product link copied to clipboard!");
      } catch (clipboardError) {
        console.error("Clipboard fallback failed:", clipboardError);
        toast.error("Sharing failed. Please copy the URL manually.");
      }
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    setProduct(null);
  };

  const handleMediaError = (e) => {
    e.target.src = "/images/placeholder-product.png";
    e.target.onerror = null;
  };

  const handleImageChange = (index) => {
    setActiveImageIndex(index);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || "Product not found"}</p>
        <Button onClick={handleRetry} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-7 pb-24 md:pb-8 py-7">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Product Gallery */}
        <div className="lg:w-1/2">
          <div className="flex flex-col gap-4">
            {/* Main image/video display */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 flex items-center justify-center h-80 sm:h-96 relative overflow-hidden shadow-lg border border-gray-200 group">
              {/* Discount Badge */}
              {priceInfo.hasDiscount && (
                <div className="absolute top-4 left-4 z-10">
                  <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-1 shadow-lg animate-pulse">
                    <FaPercentage size={12} />
                    {priceInfo.discountPercentage}% OFF
                  </div>
                </div>
              )}

              {/* New/Hot Badge */}
              <div className="absolute top-4 right-4 z-10">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full font-bold text-xs shadow-lg">
                  🔥 HOT
                </div>
              </div>

              {allMedia[activeImageIndex]?.type === "video" ? (
                <video
                  src={allMedia[activeImageIndex].url}
                  className="w-full h-full object-contain rounded-xl transition-all duration-500 ease-in-out"
                  controls
                  muted
                  autoPlay
                  onError={handleMediaError}
                />
              ) : (
                <ImageMagnifier
                  src={
                    allMedia[activeImageIndex]?.url ||
                    "/images/placeholder-product.png"
                  }
                  alt={allMedia[activeImageIndex]?.alt || product.title}
                  className="w-full h-full object-contain rounded-xl transition-all duration-500 ease-in-out"
                  zoomLevel={2.5}
                  magnifierSize={180}
                />
              )}
            </div>

            {/* Thumbnail gallery */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {allMedia.map((media, index) => (
                <button
                  key={`${media.type}-${index}`}
                  className={`flex-shrink-0 w-20 h-20 border-3 rounded-xl transition-all duration-300 hover:scale-105 ${
                    index === activeImageIndex
                      ? "border-red-500 scale-105 shadow-lg ring-4 ring-red-200"
                      : "border-gray-200 hover:border-gray-400"
                  } ${media.variant ? "relative" : ""}`}
                  onClick={() => handleImageChange(index)}
                >
                  {media.type === "video" ? (
                    <div className="relative w-full h-full">
                      <video
                        src={media.url}
                        className="w-full h-full object-cover rounded-lg"
                        muted
                        onError={handleMediaError}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                        <FaPlay className="text-white text-sm drop-shadow-lg" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={media.url}
                      alt={media.alt}
                      className="w-full h-full object-cover rounded-lg"
                      onError={handleMediaError}
                    />
                  )}
                  {media.variant && (
                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg">
                      V
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div className="lg:w-1/2 space-y-6 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          {/* Product Title with Share Icon */}
          <div className="relative bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-500/10 to-blue-500/10 rounded-full blur-xl"></div>
            <div className="relative flex items-start gap-4">
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent leading-tight">
                  {product.title}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <div className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    ✓ Verified Product
                  </div>
                  <div className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    🚀 Fast Shipping
                  </div>
                </div>
              </div>
              <button
                onClick={handleShare}
                className="p-3 rounded-full cursor-pointer bg-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                title="Share product"
                type="button"
                aria-label="Share this product"
              >
                <FaShare className="text-gray-600 w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Rating, Reviews, Stock Info */}
          <div className="mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Rating */}
              {product.averageRating > 0 && (
                <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => {
                      if (i < Math.floor(product.averageRating)) {
                        return (
                          <FaStar key={i} className="text-yellow-400 text-sm" />
                        );
                      }
                      if (
                        i === Math.floor(product.averageRating) &&
                        product.averageRating % 1 >= 0.5
                      ) {
                        return (
                          <FaStarHalfAlt
                            key={i}
                            className="text-yellow-400 text-sm"
                          />
                        );
                      }
                      return (
                        <FaRegStar
                          key={i}
                          className="text-yellow-400 text-sm"
                        />
                      );
                    })}
                  </div>
                  <span className="text-gray-700 font-medium text-sm">
                    {product.averageRating}
                  </span>
                </div>
              )}

              {/* Hurry up with fire emoji */}
              <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg animate-pulse">
                <span className="text-red-600 font-medium text-sm">
                  Hurry up
                </span>
                <FaFire className="text-orange-500 animate-bounce" />
                <span className="font-bold text-red-700">
                  {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:
                  {formatTime(timeLeft.seconds)}
                </span>
              </div>

              {/* Stock count */}
              <div
                className={`px-3 py-2 rounded-lg font-medium text-sm ${
                  stockCount > 0
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {stockCount > 0 ? `Only ${stockCount} left` : "Out of stock"}
              </div>
            </div>
          </div>

          {/* Price with Discount */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border border-red-100 shadow-sm relative overflow-hidden mb-6">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-full blur-2xl"></div>
            <div className="relative space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  {new Intl.NumberFormat("en-PK", {
                    style: "currency",
                    currency: "PKR",
                    minimumFractionDigits: 0,
                  }).format(priceInfo.discountPrice)}
                </div>
                {priceInfo.hasDiscount && (
                  <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse shadow-lg">
                    SAVE {priceInfo.discountPercentage}%
                  </div>
                )}
              </div>
              {priceInfo.hasDiscount && (
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 line-through text-lg">
                    {new Intl.NumberFormat("en-PK", {
                      style: "currency",
                      currency: "PKR",
                      minimumFractionDigits: 0,
                    }).format(priceInfo.originalPrice)}
                  </span>
                  <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <FaPercentage size={10} />
                    {priceInfo.discountPercentage}% OFF
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Color Selection */}
          {allColors.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full"></div>
                <h3 className="font-bold text-xl text-gray-800">
                  Color: <span className="text-red-600">{selectedColor}</span>
                </h3>
              </div>
              <div className="flex gap-3 flex-wrap">
                {allColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    className={`w-16 h-16 rounded-xl border-3 overflow-hidden transition-all duration-300 hover:scale-110 ${
                      selectedColor === color
                        ? "border-purple-500 scale-105 shadow-lg ring-4 ring-purple-200"
                        : "border-gray-200 hover:border-gray-400"
                    } ${
                      !availableVariants.some((v) => {
                        const variantData = getCleanVariant(v);
                        return variantData.color?.name === color;
                      })
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    title={color}
                    disabled={
                      !product.variants.some((v) => {
                        const variantData = getCleanVariant(v);
                        return (
                          variantData.color?.name === color &&
                          (variantData.stock > 0 ||
                            variantData.storageOptions?.some(
                              (o) => o.stock > 0
                            ) ||
                            variantData.sizeOptions?.some((o) => o.stock > 0))
                        );
                      })
                    }
                  >
                    <img
                      src={getColorImage(color).url}
                      alt={color}
                      className="w-full h-full object-cover"
                      onError={handleMediaError}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Storage Options */}
          {availableStorages.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                <h3 className="font-bold text-xl text-gray-800">Storage</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {availableStorages.map((storage) => (
                  <button
                    key={storage}
                    onClick={() => setSelectedStorage(storage)}
                    className={`px-6 py-4 border-2 rounded-xl transition-all duration-300 hover:scale-105 ${
                      selectedStorage === storage
                        ? "border-blue-500 bg-gradient-to-r from-blue-50 to-cyan-50 scale-105 shadow-lg ring-4 ring-blue-200"
                        : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`text-base font-semibold ${
                        selectedStorage === storage
                          ? "text-blue-600"
                          : "text-gray-700"
                      }`}
                    >
                      {storage}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Options */}
          {availableSizes.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                <h3 className="font-bold text-xl text-gray-800">Size</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {availableSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-6 py-4 border-2 rounded-xl transition-all duration-300 hover:scale-105 ${
                      selectedSize === size
                        ? "border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 scale-105 shadow-lg ring-4 ring-green-200"
                        : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`text-base font-semibold ${
                        selectedSize === size
                          ? "text-green-600"
                          : "text-gray-700"
                      }`}
                    >
                      {size}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Desktop Action Buttons */}
          {!isMobile && (
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                onClick={handleAddToCart}
                disabled={stockCount <= 0}
                className="flex-1 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                🛒 Add to Cart
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={stockCount <= 0}
                className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                ⚡ Buy Now
              </Button>
            </div>
          )}

          {/* Expandable Sections */}
          <div className="pt-6 space-y-4">
            {/* Description */}
            {product.description && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection("description")}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                    <h3 className="font-bold text-lg text-gray-800">
                      Description
                    </h3>
                  </div>
                  <div
                    className={`transition-transform duration-300 ${
                      expandedSections.description ? "rotate-180" : ""
                    }`}
                  >
                    <FaChevronDown className="text-gray-500 w-5 h-5" />
                  </div>
                </button>
                {expandedSections.description && (
                  <div className="border-t border-gray-100">
                    <SafeHTMLRenderer
                      html={product.description}
                      className="px-6 py-4 tiptap-editor ProseMirror bg-gradient-to-r from-gray-50 to-blue-50"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Features */}
            {product.features?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection("features")}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gradient-to-r hover:from-gray-50 hover:to-green-50 transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                    <h3 className="font-bold text-lg text-gray-800">
                      Features
                    </h3>
                  </div>
                  <div
                    className={`transition-transform duration-300 ${
                      expandedSections.features ? "rotate-180" : ""
                    }`}
                  >
                    <FaChevronDown className="text-gray-500 w-5 h-5" />
                  </div>
                </button>
                {expandedSections.features && (
                  <div className="border-t border-gray-100 bg-gradient-to-r from-gray-50 to-green-50">
                    <div className="px-6 py-4 text-gray-600">
                      <ul className="space-y-2">
                        {product.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-500 font-bold mt-1">
                              ✓
                            </span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Specifications */}
            {product.specifications?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection("specifications")}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gradient-to-r hover:from-gray-50 hover:to-orange-50 transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
                    <h3 className="font-bold text-lg text-gray-800">
                      Specifications
                    </h3>
                  </div>
                  <div
                    className={`transition-transform duration-300 ${
                      expandedSections.specifications ? "rotate-180" : ""
                    }`}
                  >
                    <FaChevronDown className="text-gray-500 w-5 h-5" />
                  </div>
                </button>
                {expandedSections.specifications && (
                  <div className="border-t border-gray-100">
                    <div className="overflow-hidden">
                      <table className="w-full">
                        <tbody className="divide-y divide-gray-100">
                          {product.specifications.map((spec, i) => (
                            <tr
                              key={i}
                              className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-orange-50 transition-all duration-200"
                            >
                              <td className="px-6 py-4 bg-gradient-to-r from-gray-50 to-orange-50 font-semibold text-gray-700 capitalize">
                                {spec.key}
                              </td>
                              <td className="px-6 py-4 text-gray-600 capitalize">
                                {spec.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Action Buttons */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t border-gray-200 p-4 z-10">
          <div className="flex gap-3">
            <Button
              onClick={handleAddToCart}
              disabled={stockCount <= 0}
              className="flex-1 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              🛒 Add to Cart
            </Button>
            <Button
              onClick={handleBuyNow}
              disabled={stockCount <= 0}
              className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              ⚡ Buy Now
            </Button>
          </div>
        </div>
      )}
      <ProductReviews productId={product._id} />
    </div>
  );
};

export default ProductDetails;
