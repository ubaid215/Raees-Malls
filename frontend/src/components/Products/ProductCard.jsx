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
} from "react-icons/fa";
import { BsLightningChargeFill } from "react-icons/bs";
import { MdLocalOffer, MdVerified } from "react-icons/md";
import { IoTimeOutline } from "react-icons/io5";
import { toast } from "react-toastify";
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
  const [urgencyTimer, setUrgencyTimer] = useState(null);

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
    if (product?.hasLimitedOffer) {
      const timer = new Date();
      timer.setHours(timer.getHours() + 24);
      setUrgencyTimer(timer);
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
    if (product?.images?.length > 0) {
      images.push(...product.images);
    }
    if (product?.variants?.length > 0) {
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
        // Check simple color variant
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
        // Check storage options
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
        // Check size options
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

  const getPriceInfo = () => {
    if (!product) {
      return {
        displayPrice: 0,
        originalPrice: 0,
        discountPrice: null,
        hasDiscount: false,
        discountPercentage: 0,
        priceRange: null,
      };
    }

    // Handle simple product pricing (no variants)
    if (!product.variants?.length) {
      const hasDiscount = product.discountPrice && product.discountPrice < product.price;
      const discountPercentage = hasDiscount
        ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
        : 0;

      return {
        displayPrice: product.discountPrice || product.price,
        originalPrice: product.price,
        discountPrice: product.discountPrice,
        hasDiscount,
        discountPercentage,
        priceRange: null,
      };
    }

    // Handle variant pricing
    const stockInfo = getStockInfo();
    const firstAvailableVariant = stockInfo.defaultVariant;

    if (stockInfo.availableOptions === 1 && firstAvailableVariant) {
      // Single variant or option in stock
      if (firstAvailableVariant.stock > 0 && !firstAvailableVariant.storageOptions?.length && !firstAvailableVariant.sizeOptions?.length) {
        const hasDiscount = firstAvailableVariant.discountPrice && firstAvailableVariant.discountPrice < firstAvailableVariant.price;
        const discountPercentage = hasDiscount
          ? Math.round(((firstAvailableVariant.price - firstAvailableVariant.discountPrice) / firstAvailableVariant.price) * 100)
          : 0;

        return {
          displayPrice: firstAvailableVariant.discountPrice || firstAvailableVariant.price,
          originalPrice: firstAvailableVariant.price,
          discountPrice: firstAvailableVariant.discountPrice,
          hasDiscount,
          discountPercentage,
          priceRange: null,
        };
      }

      // Single storage option
      if (firstAvailableVariant.storageOptions?.length === 1) {
        const option = firstAvailableVariant.storageOptions[0];
        const hasDiscount = option.discountPrice && option.discountPrice < option.price;
        const discountPercentage = hasDiscount
          ? Math.round(((option.price - option.discountPrice) / option.price) * 100)
          : 0;

        return {
          displayPrice: option.discountPrice || option.price,
          originalPrice: option.price,
          discountPrice: option.discountPrice,
          hasDiscount,
          discountPercentage,
          priceRange: null,
        };
      }

      // Single size option
      if (firstAvailableVariant.sizeOptions?.length === 1) {
        const option = firstAvailableVariant.sizeOptions[0];
        const hasDiscount = option.discountPrice && option.discountPrice < option.price;
        const discountPercentage = hasDiscount
          ? Math.round(((option.price - option.discountPrice) / option.price) * 100)
          : 0;

        return {
          displayPrice: option.discountPrice || option.price,
          originalPrice: option.price,
          discountPrice: option.discountPrice,
          hasDiscount,
          discountPercentage,
          priceRange: null,
        };
      }
    }

    // Multiple variants/options
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let firstAvailablePrice = null;
    let firstAvailableOriginalPrice = null;
    let firstAvailableDiscountPrice = null;
    let hasAnyDiscount = false;

    for (const variant of product.variants) {
      if (variant.stock > 0) {
        const price = variant.discountPrice || variant.price;
        minPrice = Math.min(minPrice, price);
        maxPrice = Math.max(maxPrice, price);
        if (!firstAvailablePrice) {
          firstAvailablePrice = price;
          firstAvailableOriginalPrice = variant.price;
          firstAvailableDiscountPrice = variant.discountPrice;
          hasAnyDiscount = !!variant.discountPrice;
        }
      }
      if (variant.storageOptions?.length > 0) {
        for (const option of variant.storageOptions) {
          if (option.stock > 0) {
            const price = option.discountPrice || option.price;
            minPrice = Math.min(minPrice, price);
            maxPrice = Math.max(maxPrice, price);
            if (!firstAvailablePrice) {
              firstAvailablePrice = price;
              firstAvailableOriginalPrice = option.price;
              firstAvailableDiscountPrice = option.discountPrice;
              hasAnyDiscount = !!option.discountPrice;
            }
          }
        }
      }
      if (variant.sizeOptions?.length > 0) {
        for (const option of variant.sizeOptions) {
          if (option.stock > 0) {
            const price = option.discountPrice || option.price;
            minPrice = Math.min(minPrice, price);
            maxPrice = Math.max(maxPrice, price);
            if (!firstAvailablePrice) {
              firstAvailablePrice = price;
              firstAvailableOriginalPrice = option.price;
              firstAvailableDiscountPrice = option.discountPrice;
              hasAnyDiscount = !!option.discountPrice;
            }
          }
        }
      }
    }

    const discountPercentage = hasAnyDiscount && firstAvailableOriginalPrice
      ? Math.round(((firstAvailableOriginalPrice - firstAvailablePrice) / firstAvailableOriginalPrice) * 100)
      : 0;

    return {
      displayPrice: firstAvailablePrice || maxPrice,
      originalPrice: firstAvailableOriginalPrice || maxPrice,
      discountPrice: firstAvailableDiscountPrice,
      hasDiscount: hasAnyDiscount,
      discountPercentage,
      priceRange: minPrice !== maxPrice ? { min: minPrice, max: maxPrice } : null,
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

  if (loadingProduct) {
    return (
      <div className="w-full bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <div className="animate-pulse">
          <div className="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 w-full aspect-square"></div>
          <div className="p-3 space-y-3">
            <div className="h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-1/2"></div>
            <div className="h-7 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product || !product._id) {
    return (
      <div className="w-full bg-white rounded-lg shadow border border-gray-100 overflow-hidden text-center p-4">
        <p className="text-red-500 text-sm font-medium">
          Product not available
        </p>
      </div>
    );
  }

  const stockInfo = getStockInfo();
  const priceInfo = getPriceInfo();
  const displayImage = getDisplayImage();
  const isOutOfStock = !stockInfo.hasStock;
  const ratingInfo = getRatingData();
  const isHotDeal = priceInfo.discountPercentage > 40;

  const handleCardClick = (e) => {
    if (e.target.tagName === "BUTTON" || e.target.closest("button") || e.target.tagName === "A") {
      return;
    }
    navigate(`/product/${product._id}`);
  };

  const handleAddToCartClick = async (e) => {
    e.stopPropagation();
    if (!user) {
      toast.info("Please login to add items to cart", {
        position: "top-center",
        autoClose: 3000,
      });
      navigate("/login", { state: { from: window.location.pathname } });
      return;
    }

    setAddToCartStatus({ loading: true, success: false, error: null });

    try {
      const variantOptions = stockInfo.defaultVariantOptions || {};
      const result = await addItemToCart(product._id, variantOptions, 1);

      if (result.success) {
        toast.success(result.message || `${product.title} added to cart!`);
        setAddToCartStatus({ loading: false, success: true, error: null });
        setTimeout(() => {
          setAddToCartStatus((prev) => ({ ...prev, success: false }));
        }, 2000);
      } else {
        throw new Error(result.message || "Failed to add to cart");
      }
    } catch (err) {
      console.error("Add to cart error:", err);
      toast.error(err.message || "Failed to add to cart");
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
        toast.success(`${product.title} removed from wishlist!`);
      } else {
        await addItemToWishlist(product._id);
        toast.success(`${product.title} added to wishlist!`);
      }
    } catch (err) {
      toast.error(err.message || "Failed to update wishlist");
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
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-base font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
            {formatPrice(priceInfo.displayPrice)}
          </p>
          {priceInfo.hasDiscount && (
            <>
              <p className="text-xs text-gray-500 line-through">
                {formatPrice(priceInfo.originalPrice)}
              </p>
              <div className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-1.5 py-0.5 rounded-full">
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
        {stockInfo.hasVariants && stockInfo.defaultVariantOptions && (
          <p className="text-xs text-gray-600">
            {[
              stockInfo.defaultVariantOptions.variantColor && `Color: ${stockInfo.defaultVariantOptions.variantColor}`,
              stockInfo.defaultVariantOptions.storageCapacity && `Storage: ${stockInfo.defaultVariantOptions.storageCapacity}`,
              stockInfo.defaultVariantOptions.size && `Size: ${stockInfo.defaultVariantOptions.size}`,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
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
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          <div className="flex flex-wrap gap-1">
            {product.isFeatured && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold shadow">
                <FaCrown className="text-xs" />
                Featured
              </span>
            )}
            {priceInfo.hasDiscount && isHotDeal && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold shadow animate-pulse">
                <FaFire className="text-xs" />
                HOT DEAL
              </span>
            )}
          </div>
          <span
            className={`px-1.5 py-0.5 rounded-full text-xs font-bold shadow ${
              isOutOfStock
                ? "bg-red-100 text-red-700"
                : stockInfo.isLowStock
                  ? "bg-orange-100 text-orange-700"
                  : "bg-green-100 text-green-700"
            }`}
          >
            {isOutOfStock
              ? "Out of Stock"
              : stockInfo.isLowStock
                ? `Only ${stockInfo.displayStock} left!`
                : stockInfo.hasVariants
                  ? `${stockInfo.availableOptions} Options`
                  : `${stockInfo.displayStock} Available`}
          </span>
        </div>
        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={handleWishlistClick}
            className="p-1.5 rounded-full bg-white/90 hover:bg-white transition-colors shadow backdrop-blur-sm"
            aria-label={
              isInWishlist
                ? `Remove ${product.title} from wishlist`
                : `Add ${product.title} to wishlist`
            }
            disabled={loading}
          >
            {isInWishlist ? (
              <FaHeart className="text-red-600 text-sm" />
            ) : (
              <FaRegHeart className="text-gray-600 text-sm hover:text-red-600 transition-colors" />
            )}
          </button>
          <button
            onClick={handleQuickView}
            className="p-1.5 rounded-full bg-white/90 hover:bg-white transition-colors shadow backdrop-blur-sm"
            aria-label={`Quick view ${product.title}`}
          >
            <FaEye className="text-gray-600 text-sm hover:text-blue-600 transition-colors" />
          </button>
        </div>
        {getAllImages().length > 1 && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            {getAllImages()
              .slice(0, 3)
              .map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    index === currentImageIndex ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-2 flex-grow">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-gray-800 hover:text-red-600 line-clamp-2 leading-tight transition-colors">
            {product.title}
          </h2>
          {product.categoryId?.name && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MdVerified className="text-green-500 text-xs" />
              <span className="text-gray-600">{product.categoryId.name}</span>
            </div>
          )}
          {ratingInfo.hasReviews && (
            <div className="flex items-center gap-1 text-xs">
              <div className="flex items-center gap-0.5">
                {renderStars(ratingInfo.rating)}
              </div>
              <span className="text-gray-600">
                {ratingInfo.rating.toFixed(1)} ({ratingInfo.reviewCount})
              </span>
            </div>
          )}
          {!ratingInfo.hasReviews && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <div className="flex items-center gap-0.5">{renderStars(0)}</div>
              <span>No reviews</span>
            </div>
          )}
        </div>
        {renderPricing()}
        {stockInfo.isLowStock && (
          <div className="bg-red-50 border border-red-200 rounded p-1.5 flex items-center gap-1">
            <IoTimeOutline className="text-red-500 text-xs" />
            <span className="text-xs text-red-700">Limited stock!</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-0.5">
            <MdVerified className="text-green-500 text-xs" />
            <span>Verified</span>
          </div>
          <div className="flex items-center gap-0.5">
            <FaShippingFast className="text-blue-500 text-xs" />
            <span>Fast Ship</span>
          </div>
        </div>
        <Button
          onClick={handleAddToCartClick}
          className={`mt-2 w-full font-bold transition-all duration-300 ${
            addToCartStatus.loading
              ? "bg-gray-500 cursor-wait"
              : addToCartStatus.success
                ? "bg-green-600 hover:bg-green-700"
                : addToCartStatus.error
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : isOutOfStock
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
          } text-white px-3 py-2 rounded-lg flex items-center justify-center gap-1 text-sm shadow`}
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