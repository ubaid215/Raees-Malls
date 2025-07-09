/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  lazy,
  memo,
  Suspense,
  useEffect,
  useState,
  useCallback,
} from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate } from "react-router-dom";
import { FiEdit2, FiTrash2, FiEye, FiRefreshCw } from "react-icons/fi";
import { toast } from "react-toastify";
import { debounce } from "lodash";
import Button from "../../components/core/Button";
import Input from "../../components/core/Input";
import LoadingSpinner from "../../components/core/LoadingSpinner";
import LoadingSkeleton from "../../components/shared/LoadingSkelaton";
import {
  getProducts,
  deleteProduct,
} from "../../services/productService";
import { getCategories } from "../../services/categoryService";
import socketService from "../../services/socketService";
import { useAdminAuth } from "../../context/AdminAuthContext";

const ProductModal = lazy(() => import("../../pages/ProductModal"));

// Helper function to check if product is in stock
export const isInStock = (product) => {
  // Check base stock
  if (product.stock > 0) return true;
  
  // Check variant stock
  if (product.variants?.length > 0) {
    for (const variant of product.variants) {
      // Check storage options
      if (variant.storageOptions?.length > 0) {
        const hasStock = variant.storageOptions.some(opt => opt.stock > 0);
        if (hasStock) return true;
      }
      
      // Check size options
      if (variant.sizeOptions?.length > 0) {
        const hasStock = variant.sizeOptions.some(opt => opt.stock > 0);
        if (hasStock) return true;
      }
      
      // Check direct variant stock
      if (variant.stock > 0) return true;
    }
  }
  
  return false;
};

// Helper function to get display price
const getDisplayPrice = (product) => {
  // Try base price first
  if (product.price) return product.price;
  
  // Try discount price
  if (product.discountPrice) return product.discountPrice;
  
  // Try variant prices
  if (product.variants?.length > 0) {
    // Check storage options
    if (product.variants[0].storageOptions?.length > 0) {
      return product.variants[0].storageOptions[0].price || 
             product.variants[0].storageOptions[0].displayPrice || 0;
    }
    
    // Check size options
    if (product.variants[0].sizeOptions?.length > 0) {
      return product.variants[0].sizeOptions[0].price || 
             product.variants[0].sizeOptions[0].displayPrice || 0;
    }
    
    // Check direct variant price
    return product.variants[0].price || 0;
  }
  
  return 0;
};

// Helper function to calculate total stock
const calculateTotalStock = (product) => {
  let total = product.stock || 0;
  
  if (product.variants?.length > 0) {
    product.variants.forEach(variant => {
      total += variant.stock || 0;
      
      if (variant.storageOptions?.length > 0) {
        variant.storageOptions.forEach(opt => {
          total += opt.stock || 0;
        });
      }
      
      if (variant.sizeOptions?.length > 0) {
        variant.sizeOptions.forEach(opt => {
          total += opt.stock || 0;
        });
      }
    });
  }
  
  return total;
};

// Helper function to get the first available variant image
const getFirstVariantImage = (product) => {
  if (!product.variants) return null;
  
  for (const variant of product.variants) {
    // Check variant images
    if (variant.images?.length > 0) {
      return variant.images[0];
    }
    
    // Check storage option images
    if (variant.storageOptions?.length > 0) {
      for (const option of variant.storageOptions) {
        if (option.images?.length > 0) {
          return option.images[0];
        }
      }
    }
    
    // Check size option images
    if (variant.sizeOptions?.length > 0) {
      for (const option of variant.sizeOptions) {
        if (option.images?.length > 0) {
          return option.images[0];
        }
      }
    }
  }
  
  return null;
};

// Helper function to get variant type
const getVariantType = (product) => {
  if (!product.variants || product.variants.length === 0) return "Simple";
  
  const variant = product.variants[0];
  if (variant.storageOptions?.length > 0) return "Storage";
  if (variant.sizeOptions?.length > 0) return "Size";
  if (variant.color) return "Color";
  
  return "Variant";
};

const ProductInventory = memo(() => {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryMap, setCategoryMap] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  const PRODUCTS_PER_PAGE = 20;

  useEffect(() => {
    if (!admin) {
      navigate("/admin/login");
    }
  }, [admin, navigate]);

  const loadCategories = useCallback(async () => {
    try {
      const categories = await getCategories();
      if (Array.isArray(categories)) {
        const map = categories.reduce((acc, cat) => {
          acc[cat._id] = cat.name;
          return acc;
        }, {});
        setCategoryMap(map);
      } else {
        toast.warn("Failed to load category names");
      }
    } catch (err) {
      toast.error(err.message || "Failed to fetch categories");
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getProducts(currentPage, PRODUCTS_PER_PAGE, null, {
        search: searchTerm,
      });

      const validProducts = Array.isArray(response.products)
        ? response.products.filter((product) => product._id)
        : [];

      setProducts(validProducts);
      setTotalPages(response.totalPages || 1);
    } catch (err) {
      const errorMessage = err.message.includes("Network Error")
        ? "Unable to connect to the server. Please check your network or try again later."
        : `Failed to load products: ${err.message}`;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    socketService.on("productAdded", (newProduct) => {
      if (!newProduct._id) return;
      if (
        !searchTerm ||
        newProduct.title.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        setProducts((prev) => {
          if (prev.some((p) => p._id === newProduct._id)) return prev;
          return [newProduct, ...prev].slice(0, PRODUCTS_PER_PAGE);
        });
      }
    });
    return () => socketService.off("productAdded");
  }, [searchTerm]);

  const handleDelete = useCallback(async (productId) => {
    if (!productId) {
      toast.error("Invalid product ID");
      return;
    }
    if (window.confirm("Are you sure you want to delete this product?")) {
      setDeletingId(productId);
      try {
        await deleteProduct(productId);
        setProducts((prev) => prev.filter((p) => p._id !== productId));
        toast.success("Product deleted successfully");
      } catch (err) {
        const errorMessage = err.message.includes("Network Error")
          ? "Unable to connect to the server. Please check your network or try again later."
          : `Failed to delete product: ${err.message}`;
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setDeletingId(null);
      }
    }
  }, []);

  const handlePreview = useCallback((product) => {
    if (!product._id) {
      toast.error("Invalid product ID");
      return;
    }
    
    const displayPrice = getDisplayPrice(product);
    const originalPrice = product.price || displayPrice;
    const discountPercentage =
      originalPrice && displayPrice < originalPrice
        ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
        : 0;

    const previewProduct = {
      _id: product._id,
      title: product.title,
      price: displayPrice,
      originalPrice,
      discountPercentage,
      images: product.images?.map((img) =>
        img.url.startsWith("http") ? img.url : `http://localhost:5000${img.url}`
      ) || ["/placeholder-product.png"],
      rating: product.averageRating || 0,
      numReviews: product.numReviews || 0,
      stock: calculateTotalStock(product),
      inStock: isInStock(product),
      description: product.description || "",
      category: product.categoryId,
      variants: product.variants || [],
    };
    
    setSelectedProduct(previewProduct);
    setShowPreview(true);
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
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Input
            placeholder="Search products..."
            onChange={handleSearchChange}
            className="flex-1 min-w-[200px]"
          />
          <Button
            onClick={loadProducts}
            variant="outline"
            className="border-[#E63946] text-[#E63946] hover:bg-[#FFE6E8]"
            title="Refresh Products"
          >
            <FiRefreshCw className="h-5 w-5" />
          </Button>
          <Link to="/admin/add-products">
            <Button className="whitespace-nowrap bg-[#E63946] hover:bg-[#FFFFFF] hover:text-[#E63946] hover:border-[#E63946] border">
              Add New Product
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <LoadingSkeleton key={i} type="card" height="350px" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No products found. Try adding a new product or refreshing.
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Link to="/admin/add-products">
              <Button className="bg-[#E63946] hover:bg-[#FFFFFF] hover:text-[#E63946] hover:border-[#E63946] border">
                Create Your First Product
              </Button>
            </Link>
            <Button
              onClick={loadProducts}
              variant="outline"
              className="border-[#E63946] text-[#E63946] hover:bg-[#FFE6E8]"
            >
              Refresh
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variant Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => {
                  const stockStatus = isInStock(product);
                  const totalStock = calculateTotalStock(product);
                  const variantType = getVariantType(product);
                  
                  return (
                    <tr key={product._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {product.images?.[0] ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={
                                  product.images[0].url.startsWith("http")
                                    ? product.images[0].url
                                    : `http://localhost:5000${product.images[0].url}`
                                }
                                alt={product.title || "Product image"}
                                onError={(e) =>
                                  (e.target.src = "/placeholder-product.png")
                                }
                              />
                            ) : getFirstVariantImage(product) ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={
                                  getFirstVariantImage(product).url.startsWith(
                                    "http"
                                  )
                                    ? getFirstVariantImage(product).url
                                    : `http://localhost:5000${getFirstVariantImage(product).url}`
                                }
                                alt={product.title || "Variant image"}
                                onError={(e) =>
                                  (e.target.src = "/placeholder-product.png")
                                }
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {product.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {getCategoryName(product.categoryId)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        PKR {getDisplayPrice(product).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {totalStock > 0 ? totalStock : "Out of stock"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {variantType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            stockStatus
                              ? "bg-[#E6FFE6] text-[#008000]"
                              : "bg-[#FFE6E8] text-[#E63946]"
                          }`}
                        >
                          {stockStatus ? "In Stock" : "Out of Stock"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-5 space-x-2">
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
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
                Page {currentPage} of {totalPages}
              </span>
              <Button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
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