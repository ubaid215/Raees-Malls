/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  lazy,
  memo,
  Suspense,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate } from "react-router-dom";
import {
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiPlus,
  FiMinus,
  FiSearch,
  FiChevronDown,
} from "react-icons/fi";
import { FaPalette, FaMemory, FaRulerVertical } from "react-icons/fa";
import { toast } from "react-toastify";
import { debounce } from "lodash";
import Button from "../../components/core/Button";
import Input from "../../components/core/Input";
import LoadingSpinner from "../../components/core/LoadingSpinner";
import LoadingSkeleton from "../../components/shared/LoadingSkelaton";
import { deleteProduct } from "../../services/productService";
import { getCategories } from "../../services/categoryService";
import { useProduct } from "../../context/ProductContext";
import { useAdminAuth } from "../../context/AdminAuthContext";

const ProductModal = lazy(() => import("../../pages/ProductModal"));

// Enhanced helper functions
export const isInStock = (product) => {
  if (product.stock !== undefined && product.stock > 0) return true;

  if (product.variants?.length > 0) {
    return product.variants.some((variant) => {
      if (variant.stock > 0) return true;
      if (variant.storageOptions?.some((opt) => opt.stock > 0)) return true;
      if (variant.sizeOptions?.some((opt) => opt.stock > 0)) return true;
      return false;
    });
  }

  if (product.colors?.length > 0) {
    return product.colors.some((color) =>
      color.storage?.some((storage) => storage.stock > 0)
    );
  }

  return false;
};

const getPriceRange = (product) => {
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  if (
    product.price !== undefined &&
    product.price !== null &&
    product.price > 0
  ) {
    minPrice = Math.min(minPrice, product.discountPrice || product.price);
    maxPrice = Math.max(maxPrice, product.discountPrice || product.price);
  }

  if (product.variants?.length > 0) {
    product.variants.forEach((variant) => {
      if (
        variant.price !== undefined &&
        variant.price !== null &&
        variant.price > 0
      ) {
        const variantPrice = variant.discountPrice || variant.price;
        minPrice = Math.min(minPrice, variantPrice);
        maxPrice = Math.max(maxPrice, variantPrice);
      }

      variant.storageOptions?.forEach((option) => {
        if (
          option.price !== undefined &&
          option.price !== null &&
          option.price > 0
        ) {
          const optionPrice = option.discountPrice || option.price;
          minPrice = Math.min(minPrice, optionPrice);
          maxPrice = Math.max(maxPrice, optionPrice);
        }
      });

      variant.sizeOptions?.forEach((option) => {
        if (
          option.price !== undefined &&
          option.price !== null &&
          option.price > 0
        ) {
          const optionPrice = option.discountPrice || option.price;
          minPrice = Math.min(minPrice, optionPrice);
          maxPrice = Math.max(maxPrice, optionPrice);
        }
      });
    });
  }

  if (product.colors?.length > 0) {
    product.colors.forEach((color) => {
      color.storage?.forEach((storage) => {
        if (
          storage.price !== undefined &&
          storage.price !== null &&
          storage.price > 0
        ) {
          const storagePrice = storage.discountPrice || storage.price;
          minPrice = Math.min(minPrice, storagePrice);
          maxPrice = Math.max(maxPrice, storagePrice);
        }
      });
    });
  }

  if (minPrice === Infinity) minPrice = 0;
  if (maxPrice === -Infinity) maxPrice = 0;

  return { min: minPrice, max: maxPrice };
};

const calculateTotalStock = (product) => {
  let total = product.stock || 0;

  if (product.variants?.length > 0) {
    product.variants.forEach((variant) => {
      total += variant.stock || 0;
      if (variant.storageOptions?.length > 0) {
        variant.storageOptions.forEach((opt) => {
          total += opt.stock || 0;
        });
      }
      if (variant.sizeOptions?.length > 0) {
        variant.sizeOptions.forEach((opt) => {
          total += opt.stock || 0;
        });
      }
    });
  }

  if (product.colors?.length > 0) {
    product.colors.forEach((color) => {
      color.storage?.forEach((storage) => {
        total += storage.stock || 0;
      });
    });
  }

  return total;
};

const getFirstVariantImage = (product) => {
  if (product.images?.length > 0) {
    return product.images[0];
  }

  if (product.variants?.length > 0) {
    for (const variant of product.variants) {
      if (variant.images?.length > 0) {
        return variant.images[0];
      }
    }
  }

  return null;
};

const getVariantDetails = (product) => {
  if (!product.variants || product.variants.length === 0) {
    if (product.colors?.length > 0) {
      const totalStorage = product.colors.reduce(
        (total, color) => total + (color.storage?.length || 0),
        0
      );
      return { type: "Storage", count: totalStorage };
    }
    return { type: "Simple", count: 0 };
  }

  const variant = product.variants[0];
  const isColorVariant =
    variant.color &&
    (variant.price !== undefined || variant.stock !== undefined) &&
    !variant.storageOptions?.length &&
    !variant.sizeOptions?.length;

  const hasStorageOptions = product.variants.some(
    (v) => v.storageOptions?.length > 0
  );

  const hasSizeOptions = product.variants.some(
    (v) => v.sizeOptions?.length > 0
  );

  if (isColorVariant) {
    return { type: "Color", count: product.variants.length };
  } else if (hasStorageOptions) {
    return {
      type: "Storage",
      count: product.variants.reduce(
        (total, v) => total + (v.storageOptions?.length || 0),
        0
      ),
    };
  } else if (hasSizeOptions) {
    return {
      type: "Size",
      count: product.variants.reduce(
        (total, v) => total + (v.sizeOptions?.length || 0),
        0
      ),
    };
  } else {
    return { type: "Mixed", count: product.variants.length };
  }
};

const getVariantIcon = (type) => {
  switch (type) {
    case "Color":
      return <FaPalette className="text-purple-500" />;
    case "Storage":
      return <FaMemory className="text-blue-500" />;
    case "Size":
      return <FaRulerVertical className="text-green-500" />;
    default:
      return <FiPlus className="text-gray-500" />;
  }
};

const shouldDisplayProduct = (product) => {
  if (product.stock > 0 || product.price > 0) return true;

  if (product.variants?.length > 0) {
    return product.variants.some((variant) => {
      if (variant.stock > 0 || variant.price > 0) return true;
      if (variant.storageOptions?.some((opt) => opt.stock > 0 || opt.price > 0))
        return true;
      if (variant.sizeOptions?.some((opt) => opt.stock > 0 || opt.price > 0))
        return true;
      return false;
    });
  }

  if (product.colors?.length > 0) {
    return product.colors.some((color) =>
      color.storage?.some((storage) => storage.stock > 0 || storage.price > 0)
    );
  }

  return false;
};

const ProductInventory = memo(() => {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const { products, loading, error, pagination, fetchProducts } = useProduct();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryMap, setCategoryMap] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState({});
  const lastFetchRef = useRef(0);
  const fetchQueueRef = useRef([]);
  const isFetchingRef = useRef(false);
  const categoryCacheRef = useRef(null);
  const MIN_FETCH_INTERVAL = 1000; // 1 second minimum between fetches

  const PRODUCTS_PER_PAGE = 50;

  useEffect(() => {
    if (!admin) {
      navigate("/admin/login");
    }
  }, [admin, navigate]);

  const loadCategories = useCallback(async () => {
    if (categoryCacheRef.current) {
      setCategoryMap(categoryCacheRef.current);
      return;
    }

    try {
      const categories = await getCategories();
      if (Array.isArray(categories)) {
        const map = categories.reduce((acc, cat) => {
          acc[cat._id] = cat.name;
          return acc;
        }, {});
        categoryCacheRef.current = map;
        setCategoryMap(map);
      } else {
        toast.warn("Failed to load category names");
      }
    } catch (err) {
      toast.error(err.message || "Failed to fetch categories");
    }
  }, []);

  const debouncedFetchProducts = useCallback(
    debounce(async (params, options) => {
      const now = Date.now();
      if (now - lastFetchRef.current < MIN_FETCH_INTERVAL || isFetchingRef.current) {
        return new Promise((resolve, reject) => {
          fetchQueueRef.current.push({ resolve, reject, params, options });
        });
      }

      isFetchingRef.current = true;
      lastFetchRef.current = now;

      try {
        await fetchProducts(params, options);
        fetchQueueRef.current.forEach(({ resolve }) => resolve());
        fetchQueueRef.current = [];
      } catch (err) {
        fetchQueueRef.current.forEach(({ reject }) => reject(err));
        fetchQueueRef.current = [];
        throw err;
      } finally {
        isFetchingRef.current = false;
      }
    }, 300),
    [fetchProducts]
  );

  const loadProducts = useCallback(async () => {
    try {
      await debouncedFetchProducts(
        {
          page: currentPage,
          limit: PRODUCTS_PER_PAGE,
          search: searchTerm,
          includeOutOfStock: true,
          includeVariants: true,
        },
        {
          isPublic: false,
          skipCache: true,
          populate:
            "variants,variants.color,variants.storageOptions,variants.sizeOptions",
        }
      );
    } catch (err) {
      toast.error(err.message || "Failed to load products");
    }
  }, [currentPage, searchTerm, debouncedFetchProducts]);

  const handleDelete = useCallback(
    async (productId) => {
      if (!productId) {
        toast.error("Invalid product ID");
        return;
      }
      if (window.confirm("Are you sure you want to delete this product?")) {
        setDeletingId(productId);
        try {
          await deleteProduct(productId);
          toast.success("Product deleted successfully");
          loadProducts();
        } catch (err) {
          const errorMessage = err.message.includes("Network Error")
            ? "Unable to connect to the server. Please check your network or try again later."
            : `Failed to delete product: ${err.message}`;
          toast.error(errorMessage);
        } finally {
          setDeletingId(null);
        }
      }
    },
    [loadProducts]
  );

  const displayableProducts = products?.filter(shouldDisplayProduct) || [];

  const handlePreview = useCallback((product) => {
    if (!product._id) {
      toast.error("Invalid product ID");
      return;
    }

    const priceRange = getPriceRange(product);
    const previewProduct = {
      _id: product._id,
      title: product.title,
      price: priceRange.min,
      originalPrice: product.price,
      discountPercentage: product.discountPercentage || 0,
      images: product.images?.map((img) =>
        img.url.startsWith("http")
          ? img.url
          : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${img.url}`
      ) || ["/placeholder-product.png"],
      rating: product.averageRating || 0,
      numReviews: product.numReviews || 0,
      stock: calculateTotalStock(product),
      inStock: isInStock(product),
      description: product.description || "",
      category: product.categoryId,
      variants: product.variants || [],
      hasVariants: product.variants?.length > 0,
      priceRange: priceRange.min !== priceRange.max ? priceRange : null,
    };

    setSelectedProduct(previewProduct);
    setShowPreview(true);
  }, []);

  const toggleExpandProduct = useCallback((productId) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  }, []);

  const getCategoryName = useCallback(
    (categoryId) => {
      if (!categoryId) return "No category";
      return categoryMap[categoryId._id || categoryId] || "Unknown";
    },
    [categoryMap]
  );

  const debouncedSetSearchTerm = useCallback(
    debounce((value) => {
      setSearchTerm(value);
      setCurrentPage(1);
    }, 300),
    []
  );

  const handleSearchChange = useCallback(
    (e) => {
      debouncedSetSearchTerm(e.target.value);
    },
    [debouncedSetSearchTerm]
  );

  useEffect(() => {
    if (admin) {
      loadCategories();
      loadProducts();
    }

    return () => {
      debouncedFetchProducts.cancel();
      debouncedSetSearchTerm.cancel();
      fetchQueueRef.current = [];
    };
  }, [admin, loadCategories, loadProducts]);

  if (!admin) {
    return null;
  }

  if (error) {
    return (
      <div className="p-4 bg-[#FFE6E8] text-[#E63946] rounded-lg mx-auto max-w-7xl">
        <p>{error}</p>
        <Button onClick={loadProducts} variant="outline" className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <section className="container mx-auto px-4 py-6">
      <Helmet>
        <title>Product Inventory | Admin Dashboard</title>
        <meta
          name="description"
          content="Manage your product inventory, add, edit, or delete products."
        />
      </Helmet>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-[#E63946]">Product Inventory</h1>
        <div className="flex flex-col w-full sm:flex-row gap-3 md:w-auto">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
            <input
              type="text"
              placeholder="Search products..."
              onChange={handleSearchChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E63946] focus:border-transparent"
            />
            <FiSearch className="absolute right-3 top-3 text-gray-400" />
          </div>
          <div className="flex flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={loadProducts}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-[#E63946] text-[#E63946] rounded-md hover:bg-[#FFE6E8] transition-colors duration-200 flex-1 sm:flex-none"
              title="Refresh Products"
            >
              <FiRefreshCw className="h-5 w-5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              to="/admin/add-products"
              className="flex items-center justify-center whitespace-nowrap px-4 py-2 bg-[#E63946] text-white rounded-md hover:bg-white hover:text-[#E63946] hover:border hover:border-[#E63946] transition-colors duration-200 flex-1 sm:flex-none text-center"
            >
              Add New Product
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-200 rounded-md h-[350px] animate-pulse"
            ></div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No products found. Try adding a new product or refreshing.
          </p>
          <div className="flex flex-row justify-center gap-4 mt-4">
            <Link
              to="/admin/add-products"
              className="px-4 py-2 bg-[#E63946] text-white rounded-md hover:bg-white hover:text-[#E63946] hover:border hover:border-[#E63946] transition-colors duration-200"
            >
              Create Your First Product
            </Link>
            <button
              onClick={loadProducts}
              className="px-4 py-2 border border-[#E63946] text-[#E63946] rounded-md hover:bg-[#FFE6E8] transition-colors duration-200"
            >
              Refresh
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-2 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-2 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-2 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Variants
                  </th>
                  <th className="px-2 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayableProducts.map((product) => {
                  const stockStatus = isInStock(product);
                  const totalStock = calculateTotalStock(product);
                  const { type: variantType, count: variantCount } =
                    getVariantDetails(product);
                  const priceRange = getPriceRange(product);
                  const isExpanded = expandedProducts[product._id];

                  return (
                    <React.Fragment key={product._id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 lg:h-10 lg:w-10">
                              {product.images?.[0] ? (
                                <img
                                  className="h-8 w-8 lg:h-10 lg:w-10 rounded object-cover"
                                  src={
                                    product.images[0].url.startsWith("http")
                                      ? product.images[0].url
                                      : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${product.images[0].url}`
                                  }
                                  alt={product.title || "Product image"}
                                  onError={(e) =>
                                    (e.target.src = "/placeholder-product.png")
                                  }
                                />
                              ) : getFirstVariantImage(product) ? (
                                <img
                                  className="h-8 w-8 lg:h-10 lg:w-10 rounded object-cover"
                                  src={
                                    getFirstVariantImage(
                                      product
                                    ).url.startsWith("http")
                                      ? getFirstVariantImage(product).url
                                      : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${getFirstVariantImage(product).url}`
                                  }
                                  alt={product.title || "Variant image"}
                                  onError={(e) =>
                                    (e.target.src = "/placeholder-product.png")
                                  }
                                />
                              ) : (
                                <div className="h-8 w-8 lg:h-10 lg:w-10 rounded bg-gray-200"></div>
                              )}
                            </div>
                            <div className="ml-2 lg:ml-4 min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate lg:whitespace-normal">
                                {product.title}
                              </div>
                              <div className="text-xs lg:text-sm text-gray-500 truncate lg:whitespace-normal">
                                {getCategoryName(product.categoryId)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-500">
                          {priceRange.min === priceRange.max ? (
                            <div className="flex flex-col lg:flex-row lg:items-center">
                              <span className="text-xs lg:text-sm">PKR</span>
                              <span className="font-medium">
                                {priceRange.min.toFixed(0)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col lg:flex-row lg:items-center lg:gap-1">
                              <span className="text-xs">
                                PKR {priceRange.min.toFixed(0)}
                              </span>
                              <FiMinus className="text-gray-400 hidden lg:block" />
                              <span className="text-xs">
                                PKR {priceRange.max.toFixed(0)}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-2 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-500">
                          {totalStock > 0 ? (
                            <span
                              className={`px-1 lg:px-2 py-1 rounded-full text-xs ${
                                totalStock <= 10
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {totalStock}
                            </span>
                          ) : (
                            <span className="text-xs text-red-500">Out</span>
                          )}
                        </td>
                        <td className="px-2 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-500 hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            {getVariantIcon(variantType)}
                            <span>
                              {variantType}{" "}
                              {variantCount > 0 && `(${variantCount})`}
                            </span>
                            {variantCount > 0 && (
                              <button
                                onClick={() => toggleExpandProduct(product._id)}
                                className="text-blue-500 hover:text-blue-700 text-xs"
                              >
                                {isExpanded ? "Hide" : "Show"}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-2 lg:px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-1 lg:px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              stockStatus
                                ? "bg-[#E6FFE6] text-[#008000]"
                                : "bg-[#FFE6E8] text-[#E63946]"
                            }`}
                          >
                            <span className="lg:hidden">
                              {stockStatus ? "✓" : "✗"}
                            </span>
                            <span className="hidden lg:inline">
                              {stockStatus ? "In Stock" : "Out of Stock"}
                            </span>
                          </span>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2 lg:gap-5">
                            {variantCount > 0 && (
                              <button
                                onClick={() => toggleExpandProduct(product._id)}
                                className="text-gray-600 hover:text-gray-800 lg:hidden"
                                title="Toggle variants"
                              >
                                <FiChevronDown
                                  className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                />
                              </button>
                            )}
                            <Link to={`/admin/edit-product/${product._id}`}>
                              <button
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Edit"
                                aria-label={`Edit ${product.title}`}
                              >
                                <FiEdit2 className="h-4 w-4 lg:h-5 lg:w-5" />
                              </button>
                            </Link>
                            <button
                              onClick={() => handleDelete(product._id)}
                              disabled={deletingId === product._id}
                              className={`text-[#E63946] hover:text-[#B32D38] ${
                                deletingId === product._id
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              title="Delete"
                              aria-label={`Delete ${product.title}`}
                            >
                              <FiTrash2 className="h-4 w-4 lg:h-5 lg:w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && product.variants?.length > 0 && (
                        <tr className="bg-gray-50">
                          <td colSpan="6" className="px-3 lg:px-6 py-4">
                            <div className="ml-6 lg:ml-14">
                              <h4 className="font-medium text-gray-700 mb-2 text-sm lg:text-base">
                                Variant Details:
                              </h4>
                              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
                                {product.variants.map((variant, idx) => {
                                  const variantPrice =
                                    variant.discountPrice || variant.price;
                                  const variantStock =
                                    variant.stock ||
                                    variant.storageOptions?.reduce(
                                      (sum, opt) => sum + (opt.stock || 0),
                                      0
                                    ) ||
                                    variant.sizeOptions?.reduce(
                                      (sum, opt) => sum + (opt.stock || 0),
                                      0
                                    ) ||
                                    0;

                                  return (
                                    <div
                                      key={`${product._id}-${idx}`}
                                      className="border rounded p-2 lg:p-3 bg-white"
                                    >
                                      <div className="flex items-start gap-2 lg:gap-3">
                                        {variant.images?.[0] && (
                                          <img
                                            src={
                                              variant.images[0].url.startsWith(
                                                "http"
                                              )
                                                ? variant.images[0].url
                                                : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${variant.images[0].url}`
                                            }
                                            alt={
                                              variant.color?.name ||
                                              `Variant ${idx + 1}`
                                            }
                                            className="w-12 h-12 lg:w-16 lg:h-16 object-cover rounded"
                                          />
                                        )}
                                        <div className="min-w-0 flex-1">
                                          {variant.color && (
                                            <p className="text-xs lg:text-sm font-medium">
                                              Color:{" "}
                                              <span className="text-gray-600">
                                                {variant.color.name}
                                              </span>
                                            </p>
                                          )}
                                          <p className="text-xs lg:text-sm font-medium mt-1">
                                            Price: PKR {variantPrice.toFixed(0)}
                                          </p>
                                          <p className="text-xs lg:text-sm">
                                            Stock: {variantStock}
                                          </p>
                                          {variant.storageOptions?.length > 0 && (
                                            <div className="mt-1">
                                              <p className="text-xs font-medium text-gray-500">
                                                Storage Options:
                                              </p>
                                              <ul className="text-xs text-gray-600">
                                                {variant.storageOptions.map(
                                                  (opt, i) => (
                                                    <li
                                                      key={i}
                                                      className="flex justify-between"
                                                    >
                                                      <span>
                                                        {opt.capacity}:
                                                      </span>
                                                      <span>
                                                        PKR{" "}
                                                        {(
                                                          opt.discountPrice ||
                                                          opt.price
                                                        ).toFixed(0)}
                                                        ({opt.stock || 0})
                                                      </span>
                                                    </li>
                                                  )
                                                )}
                                              </ul>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden grid grid-cols-1 gap-4">
            {displayableProducts.map((product) => {
              const stockStatus = isInStock(product);
              const totalStock = calculateTotalStock(product);
              const { type: variantType, count: variantCount } =
                getVariantDetails(product);
              const priceRange = getPriceRange(product);
              const isExpanded = expandedProducts[product._id];

              return (
                <div
                  key={product._id}
                  className="bg-white rounded-lg shadow p-4 border border-gray-200"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 h-16 w-16">
                        {product.images?.[0] ? (
                          <img
                            className="h-16 w-16 rounded object-cover"
                            src={
                              product.images[0].url.startsWith("http")
                                ? product.images[0].url
                                : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${product.images[0].url}`
                            }
                            alt={product.title || "Product image"}
                            onError={(e) =>
                              (e.target.src = "/placeholder-product.png")
                            }
                          />
                        ) : getFirstVariantImage(product) ? (
                          <img
                            className="h-16 w-16 rounded object-cover"
                            src={
                              getFirstVariantImage(product).url.startsWith(
                                "http"
                              )
                                ? getFirstVariantImage(product).url
                                : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${getFirstVariantImage(product).url}`
                            }
                            alt={product.title || "Variant image"}
                            onError={(e) =>
                              (e.target.src = "/placeholder-product.png")
                            }
                          />
                        ) : (
                          <div className="h-16 w-16 rounded bg-gray-200"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {product.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {getCategoryName(product.categoryId)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        stockStatus
                          ? "bg-[#E6FFE6] text-[#008000]"
                          : "bg-[#FFE6E8] text-[#E63946]"
                      }`}
                    >
                      {stockStatus ? "In Stock" : "Out of Stock"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Price</p>
                      <p className="font-medium">
                        {priceRange.min === priceRange.max ? (
                          `PKR ${priceRange.min.toFixed(2)}`
                        ) : (
                          <span>
                            PKR {priceRange.min.toFixed(2)} -{" "}
                            {priceRange.max.toFixed(2)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Stock</p>
                      <p className="font-medium">
                        {totalStock > 0 ? (
                          <span
                            className={`px-2 py-1 rounded-full ${
                              totalStock <= 10
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {totalStock}
                          </span>
                        ) : (
                          "Out of stock"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Variants</p>
                      <div className="flex items-center gap-1">
                        {getVariantIcon(variantType)}
                        <span className="font-medium">
                          {variantType}{" "}
                          {variantCount > 0 && `(${variantCount})`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/admin/edit-product/${product._id}`}>
                        <button
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                          aria-label={`Edit ${product.title}`}
                        >
                          <FiEdit2 className="h-5 w-5" />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(product._id)}
                        disabled={deletingId === product._id}
                        className={`text-[#E63946] hover:text-[#B32D38] ${
                          deletingId === product._id
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        title="Delete"
                        aria-label={`Delete ${product.title}`}
                      >
                        <FiTrash2 className="h-5 w-5" />
                      </button>
                      {variantCount > 0 && (
                        <button
                          onClick={() => toggleExpandProduct(product._id)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          {isExpanded ? <FiMinus /> : <FiPlus />}
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && product.variants?.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <h4 className="font-medium text-gray-700 mb-2">
                        Variant Details:
                      </h4>
                      <div className="grid grid-cols-1 gap-3">
                        {product.variants.map((variant, idx) => (
                          <div
                            key={`${product._id}-${idx}`}
                            className="border rounded p-3 bg-gray-50"
                          >
                            <div className="flex items-start gap-3">
                              {variant.images?.[0] && (
                                <img
                                  src={
                                    variant.images[0].url.startsWith("http")
                                      ? variant.images[0].url
                                      : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${variant.images[0].url}`
                                  }
                                  alt={
                                    variant.color?.name || `Variant ${idx + 1}`
                                  }
                                  className="w-12 h-12 object-cover rounded"
                                  onError={(e) =>
                                    (e.target.src = "/placeholder-product.png")
                                  }
                                />
                              )}
                              <div className="flex-1">
                                {variant.color && (
                                  <p className="text-sm font-medium">
                                    Color:{" "}
                                    <span className="text-gray-600">
                                      {variant.color.name}
                                    </span>
                                  </p>
                                )}
                                {variant.storageOptions?.length > 0 && (
                                  <div className="mt-1">
                                    <p className="text-sm font-medium">
                                      Storage Options:
                                    </p>
                                    <ul className="text-xs text-gray-600">
                                      {variant.storageOptions.map((opt, i) => (
                                        <li
                                          key={i}
                                          className="flex justify-between"
                                        >
                                          <span>{opt.capacity}:</span>
                                          <span>
                                            PKR {opt.discountPrice || opt.price}{" "}
                                            ({opt.stock} in stock)
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {variant.sizeOptions?.length > 0 && (
                                  <div className="mt-1">
                                    <p className="text-sm font-medium">
                                      Size Options:
                                    </p>
                                    <ul className="text-xs text-gray-600">
                                      {variant.sizeOptions.map((opt, i) => (
                                        <li
                                          key={i}
                                          className="flex justify-between"
                                        >
                                          <span>{opt.size}:</span>
                                          <span>
                                            PKR {opt.discountPrice || opt.price}{" "}
                                            ({opt.stock} in stock)
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {!variant.storageOptions?.length &&
                                  !variant.sizeOptions?.length && (
                                    <p className="text-sm">
                                      Price: PKR{" "}
                                      {variant.discountPrice || variant.price} (
                                      {variant.stock} in stock)
                                    </p>
                                  )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <Button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                variant="outline"
                className="border-[#E63946] text-[#E63946] hover:bg-[#FFE6E8]"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {pagination.totalPages}
              </span>
              <Button
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(prev + 1, pagination.totalPages)
                  )
                }
                disabled={currentPage === pagination.totalPages}
                variant="outline"
                className="border-[#E63946] text-[#E63946] hover:bg-[#FFE6E8]"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <Suspense fallback={<LoadingSpinner fullScreen />}>
        {showPreview && selectedProduct && (
          <ProductModal
            product={selectedProduct}
            onClose={() => setShowPreview(false)}
          />
        )}
      </Suspense>
    </section>
  );
});

export default ProductInventory;