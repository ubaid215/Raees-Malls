import React, { useState, useEffect } from "react";
import { getProducts } from "../services/productAPI";
import ProductCard from "../components/features/ProductCard";
import LoadingSpinner from "../components/core/LoadingSpinner";

const AllProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch categories
        const categoriesRes = await fetch('http://localhost:5000/api/categories');
        const categoriesData = await categoriesRes.json();
        setCategories([{ id: 'all', name: 'All' }, ...categoriesData.data]);

        // Fetch products
        const { data } = await getProducts({ page: 1, limit: 12 });
        const formattedProducts = data.map(product => ({
          ...product,
          id: product._id,
          images: product.images.map(img => `http://localhost:5000${img}`),
          categories: product.categories || [],
          // Add mock data for new fields needed by ProductCard
          discountPercentage: Math.floor(Math.random() * 35) + 5, // Random discount 5-35%
          rating: 4 + Math.random(), // Random rating 4-5
          reviewCount: Math.floor(Math.random() * 3000) + 100, // Random reviews 100-3000
          specs: getMockSpecs(product.title), // Generate specs based on product title
          tags: getRandomTags(), // Random tags like "Fast Delivery", "Best Price"
        }));
        
        setProducts(formattedProducts);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Helper function to generate mock specs based on product title
  const getMockSpecs = (title) => {
    if (title.includes('Mac') || title.includes('iMac')) {
      return 'M3 Max Chip, 27" Retina 5K Display, 16GB RAM';
    } else if (title.includes('iPhone')) {
      return 'A17 Pro Chip, 6.7" Super Retina XDR, 256GB';
    } else if (title.includes('iPad')) {
      return 'M4 Chip, 13" XDR Display, 512GB Storage';
    } else if (title.includes('PlayStation')) {
      return '4K UHD Blu-ray, 825GB SSD, DualSense Controller';
    }
    return 'High performance, Premium quality, Latest model';
  };

  // Helper function to generate random tags
  const getRandomTags = () => {
    const allTags = ['Fast Delivery', 'Best Price',  'Shipping Today', 'Limited Stock'];
    const count = Math.floor(Math.random() * 2) + 1; // 1-2 tags
    return allTags.sort(() => 0.5 - Math.random()).slice(0, count);
  };

  // Filter products by category
  const filteredProducts = activeCategory === 'all' 
    ? products 
    : products.filter(product => 
        product.categories.some(cat => cat._id === activeCategory)
      );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 text-red-600">
        Error loading products: {error}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Page header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">Our Products</h1>
          <p className="mt-3 text-lg text-gray-600">Discover our premium collection with exclusive discounts</p>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === category.id
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Product grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No products found in this category</p>
          </div>
        )}

        {/* Load more button */}
        <div className="mt-12 text-center">
          <button className="bg-white text-red-600 border border-red-600 hover:bg-red-50 px-6 py-3 rounded-md font-medium transition-colors">
            Load More Products
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllProducts;