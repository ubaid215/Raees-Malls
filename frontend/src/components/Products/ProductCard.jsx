import React, { memo, useState, useEffect, useContext } from "react";
import { CiShoppingCart } from "react-icons/ci";
import {
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
  FaHeart,
  FaRegHeart,
  FaFire,
  FaCrown,
  FaEye,
  FaShippingFast,
  FaMemory,
  FaTshirt,
  FaPalette,
} from "react-icons/fa";
import { BsLightningChargeFill } from "react-icons/bs";
import { MdLocalOffer, MdVerified } from "react-icons/md";
import { IoTimeOutline } from "react-icons/io5";
import { useToast } from "../../context/ToastContext"; 
import Button from "../core/Button";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { useProduct } from "../../context/ProductContext";
import { WishlistContext } from "../../context/WishlistContext";
import PropTypes from "prop-types";

const ProductCard = memo(({ productId, product: initialProduct }) => {
  const navigate = useNavigate();
  const { addItemToCart } = useCart();
  const { user } = useAuth();
  const { getProduct } = useProduct();
  const { wishlist, addItemToWishlist, removeItemFromWishlist, loading } = useContext(WishlistContext);
  const [product, setProduct] = useState(initialProduct);
  const [loadingProduct, setLoadingProduct] = useState(!initialProduct);
  const [addToCartStatus, setAddToCartStatus] = useState({
    loading: false,
    success: false,
    error: null,
  });
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
   const { success, error, info } = useToast();
  const [selectedOptions, setSelectedOptions] = useState({
    variantColor: null,
    storageCapacity: null,
    size: null,
  });
  const [showVariantSelector, setShowVariantSelector] = useState(false);

  useEffect(() => {
    if (productId && !initialProduct) {
      const fetchProduct = async () => {
        try {
          setLoadingProduct(true);
          const fetchedProduct = await getProduct(productId, { skipCache: false });
          setProduct(fetchedProduct);
        } catch (error) {
          console.error("Failed to fetch product:", error);
          toast.error("Failed to load product details");
        } finally {
          setLoadingProduct(false);
        }
      };
      fetchProduct();
    }
  }, [productId, initialProduct, getProduct]);

  useEffect(() => {
    if (product?._id) {
      setIsInWishlist(wishlist.some((item) => item.productId === product._id));
    }
  }, [wishlist, product]);

  useEffect(() => {
    if (product?.variants?.length > 0) {
      const stockInfo = getStockInfo();
      if (stockInfo.defaultVariant) {
        setSelectedVariant(stockInfo.defaultVariant);
        setSelectedOptions(stockInfo.defaultVariantOptions || {});
      }
    }
  }, [product]);

  useEffect(() => {
    let interval;
    if (isHovered && product?.images?.length > 1) {
      interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
      }, 1500);
    } else {
      setCurrentImageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isHovered, product?.images?.length]);

  const getAllImages = () => {
    const images = [];
    if (selectedVariant?.images?.length > 0) {
      images.push(...selectedVariant.images);
    } else if (product?.images?.length > 0) {
      images.push(...product.images);
    }
    if (product?.variants?.length > 0 && images.length === 0) {
      product.variants.forEach((variant) => {
        if (variant.images?.length > 0) {
          images.push(...variant.images);
        }
      });
    }
    return images.length > 0
      ? images
      : [{ url: "/images/placeholder-product.png", alt: "Placeholder image" }];
  };

  const getDisplayImage = () => {
    const allImages = getAllImages();
    return allImages[currentImageIndex] || allImages[0];
  };

  const getStockInfo = () => {
    if (!product) {
      return {
        hasStock: false,
        displayStock: 0,
        hasVariants: false,
        availableOptions: 0,
        defaultVariant: null,
        defaultVariantOptions: null,
        isLowStock: false,
      };
    }

    if (product.stock > 0) {
      return {
        hasStock: true,
        displayStock: product.stock,
        hasVariants: false,
        availableOptions: 1,
        defaultVariant: null,
        defaultVariantOptions: {},
        isLowStock: product.stock <= 5,
      };
    }

    if (product.variants?.length > 0) {
      let totalStock = 0;
      let availableOptions = 0;
      let firstAvailableVariant = null;
      let firstAvailableOption = null;

      for (const variant of product.variants) {
        if (variant.stock > 0 && !variant.storageOptions?.length && !variant.sizeOptions?.length) {
          totalStock += variant.stock;
          availableOptions++;
          if (!firstAvailableVariant) {
            firstAvailableVariant = variant;
            firstAvailableOption = {
              variantColor: variant.color?.name || null,
              storageCapacity: null,
              size: null,
            };
          }
        }
        if (variant.storageOptions?.length > 0) {
          for (const option of variant.storageOptions) {
            if (option.stock > 0) {
              totalStock += option.stock;
              availableOptions++;
              if (!firstAvailableVariant) {
                firstAvailableVariant = variant;
                firstAvailableOption = {
                  variantColor: variant.color?.name || null,
                  storageCapacity: option.capacity || null,
                  size: null,
                };
              }
            }
          }
        }
        if (variant.sizeOptions?.length > 0) {
          for (const option of variant.sizeOptions) {
            if (option.stock > 0) {
              totalStock += option.stock;
              availableOptions++;
              if (!firstAvailableVariant) {
                firstAvailableVariant = variant;
                firstAvailableOption = {
                  variantColor: variant.color?.name || null,
                  storageCapacity: null,
                  size: option.size || null,
                };
              }
            }
          }
        }
      }

      return {
        hasStock: totalStock > 0,
        displayStock: totalStock,
        hasVariants: true,
        availableOptions,
        defaultVariant: firstAvailableVariant,
        defaultVariantOptions: firstAvailableOption,
        isLowStock: totalStock <= 10,
      };
    }

    return {
      hasStock: false,
      displayStock: 0,
      hasVariants: false,
      availableOptions: 0,
      defaultVariant: null,
      defaultVariantOptions: null,
      isLowStock: false,
    };
  };

  const getCurrentPrice = () => {
    if (selectedOptions.storageCapacity && selectedVariant) {
      const storageOption = selectedVariant.storageOptions?.find(
        (opt) => opt.capacity === selectedOptions.storageCapacity
      );
      if (storageOption) {
        return {
          price: storageOption.price,
          discountPrice: storageOption.discountPrice,
          stock: storageOption.stock,
        };
      }
    }

    if (selectedOptions.size && selectedVariant) {
      const sizeOption = selectedVariant.sizeOptions?.find(
        (opt) => opt.size === selectedOptions.size
      );
      if (sizeOption) {
        return {
          price: sizeOption.price,
          discountPrice: sizeOption.discountPrice,
          stock: sizeOption.stock,
        };
      }
    }

    if (selectedVariant) {
      return {
        price: selectedVariant.price,
        discountPrice: selectedVariant.discountPrice,
        stock: selectedVariant.stock,
      };
    }

    return {
      price: product?.price || 0,
      discountPrice: product?.discountPrice,
      stock: product?.stock || 0,
    };
  };

  const getColorStyle = (color) => {
    // Handle different color formats
    if (color.hex) return { backgroundColor: color.hex };
    if (color.code) return { backgroundColor: color.code };
    if (color.value) return { backgroundColor: color.value };
    
    // Fallback to common color names
    const colorMap = {
      'black': '#000000',
      'white': '#ffffff',
      'red': '#ef4444',
      'blue': '#3b82f6',
      'green': '#10b981',
      'yellow': '#f59e0b',
      'purple': '#8b5cf6',
      'pink': '#ec4899',
      'gray': '#6b7280',
      'grey': '#6b7280',
      'brown': '#92400e',
      'orange': '#f97316',
      'navy': '#1e3a8a',
      'silver': '#94a3b8',
      'gold': '#fbbf24'
    };
    
    const colorName = color.name?.toLowerCase();
    if (colorName && colorMap[colorName]) {
      return { backgroundColor: colorMap[colorName] };
    }
    
    // Last resort - try to use the name as a CSS color
    return { backgroundColor: colorName || '#cccccc' };
  };

  const getPriceInfo = () => {
    const currentPrice = getCurrentPrice();
    const hasDiscount = currentPrice.discountPrice && currentPrice.discountPrice < currentPrice.price;
    const discountPercentage = hasDiscount
      ? Math.round(((currentPrice.price - currentPrice.discountPrice) / currentPrice.price) * 100)
      : 0;

    return {
      displayPrice: currentPrice.discountPrice || currentPrice.price,
      originalPrice: currentPrice.price,
      discountPrice: currentPrice.discountPrice,
      hasDiscount,
      discountPercentage,
      stock: currentPrice.stock,
    };
  };

  const getRatingData = () => {
    if (!product) return { rating: 0, reviewCount: 0, hasReviews: false };
    const rating = product.averageRating || product.rating || 0;
    const reviewCount = product.reviewCount || product.totalReviews || 0;
    return {
      rating: rating,
      reviewCount: reviewCount,
      hasReviews: reviewCount > 0,
    };
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} className="text-yellow-400" />);
    }
    if (hasHalfStar) {
      stars.push(<FaStarHalfAlt key="half" className="text-yellow-400" />);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<FaRegStar key={`empty-${i}`} className="text-gray-300" />);
    }
    return stars;
  };

  const getAvailableColors = () => {
    if (!product?.variants) return [];
    return product.variants
      .filter(variant => variant.stock > 0 || variant.storageOptions?.some(opt => opt.stock > 0) || variant.sizeOptions?.some(opt => opt.stock > 0))
      .map(variant => variant.color)
      .filter(Boolean);
  };

  const getAvailableStorageOptions = () => {
    if (!selectedVariant?.storageOptions) return [];
    return selectedVariant.storageOptions.filter(opt => opt.stock > 0);
  };

  const getAvailableSizeOptions = () => {
    if (!selectedVariant?.sizeOptions) return [];
    return selectedVariant.sizeOptions.filter(opt => opt.stock > 0);
  };

  const handleVariantChange = (type, value) => {
    // console.log('handleVariantChange called:', { type, value }); 
    
    if (type === 'color') {
      const newVariant = product.variants.find(v => v.color?.name === value);
      // console.log('Found variant:', newVariant); 
      
      if (newVariant) {
        setSelectedVariant(newVariant);
        
        const newOptions = {
          variantColor: value,
          storageCapacity: null,
          size: null,
        };
        
        // Auto-select first available option based on variant structure
        if (newVariant.storageOptions?.length > 0) {
          const firstAvailableStorage = newVariant.storageOptions.find(opt => opt.stock > 0);
          if (firstAvailableStorage) {
            newOptions.storageCapacity = firstAvailableStorage.capacity;
          }
        } else if (newVariant.sizeOptions?.length > 0) {
          const firstAvailableSize = newVariant.sizeOptions.find(opt => opt.stock > 0);
          if (firstAvailableSize) {
            newOptions.size = firstAvailableSize.size;
          }
        }
        // If no sub-options, the variant itself should have stock
        
        setSelectedOptions(newOptions);
        // console.log('Updated selectedOptions:', newOptions); 
      }
    } else {
      setSelectedOptions(prev => {
        const updated = {
          ...prev,
          [type === 'storage' ? 'storageCapacity' : 'size']: value,
        };
        // console.log('Updated selectedOptions for', type, ':', updated); 
        return updated;
      });
    }
  };

  if (loadingProduct) {
    return (
      <div className="w-full bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <div className="animate-pulse">
          <div className="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 w-full aspect-square sm:aspect-square"></div>
          <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
            <div className="h-4 sm:h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-3/4"></div>
            <div className="h-3 sm:h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-1/2"></div>
            <div className="h-6 sm:h-7 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product || !product._id) {
    return (
      <div className="w-full bg-white rounded-lg shadow border border-gray-100 overflow-hidden text-center p-3 sm:p-4">
        <p className="text-red-500 text-xs sm:text-sm font-medium">
          Product not available
        </p>
      </div>
    );
  }

  const stockInfo = getStockInfo();
  const priceInfo = getPriceInfo();
  const displayImage = getDisplayImage();
  const isOutOfStock = priceInfo.stock <= 0;
  const ratingInfo = getRatingData();
  const isHotDeal = priceInfo.discountPercentage > 40;
  const availableColors = getAvailableColors();
  const availableStorageOptions = getAvailableStorageOptions();
  const availableSizeOptions = getAvailableSizeOptions();

  const handleCardClick = (e) => {
    if (e.target.tagName === "BUTTON" || e.target.closest("button") || e.target.tagName === "A") {
      return;
    }
    navigate(`/product/${product._id}`);
  };

   const handleAddToCartClick = async (e) => {
    e.stopPropagation();
    if (!user) {
      info("Please login to add items to cart");
      navigate("/login", { state: { from: window.location.pathname } });
      return;
    }

    setAddToCartStatus({ loading: true, success: false, error: null });

    try {
      const result = await addItemToCart(product._id, selectedOptions, 1);

      if (result.success) {
        // Replace react-toastify with custom toast
        success(result.message || `${product.title} added to cart!`);
        setAddToCartStatus({ loading: false, success: true, error: null });
        setTimeout(() => {
          setAddToCartStatus((prev) => ({ ...prev, success: false }));
        }, 2000);
      } else {
        throw new Error(result.message || "Failed to add to cart");
      }
    } catch (err) {
      console.error("Add to cart error:", err);
      // Replace react-toastify with custom toast
      error(err.message || "Failed to add to cart");
      setAddToCartStatus({
        loading: false,
        success: false,
        error: err.message,
      });
      setTimeout(() => {
        setAddToCartStatus((prev) => ({ ...prev, error: null }));
      }, 3000);
    }
  };

  const handleWishlistClick = async (e) => {
    e.stopPropagation();
    if (loading) return;

    try {
      if (isInWishlist) {
        await removeItemFromWishlist(product._id);
        // Replace react-toastify with custom toast
        success(`${product.title} removed from wishlist!`);
      } else {
        await addItemToWishlist(product._id);
        // Replace react-toastify with custom toast
        success(`${product.title} added to wishlist!`);
      }
    } catch (err) {
      // Replace react-toastify with custom toast
      error(err.message || "Failed to update wishlist");
    }
  };

  const handleQuickView = (e) => {
    e.stopPropagation();
    navigate(`/product/${product._id}?quickview=true`);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const renderPricing = () => {
    return (
      <div className="mt-1 sm:mt-2 space-y-1">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <p className="text-sm sm:text-base font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
            {formatPrice(priceInfo.displayPrice)}
          </p>
          {priceInfo.hasDiscount && (
            <>
              <p className="text-xs text-gray-500 line-through">
                {formatPrice(priceInfo.originalPrice)}
              </p>
              <div className="flex items-center gap-0.5 sm:gap-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-1 sm:px-1.5 py-0.5 rounded-full">
                <BsLightningChargeFill className="text-xs" />
                <span className="text-xs font-bold">
                  {priceInfo.discountPercentage}% OFF
                </span>
              </div>
            </>
          )}
        </div>
        {priceInfo.hasDiscount && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <MdLocalOffer className="text-xs" />
            Save {formatPrice(priceInfo.originalPrice - priceInfo.displayPrice)}
          </p>
        )}
      </div>
    );
  };

  const renderVariantSelector = () => {
    const hasVariants = availableColors.length > 0 || availableStorageOptions.length > 0 || availableSizeOptions.length > 0;
    
    if (!hasVariants) return null;

    return (
      <div className="mt-2 space-y-2">
        {/* Color Options */}
        {availableColors.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <FaPalette className="text-xs text-gray-500" />
            <div className="flex gap-1 flex-wrap">
              {availableColors.slice(0, 4).map((color, index) => {
                // console.log('Rendering color:', color); 
                return (
                  <button
                    key={color.name || index}
                    onClick={(e) => {
                      e.stopPropagation();
                      // console.log('Color clicked:', color.name); 
                      handleVariantChange('color', color.name);
                    }}
                    className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 transition-all relative ${
                      selectedOptions.variantColor === color.name
                        ? 'border-red-500 scale-110 shadow-md'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={getColorStyle(color)}
                    title={color.name}
                  >
                    {/* White border for light colors */}
                    {color.name?.toLowerCase() === 'white' && (
                      <div className="absolute inset-0 rounded-full border border-gray-200 opacity-30" />
                    )}
                    {/* Selection indicator */}
                    {selectedOptions.variantColor === color.name && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm border border-gray-300" />
                      </div>
                    )}
                  </button>
                );
              })}
              {availableColors.length > 4 && (
                <span className="text-xs text-gray-500 self-center">+{availableColors.length - 4}</span>
              )}
            </div>
          </div>
        )}

        {/* Storage Options */}
        {availableStorageOptions.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <FaMemory className="text-xs text-gray-500" />
            <div className="flex gap-1 flex-wrap">
              {availableStorageOptions.slice(0, 3).map((storage) => (
                <button
                  key={storage.capacity}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVariantChange('storage', storage.capacity);
                  }}
                  className={`px-1.5 py-0.5 text-xs rounded border transition-all ${
                    selectedOptions.storageCapacity === storage.capacity
                      ? 'border-red-500 bg-red-50 text-red-700 font-semibold'
                      : storage.stock > 0 
                        ? 'border-gray-300 hover:border-gray-400 text-gray-600'
                        : 'border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={storage.stock <= 0}
                  title={`${storage.capacity} - ${storage.stock > 0 ? `${storage.stock} available` : 'Out of stock'}`}
                >
                  {storage.capacity}
                </button>
              ))}
              {availableStorageOptions.length > 3 && (
                <span className="text-xs text-gray-500 self-center">+{availableStorageOptions.length - 3}</span>
              )}
            </div>
          </div>
        )}

        {/* Size Options */}
        {availableSizeOptions.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <FaTshirt className="text-xs text-gray-500" />
            <div className="flex gap-1 flex-wrap">
              {availableSizeOptions.slice(0, 4).map((size) => (
                <button
                  key={size.size}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVariantChange('size', size.size);
                  }}
                  className={`px-1.5 py-0.5 text-xs rounded border transition-all ${
                    selectedOptions.size === size.size
                      ? 'border-red-500 bg-red-50 text-red-700 font-semibold'
                      : size.stock > 0
                        ? 'border-gray-300 hover:border-gray-400 text-gray-600'
                        : 'border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={size.stock <= 0}
                  title={`Size ${size.size} - ${size.stock > 0 ? `${size.stock} available` : 'Out of stock'}`}
                >
                  {size.size}
                </button>
              ))}
              {availableSizeOptions.length > 4 && (
                <span className="text-xs text-gray-500 self-center">+{availableSizeOptions.length - 4}</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleMediaError = (e) => {
    e.target.src = "/images/placeholder-product.png";
    e.target.onerror = null;
  };

  const getButtonState = () => {
    if (addToCartStatus.loading) return "Adding...";
    if (addToCartStatus.success) return "Added!";
    if (addToCartStatus.error) return "Try Again";
    return "Add to Cart";
  };

  const mediaUrl = displayImage.url.startsWith("http")
    ? displayImage.url
    : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${displayImage.url}`;

  return (
    <div
      className="w-full bg-white rounded-lg shadow border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col group"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleCardClick(e)}
      aria-label={`View ${product.title} details`}
    >
      <div className="relative overflow-hidden">
        <img
          src={mediaUrl}
          alt={displayImage.alt || product.title}
          className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          onError={handleMediaError}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Top badges */}
        <div className="absolute top-1 sm:top-2 left-1 sm:left-2 flex flex-col gap-1 z-10">
          <div className="flex flex-wrap gap-1">
            {product.isFeatured && (
              <span className="flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold shadow">
                <FaCrown className="text-xs" />
                <span className="hidden sm:inline">Featured</span>
              </span>
            )}
            {priceInfo.hasDiscount && isHotDeal && (
              <span className="flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold shadow animate-pulse">
                <FaFire className="text-xs" />
                <span className="hidden sm:inline">HOT</span>
              </span>
            )}
          </div>
          <span
            className={`px-1 sm:px-1.5 py-0.5 rounded-full text-xs font-bold shadow ${
              isOutOfStock
                ? "bg-red-100 text-red-700"
                : priceInfo.stock <= 5
                  ? "bg-orange-100 text-orange-700"
                  : "bg-green-100 text-green-700"
            }`}
          >
            {isOutOfStock
              ? "Out of Stock"
              : priceInfo.stock <= 5
                ? `${priceInfo.stock} left`
                : `In Stock`}
          </span>
        </div>

        {/* Top right actions */}
        <div className="absolute top-1 sm:top-2 right-1 sm:right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={handleWishlistClick}
            className="p-1 sm:p-1.5 rounded-full bg-white/90 hover:bg-white transition-colors shadow backdrop-blur-sm"
            aria-label={
              isInWishlist
                ? `Remove ${product.title} from wishlist`
                : `Add ${product.title} to wishlist`
            }
            disabled={loading}
          >
            {isInWishlist ? (
              <FaHeart className="text-red-600 text-xs sm:text-sm" />
            ) : (
              <FaRegHeart className="text-gray-600 text-xs sm:text-sm hover:text-red-600 transition-colors" />
            )}
          </button>
          <button
            onClick={handleQuickView}
            className="p-1 sm:p-1.5 rounded-full bg-white/90 hover:bg-white transition-colors shadow backdrop-blur-sm"
            aria-label={`Quick view ${product.title}`}
          >
            <FaEye className="text-gray-600 text-xs sm:text-sm hover:text-blue-600 transition-colors" />
          </button>
        </div>

        {/* Image indicators */}
        {getAllImages().length > 1 && (
          <div className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 flex gap-0.5 sm:gap-1">
            {getAllImages()
              .slice(0, 3)
              .map((_, index) => (
                <div
                  key={index}
                  className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-colors ${
                    index === currentImageIndex ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
          </div>
        )}
      </div>

      <div className="p-2 sm:p-3 flex flex-col gap-1 sm:gap-2 flex-grow">
        {/* Product title and category */}
        <div className="space-y-1">
          <h2 className="text-xs sm:text-sm font-bold text-gray-800 hover:text-red-600 line-clamp-2 leading-tight transition-colors">
            {product.title}
          </h2>
          
          {/* Rating and category in one row on mobile */}
          <div className="flex items-center justify-between gap-2">
            {ratingInfo.hasReviews ? (
              <div className="flex items-center gap-1 text-xs">
                <div className="flex items-center gap-0.5">
                  {renderStars(ratingInfo.rating).slice(0, 3)}
                </div>
                <span className="text-gray-600 hidden sm:inline">
                  {ratingInfo.rating.toFixed(1)}
                </span>
                <span className="text-gray-500 text-xs">
                  ({ratingInfo.reviewCount})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <div className="flex items-center gap-0.5">{renderStars(0).slice(0, 3)}</div>
                <span className="hidden sm:inline">No reviews</span>
              </div>
            )}
            
            {product.categoryId?.name && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MdVerified className="text-green-500 text-xs" />
                <span className="text-gray-600 hidden sm:inline">{product.categoryId.name}</span>
              </div>
            )}
          </div>
        </div>

        {renderPricing()}
        {renderVariantSelector()}

        {/* Trust badges - simplified for mobile */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-0.5">
            <MdVerified className="text-green-500 text-xs" />
            <span className="hidden sm:inline">Verified</span>
          </div>
          <div className="flex items-center gap-0.5">
            <FaShippingFast className="text-blue-500 text-xs" />
            <span className="hidden sm:inline">Fast Ship</span>
          </div>
        </div>

        {/* Low stock warning - compact for mobile */}
        {priceInfo.stock <= 5 && priceInfo.stock > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-1 sm:p-1.5 flex items-center gap-1">
            <IoTimeOutline className="text-red-500 text-xs" />
            <span className="text-xs text-red-700">Limited stock!</span>
          </div>
        )}

        {/* Add to Cart Button */}
        <Button
          onClick={handleAddToCartClick}
          className={`mt-1 sm:mt-2 w-full font-bold transition-all duration-300 ${
            addToCartStatus.loading
              ? "bg-gray-500 cursor-wait"
              : addToCartStatus.success
                ? "bg-green-600 hover:bg-green-700"
                : addToCartStatus.error
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : isOutOfStock
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
          } text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg flex items-center justify-center gap-1 text-xs sm:text-sm shadow`}
          aria-label={`Add ${product.title} to cart`}
          disabled={isOutOfStock || addToCartStatus.loading}
          icon={addToCartStatus.success ? MdVerified : CiShoppingCart}
        >
          {isOutOfStock ? "Out of Stock" : getButtonState()}
        </Button>
      </div>
    </div>
  );
});

ProductCard.propTypes = {
  productId: PropTypes.string,
  product: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    price: PropTypes.number,
    discountPrice: PropTypes.number,
    stock: PropTypes.number,
    images: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        alt: PropTypes.string,
      })
    ),
    categoryId: PropTypes.shape({
      name: PropTypes.string,
    }),
    averageRating: PropTypes.number,
    rating: PropTypes.number,
    reviewCount: PropTypes.number,
    isFeatured: PropTypes.bool,
    hasLimitedOffer: PropTypes.bool,
    variants: PropTypes.arrayOf(
      PropTypes.shape({
        color: PropTypes.shape({
          name: PropTypes.string,
          hex: PropTypes.string,
          code: PropTypes.string,
        }),
        images: PropTypes.arrayOf(
          PropTypes.shape({
            url: PropTypes.string,
            alt: PropTypes.string,
          })
        ),
        price: PropTypes.number,
        discountPrice: PropTypes.number,
        stock: PropTypes.number,
        storageOptions: PropTypes.arrayOf(
          PropTypes.shape({
            capacity: PropTypes.string,
            price: PropTypes.number,
            discountPrice: PropTypes.number,
            stock: PropTypes.number,
          })
        ),
        sizeOptions: PropTypes.arrayOf(
          PropTypes.shape({
            size: PropTypes.string,
            price: PropTypes.number,
            discountPrice: PropTypes.number,
            stock: PropTypes.number,
          })
        ),
      })
    ),
  }),
};

ProductCard.defaultProps = {
  product: null,
  productId: null,
};

export default ProductCard;