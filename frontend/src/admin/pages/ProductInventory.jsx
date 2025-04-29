/* eslint-disable react-hooks/exhaustive-deps */
import React, { lazy, memo, Suspense, useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { FiEdit2, FiTrash2, FiEye } from "react-icons/fi";
import Button from "../../components/core/Button";
import Input from "../../components/core/Input";
import LoadingSpinner from "../../components/core/LoadingSpinner";
import LoadingSkeleton from "../../components/shared/LoadingSkelaton";
import { productService } from "../../services/productService";
import { getCategories } from "../../services/categoryService"; 
import { socketService } from "../../services/socketService";

const ProductModal = lazy(() => import("../../pages/ProductModal"));

const ProductInventory = memo(() => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryMap, setCategoryMap] = useState({});

  const PRODUCTS_PER_PAGE = 10;

  // Fetch categories
  const loadCategories = useCallback(async () => {
    try {
      const response = await  getCategories.getAllCategories();
      if (response.success) {
        const map = response.data.reduce((acc, cat) => {
          acc[cat._id] = cat.name;
          return acc;
        }, {});
        setCategoryMap(map);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    if (!productService.getProducts) {
      setError('Product service is not properly initialized');
      setLoading(false);
      console.error('productService.getProducts is not a function');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await productService.getProducts({
        page: currentPage,
        limit: PRODUCTS_PER_PAGE,
        search: searchTerm,
      });
      setProducts(response.data);
      setTotalPages(response.pages);
    } catch (err) {
      setError(
        err.message.includes('Network Error')
          ? 'Unable to connect to the server. Please check your network or try again later.'
          : `Failed to load products: ${err.message}`
      );
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  // Handle product added via Socket.IO
  useEffect(() => {
    socketService.on('productAdded', (newProduct) => {
      setProducts((prev) => [newProduct, ...prev].slice(0, PRODUCTS_PER_PAGE));
    });
    return () => socketService.off('productAdded');
  }, []);

  const handleDelete = useCallback(async (productId) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await productService.deleteProduct(productId);
        setProducts((prev) => prev.filter((p) => p._id !== productId));
      } catch (err) {
        setError(
          err.message.includes('Network Error')
            ? 'Unable to connect to the server. Please check your network or try again later.'
            : `Failed to delete product: ${err.message}`
        );
        console.error('Error deleting product:', err);
      }
    }
  }, []);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, [loadCategories, loadProducts]);

  const handlePreview = useCallback((product) => {
    setSelectedProduct({
      _id: product._id,
      title: product.title,
      price: product.price,
      originalPrice: product.discountPrice ? product.price : product.price,
      discountPercentage: product.discountPrice
        ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
        : 0,
      images: product.images?.map((img) =>
        img.url.startsWith('http') ? img.url : `http://localhost:5000${img.url}`
      ) || ['/placeholder-product.png'],
      rating: product.averageRating || 0,
      numReviews: product.numReviews || 0,
      stock: product.stock || 0,
      description: product.description || '',
      category: product.categoryId,
      variants: product.variants || [],
    });
    setShowPreview(true);
  }, []);

  // Get category name
  const getCategoryName = (categoryId) => {
    if (!categoryId) return 'No category';
    return categoryMap[categoryId._id || categoryId] || 'Unknown';
  };

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
    <section aria-label="Product Inventory" className="container mx-auto px-4 py-6">
      <Helmet>
        <title>Product Inventory | Admin Dashboard</title>
        <meta name="description" content="Manage your product inventory, add, edit, or delete products." />
      </Helmet>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-[#E63946]">Product Inventory</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 min-w-[200px]"
          />
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
          <p className="text-gray-500 text-lg">No products found</p>
          <Link to="/admin/add-products">
            <Button className="mt-4 bg-[#E63946] hover:bg-[#FFFFFF] hover:text-[#E63946] hover:border-[#E63946] border">
              Create Your First Product
            </Button>
          </Link>
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
                    Variants
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
                {products.map((product) => (
                  <tr key={product._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {product.images && product.images[0] ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={product.images[0].url.startsWith('http') ? product.images[0].url : `http://localhost:5000${product.images[0].url}`}
                              alt={product.title || "Product image"}
                              onError={(e) => (e.target.src = "/placeholder-product.png")}
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
                      PKR {Number(product.price).toFixed(2) || "0.00"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.stock || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.variants?.length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.stock > 0
                            ? "bg-[#E6FFE6] text-[#008000]"
                            : "bg-[#FFE6E8] text-[#E63946]"
                        }`}
                      >
                        {product.stock > 0 ? "In Stock" : "Out of Stock"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handlePreview(product)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Preview"
                          aria-label={`Preview ${product.title}`}
                        >
                          <FiEye className="h-5 w-5" />
                        </button>
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
                          className="text-[#E63946] hover:text-[#B32D38]"
                          title="Delete"
                          aria-label={`Delete ${product.title}`}
                        >
                          <FiTrash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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