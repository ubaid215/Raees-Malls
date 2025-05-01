import React, { useState, useEffect, useContext } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Logo from '../../shared/Logo';
import { CiMenuBurger, CiSearch, CiShoppingCart, CiUser } from 'react-icons/ci';
import { RiArrowDownLine } from 'react-icons/ri';
import { FiPhoneCall } from 'react-icons/fi';
import { CategoryContext } from '../../../context/CategoryContext';
import { ProductContext } from '../../../context/ProductContext';
import { useCart } from '../../../context/CartContext';

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Shop', path: '/products' },
  { name: 'Categories', path: '/all-categories' },
  { name: 'About', path: '/about' },
  { name: 'Contact', path: '/contact' },
];

function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { cart } = useCart();
  const { categories, loading, error, fetchCategories } = useContext(CategoryContext);
  const { products, fetchProducts } = useContext(ProductContext);

  // Safely calculate cart count
  const cartCount = Array.isArray(cart?.items)
    ? cart.items.reduce((count, item) => count + (item.quantity || 0), 0)
    : 0;

  // Fetch categories on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        await fetchCategories({ isPublic: true });
      } catch (err) {
        console.error('Failed to fetch categories on mount:', err.message);
      }
    };
    loadCategories();
  }, [fetchCategories]);

  // Handle search input changes with debounce
  useEffect(() => {
    const searchProducts = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const result = await fetchProducts(
          1, // page
          5, // limit
          null, // categoryId
          false, // isFeatured
          { 
            isPublic: true,
            search: searchQuery // Add search parameter
          }
        );
        setSearchResults(result.products || []);
        setShowSearchResults(true);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchProducts, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchProducts]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setShowSearchResults(false);
      setShowMobileSearch(false);
    }
  };

  const handleSearchResultClick = (product) => {
    navigate(`/products/${product._id}`);
    setSearchQuery('');
    setShowSearchResults(false);
    setShowMobileSearch(false);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category.name);
    setShowDropdown(false);
    navigate(`/categories/${category.slug}`);
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
  };

  // Generate category links with paths
  const categoryLinks = categories.map((category) => ({
    ...category,
    path: `/categories/${category.slug}`,
  }));

  return (
    <header className="sticky top-0 z-50 bg-[#f5f5f5] shadow-sm mb-5">
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 text-red-700 text-center py-1 px-4 text-sm">
          {error}
          <button
            onClick={() => fetchCategories({ isPublic: true })}
            className="ml-2 underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#232F3F] text-white">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="p-2"
          aria-label="Toggle menu"
        >
          <CiMenuBurger size={24} strokeWidth={1} />
        </button>

        <div className="flex-shrink-0 mx-4">
          <Link to="/" onClick={closeMobileMenu}>
            <Logo isLink={false} />
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="p-2"
            aria-label="Search"
          >
            <CiSearch size={24} strokeWidth={1} />
          </button>
          <Link to="/cart" className="p-2 relative" aria-label="Cart">
            <CiShoppingCart size={24} strokeWidth={1} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Search */}
      {showMobileSearch && (
        <div className="md:hidden px-4 py-3 bg-[#232F3F] relative">
          <form onSubmit={handleSearch} className="flex">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 px-4 py-2 rounded-l-md focus:outline-none text-[#232F3F]"
              aria-label="Search products"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-r-md"
              aria-label="Submit search"
            >
              <CiSearch size={20} strokeWidth={1} />
            </button>
          </form>
          
          {/* Mobile Search Results */}
          {showSearchResults && (
            <div className="absolute left-0 right-0 mt-1 bg-white shadow-lg rounded-md z-50 max-h-80 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-gray-500">Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((product) => (
                  <div
                    key={product._id}
                    className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSearchResultClick(product)}
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={product.images?.[0]?.url || '/placeholder-product.png'} 
                        alt={product.title}
                        className="w-10 h-10 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium text-gray-800 truncate">{product.title}</p>
                        <p className="text-sm text-gray-600">${product.price}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">No products found</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mobile Menu Dropdown */}
      {showMobileMenu && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="px-4 py-3 border-b">
            <div className="flex gap-4 mb-4">
              <Link
                to="/login"
                className="flex-1 py-2 bg-gray-100 rounded-md font-medium text-center"
                onClick={closeMobileMenu}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="flex-1 py-2 bg-red-600 text-white rounded-md font-medium text-center"
                onClick={closeMobileMenu}
              >
                Sign Up
              </Link>
            </div>
          </div>
          <div className="px-4 py-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) =>
                  `block px-2 py-3 text-gray-700 border-b ${isActive ? 'text-red-600 font-medium' : ''}`
                }
                onClick={closeMobileMenu}
              >
                {link.name}
              </NavLink>
            ))}
          </div>
          <div className="px-4 py-2 border-t">
            {loading ? (
              <div className="px-2 py-2 text-gray-700">Loading categories...</div>
            ) : categoryLinks.length > 0 ? (
              categoryLinks.slice(0, 5).map((category) => (
                <Link
                  key={category._id}
                  to={category.path}
                  className="block px-2 py-2 text-gray-700 hover:text-red-600"
                  onClick={closeMobileMenu}
                >
                  {category.name}
                </Link>
              ))
            ) : (
              <div className="px-2 py-2 text-gray-700">No categories available</div>
            )}
          </div>
          <div className="px-4 py-3 flex items-center gap-2 text-gray-700">
            <FiPhoneCall size={18} />
            <span>+923006530063</span>
          </div>
        </div>
      )}

      {/* Desktop Top Navigation */}
      <nav className="hidden md:flex max-w-7xl mx-auto h-20 px-4 py-4 bg-[#232F3F] text-white items-center justify-between">
        <div className="flex-shrink-0">
          <Link to="/">
            <Logo isLink={false} />
          </Link>
        </div>

        <div className="flex items-center flex-1 max-w-xl mx-6 relative">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-4 py-3 flex items-center gap-2 bg-white text-[#232F3F] rounded-l-md border-r hover:bg-gray-100 transition-colors hover:shadow-md min-w-[180px] justify-between"
              aria-label="Select category"
              disabled={loading}
            >
              <span className="truncate">
                {loading ? 'Loading...' : selectedCategory}
              </span>
              <RiArrowDownLine
                size={18}
                className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`}
              />
            </button>

            {showDropdown && (
              <div className="absolute left-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="px-4 py-2 text-gray-800">Loading categories...</div>
                ) : categoryLinks.length > 0 ? (
                  categoryLinks.map((category) => (
                    <button
                      key={category._id}
                      onClick={() => handleCategorySelect(category)}
                      className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 truncate"
                    >
                      {category.name}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-gray-800">No categories available</div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSearch} className="flex-1 flex relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="What you are looking for..."
              className="w-full px-4 py-3 bg-white placeholder-gray-400 text-[#232F3F] focus:outline-none"
              aria-label="Search products"
            />
            <button
              type="submit"
              className="px-4 py-3 bg-red-600 text-white rounded-r-md hover:bg-red-700 transition-colors"
              aria-label="Submit search"
            >
              <CiSearch size={20} strokeWidth={1} />
            </button>

            {/* Desktop Search Results */}
            {showSearchResults && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white shadow-lg rounded-md z-50 max-h-80 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-gray-500">Searching...</div>
                ) : searchResults.length > 0 ? (
                  <>
                    {searchResults.map((product) => (
                      <div
                        key={product._id}
                        className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleSearchResultClick(product)}
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={product.images?.[0]?.url || '/placeholder-product.png'} 
                            alt={product.title}
                            className="w-10 h-10 object-cover rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800 truncate">{product.title}</p>
                            <p className="text-sm text-gray-600">${product.price}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div 
                      className="p-3 text-center text-red-600 font-medium cursor-pointer hover:bg-gray-50"
                      onClick={handleSearch}
                    >
                      View all results for "{searchQuery}"
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center text-gray-500">No products found</div>
                )}
              </div>
            )}
          </form>
        </div>

        <div className="flex items-center gap-4 lg:gap-6">
          <Link
            to="/cart"
            className="p-2 hover:text-red-400 transition-colors relative"
            aria-label="Cart"
          >
            <CiShoppingCart size={24} strokeWidth={1} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <Link
            to="/account"
            className="flex items-center gap-1 p-2 hover:text-red-400 transition-colors"
            aria-label="Account"
          >
            <CiUser size={24} strokeWidth={1} />
            <span className="text-sm">Account</span>
          </Link>
        </div>
      </nav>

      {/* Desktop Bottom Navigation */}
      <nav className="hidden md:flex max-w-7xl mx-auto h-14 bg-white border-b items-center justify-between px-4 lg:px-6">
        <div className="relative group">
          <button className="flex items-center gap-1 px-4 py-2 bg-[#232F3F] text-white rounded-md hover:bg-opacity-90">
            <CiMenuBurger size={18} strokeWidth={1} />
            <span>Categories</span>
            <RiArrowDownLine size={16} />
          </button>
          <div className="absolute left-0 mt-1 w-56 bg-white rounded-md shadow-lg z-10 hidden group-hover:block max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-2 text-gray-800">Loading categories...</div>
            ) : categoryLinks.length > 0 ? (
              categoryLinks.map((category) => (
                <Link
                  key={category._id}
                  to={category.path}
                  className="block px-4 py-2 text-gray-800 hover:bg-gray-100"
                >
                  {category.name}
                </Link>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-800">No categories available</div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4 lg:space-x-6">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-medium hover:text-red-600 transition-colors ${
                  isActive ? 'text-red-600 font-semibold' : 'text-gray-700'
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <FiPhoneCall size={16} />
          <span>+923006530063</span>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;