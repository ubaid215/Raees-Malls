import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Logo from '../../shared/Logo';
import { CiMenuBurger, CiSearch, CiShoppingCart, CiUser } from 'react-icons/ci';
import { RiArrowDownLine } from 'react-icons/ri';
import { FiPhoneCall } from 'react-icons/fi';
import { getCategories } from '../../../services/categoryService';
import { useCart } from '../../../context/CartContext';

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Shop', path: '/products' },
  { name: 'Categories', path: '/categories' },
  { name: 'About', path: '/about' },
  { name: 'Contact', path: '/contact' },
];

function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { cart } = useCart();

  // Safely calculate cart count
  const cartCount = Array.isArray(cart?.items)
    ? cart.items.reduce((count, item) => count + (item.quantity || 0), 0)
    : 0;

  // Fetch categories with caching and request cancellation
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const fetchCategories = async () => {
      // Check cache first
      const cachedCategories = localStorage.getItem('categories');
      if (cachedCategories) {
        try {
          const parsedCategories = JSON.parse(cachedCategories);
          if (isMounted) {
            setCategories(parsedCategories);
          }
          return;
        } catch (err) {
          console.error('Invalid cached categories:', cachedCategories, err);
          localStorage.removeItem('categories');
        }
      }

      if (isMounted) {
        setLoadingCategories(true);
        setError(null);
      }

      try {
        const categoriesData = await getCategories({ signal: controller.signal });
        const formattedCategories = categoriesData.map((cat) => ({
          name: cat.name,
          path: `/categories/${cat.slug || cat._id}`,
        }));

        if (isMounted) {
          setCategories(formattedCategories);
          localStorage.setItem('categories', JSON.stringify(formattedCategories || []));
        }
      } catch (err) {
        if (isMounted && err.name !== 'AbortError') {
          setError('Failed to load categories. Please refresh the page.');
          console.error('Failed to fetch categories:', err.message);
        }
      } finally {
        if (isMounted) {
          setLoadingCategories(false);
        }
      }
    };

    fetchCategories();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setShowMobileSearch(false);
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category.name);
    setShowDropdown(false);
    navigate(category.path);
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
  };

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <header className="sticky top-0 z-50 bg-[#f5f5f5] shadow-sm mb-5">
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 text-red-700 text-center py-1 px-4 text-sm">
          {error}
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
        <div className="md:hidden px-4 py-3 bg-[#232F3F]">
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
          {categories.length > 0 && (
            <div className="px-4 py-2 border-t">
              {categories.slice(0, 5).map((category) => (
                <Link
                  key={category.path}
                  to={category.path}
                  className="block px-2 py-2 text-gray-700 hover:text-red-600"
                  onClick={closeMobileMenu}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}
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

        <div className="flex items-center flex-1 max-w-xl mx-6">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-4 py-3 flex items-center gap-2 bg-white text-[#232F3F] rounded-l-md border-r hover:bg-gray-100 transition-colors hover:shadow-md min-w-[180px] justify-between"
              aria-label="Select category"
              disabled={loadingCategories}
            >
              <span className="truncate">
                {loadingCategories ? 'Loading...' : selectedCategory}
              </span>
              <RiArrowDownLine
                size={18}
                className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`}
              />
            </button>

            {showDropdown && categories.length > 0 && (
              <div className="absolute left-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 max-h-96 overflow-y-auto">
                {categories.map((category) => (
                  <button
                    key={category.path}
                    onClick={() => handleCategorySelect(category)}
                    className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 truncate"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSearch} className="flex-1 flex">
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
          {categories.length > 0 && (
            <div className="absolute left-0 mt-1 w-56 bg-white rounded-md shadow-lg z-10 hidden group-hover:block max-h-96 overflow-y-auto">
              {categories.map((category) => (
                <Link
                  key={category.path}
                  to={category.path}
                  className="block px-4 py-2 text-gray-800 hover:bg-gray-100"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}
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