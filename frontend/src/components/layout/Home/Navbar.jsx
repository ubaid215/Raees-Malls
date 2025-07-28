import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { CiMenuBurger, CiSearch, CiShoppingCart, CiUser, CiHeart, CiCircleRemove } from 'react-icons/ci';
import { RiArrowDownLine } from 'react-icons/ri';
import { debounce } from 'lodash';
import { CategoryContext } from '../../../context/CategoryContext';
import { ProductContext } from '../../../context/ProductContext';
import { WishlistContext } from '../../../context/WishlistContext';
import { useCart } from '../../../context/CartContext';
import SocketService from '../../../services/socketService';
import { toast } from 'react-toastify';
import Logo from '../../../assets/images/Raees Malls.png';
import { useAuth } from '../../../context/AuthContext';

// Navigation links
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
  const [expandedCategories, setExpandedCategories] = useState({});
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [categoriesInitialized, setCategoriesInitialized] = useState(false);
  
  const navigate = useNavigate();
  const { isAuthenticated, user, fetchUser } = useAuth();

  // Context references
  const { cartItems } = useCart();
  const { categories, loading, error, fetchCategories } = useContext(CategoryContext);
  const { products, fetchProducts } = useContext(ProductContext);
  const { wishlistCount } = useContext(WishlistContext);

  // Refs for optimization
  const fetchInProgressRef = useRef(false);
  const lastSearchQueryRef = useRef('');
  const searchTimeoutRef = useRef(null);
  const componentKey = 'navbar';

  // Calculate cart count from cartItems array
  const cartCount = useMemo(() => {
    return Array.isArray(cartItems)
      ? cartItems.reduce((count, item) => count + (item.quantity || 0), 0)
      : 0;
  }, [cartItems]);

  // Debug logging (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Navbar[${componentKey}]:`, {
        cartItems: cartItems?.length || 0,
        cartCount,
        isAuthenticated,
        categoriesLength: categories?.length || 0,
        isSocketConnected
      });
    }
  }, [cartItems, cartCount, isAuthenticated, categories, isSocketConnected]);

  // Memoized hierarchical category structure
  const categoriesWithSubcategories = useMemo(() => {
    if (!categories || !Array.isArray(categories)) {
      return [];
    }

    const categoryMap = {};
    categories.forEach((category) => {
      categoryMap[category._id] = { ...category, subCategories: [] };
    });

    const rootCategories = [];
    categories.forEach((category) => {
      const parentId = category.parentId?._id || category.parentId;
      if (parentId && categoryMap[parentId]) {
        categoryMap[parentId].subCategories.push(categoryMap[category._id]);
      } else {
        rootCategories.push(categoryMap[category._id]);
      }
    });

    rootCategories.sort((a, b) => a.name.localeCompare(b.name));
    rootCategories.forEach((cat) => {
      cat.subCategories.sort((a, b) => a.name.localeCompare(b.name));
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`Navbar[${componentKey}] - Built category hierarchy:`, rootCategories.length);
    }

    return rootCategories;
  }, [categories]);

  // Optimized categories fetch
  const handleFetchCategories = useCallback(async (forceRefresh = false) => {
    if (fetchInProgressRef.current && !forceRefresh) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Navbar[${componentKey}] - Categories fetch already in progress, skipping`);
      }
      return;
    }

    fetchInProgressRef.current = true;

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Navbar[${componentKey}] - Fetching categories`);
      }

      await fetchCategories({ 
        isPublic: true,
        skipCache: forceRefresh 
      });
      
      setCategoriesInitialized(true);
    } catch (err) {
      console.error(`Navbar[${componentKey}] - Failed to fetch categories:`, err.message);
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [fetchCategories]);

  // Single initialization effect
  useEffect(() => {
    let mounted = true;

    const initializeNavbar = async () => {
      // Initialize categories if not already done
      if (!categoriesInitialized && categories.length === 0 && !loading && !fetchInProgressRef.current) {
        await handleFetchCategories();
      }

      // Fetch user data on mount if tokens exist and user is not loaded
      if (!user && !isAuthenticated && mounted) {
        try {
          await fetchUser();
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`Navbar[${componentKey}] - Initial user fetch failed:`, err.message);
          }
        }
      }
    };

    initializeNavbar();

    return () => {
      mounted = false;
    };
  }, [categoriesInitialized, categories.length, loading, user, isAuthenticated, handleFetchCategories, fetchUser]);

  // Optimized search with debouncing
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query || query.trim().length < 2) {
        setSearchResults([]);
        setShowSearchResults(false);
        setIsSearching(false);
        return;
      }

      // Prevent duplicate searches
      if (lastSearchQueryRef.current === query) {
        setIsSearching(false);
        return;
      }

      lastSearchQueryRef.current = query;
      setIsSearching(true);

      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Navbar[${componentKey}] - Searching for:`, query);
        }

        const result = await fetchProducts({
          page: 1,
          limit: 5,
          search: query,
          sort: '-createdAt'
        }, { 
          isPublic: true,
          skipCache: false 
        });

        const searchResults = result?.products || [];
        setSearchResults(searchResults);
        setShowSearchResults(true);

        if (process.env.NODE_ENV === 'development') {
          console.log(`Navbar[${componentKey}] - Search results:`, searchResults.length);
        }
      } catch (err) {
        console.error(`Navbar[${componentKey}] - Search error:`, err);
        setSearchResults([]);
        setShowSearchResults(false);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [fetchProducts]
  );

  // Handle search input changes
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Clear results immediately if query is too short
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      lastSearchQueryRef.current = '';
      return;
    }

    // Set loading state immediately for better UX
    setIsSearching(true);
    
    // Debounce the actual search
    debouncedSearch(searchQuery.trim());

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, debouncedSearch]);

  // Optimized socket handling
  useEffect(() => {
    let mounted = true;

    const connectSocket = () => {
      if (isSocketConnected) return;

      try {
        SocketService.connect();
        if (mounted) {
          setIsSocketConnected(true);
          if (process.env.NODE_ENV === 'development') {
            console.log(`Navbar[${componentKey}] - SocketService connected`);
          }
        }
      } catch (err) {
        console.error(`Navbar[${componentKey}] - SocketService connection error:`, err);
        toast.error('Failed to initialize real-time updates');
      }
    };

    // Debounced category event handlers
    const debouncedCategoryCreated = debounce(({ category }) => {
      if (!mounted) return;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Navbar[${componentKey}] - Category created:`, category?.name);
      }
      toast.success(`New category added: ${category?.name}`);
      
      // Only refresh categories if we don't have this category
      const existingCategory = categories.find(cat => cat._id === category?._id);
      if (!existingCategory) {
        handleFetchCategories(true);
      }
    }, 1000);

    const debouncedCategoryUpdated = debounce(({ category }) => {
      if (!mounted) return;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Navbar[${componentKey}] - Category updated:`, category?.name);
      }
      toast.info(`Category updated: ${category?.name}`);
      handleFetchCategories(true);
    }, 1000);

    const debouncedCategoryDeleted = debounce(() => {
      if (!mounted) return;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Navbar[${componentKey}] - Category deleted`);
      }
      toast.warn('Category removed');
      handleFetchCategories(true);
    }, 1000);

    connectSocket();

    SocketService.on('categoryCreated', debouncedCategoryCreated);
    SocketService.on('categoryUpdated', debouncedCategoryUpdated);
    SocketService.on('categoryDeleted', debouncedCategoryDeleted);

    return () => {
      mounted = false;
      debouncedCategoryCreated.cancel();
      debouncedCategoryUpdated.cancel();
      debouncedCategoryDeleted.cancel();
      
      SocketService.off('categoryCreated');
      SocketService.off('categoryUpdated');
      SocketService.off('categoryDeleted');
      
      if (isSocketConnected) {
        SocketService.disconnect();
        setIsSocketConnected(false);
        if (process.env.NODE_ENV === 'development') {
          console.log(`Navbar[${componentKey}] - SocketService disconnected`);
        }
      }
    };
  }, [categories, handleFetchCategories, isSocketConnected]);

  // Optimized click outside handler
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (event) => {
      const dropdown = document.getElementById('category-dropdown');
      const mobileDropdown = document.getElementById('mobile-category-dropdown');
      
      if (dropdown && !dropdown.contains(event.target) && 
          mobileDropdown && !mobileDropdown.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Event handlers
  const handleSearch = useCallback((e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setShowSearchResults(false);
      setShowMobileSearch(false);
      lastSearchQueryRef.current = '';
    }
  }, [searchQuery, navigate]);

  const handleSearchResultClick = useCallback((product) => {
    navigate(`/products/${product._id}`);
    setSearchQuery('');
    setShowSearchResults(false);
    setShowMobileSearch(false);
    lastSearchQueryRef.current = '';
  }, [navigate]);

  const handleCategorySelect = useCallback((category) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Navbar[${componentKey}] - Selected category:`, category?.name);
    }
    setSelectedCategory(category.name);
    setShowDropdown(false);
    setShowMobileMenu(false);
    navigate(`/products?category=${category.slug}`);
  }, [navigate]);

  const toggleSubcategory = useCallback((categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  const closeMobileMenu = useCallback(() => {
    setShowMobileMenu(false);
  }, []);

  // Direct navigation handlers
  const handleCartClick = useCallback((e) => {
    navigate('/cart');
    e.stopPropagation();
  }, [navigate]);

  const handleAccountClick = useCallback((e) => {
    navigate('/account');
    e.stopPropagation();
  }, [navigate]);

  const handleWishlistClick = useCallback((e) => {
    navigate('/wishlist');
    e.stopPropagation();
  }, [navigate]);

  const handleRetryCategories = useCallback(() => {
    setCategoriesInitialized(false);
    handleFetchCategories(true);
  }, [handleFetchCategories]);

  // Render category with subcategories for desktop dropdown
  const renderDesktopCategory = useCallback((category, level = 0) => {
    const hasSubcategories = category.subCategories?.length > 0;
    const isExpanded = expandedCategories[category._id];

    return (
      <div key={category._id} className="relative">
        <div className="flex items-center">
          <button
            onClick={() => hasSubcategories ? toggleSubcategory(category._id) : handleCategorySelect(category)}
            className="flex-grow flex items-center justify-between w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 truncate"
            style={{ paddingLeft: `${level * 12 + 16}px` }}
          >
            <span>{category.name}</span>
            {hasSubcategories && (
              <svg
                className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
        {hasSubcategories && isExpanded && (
          <div className="ml-2">
            {category.subCategories.map((subCategory) =>
              renderDesktopCategory(subCategory, level + 1)
            )}
          </div>
        )}
      </div>
    );
  }, [expandedCategories, toggleSubcategory, handleCategorySelect]);

  // Render category with subcategories for mobile dropdown
  const renderMobileCategory = useCallback((category, level = 0) => {
    const hasSubcategories = category.subCategories?.length > 0;
    const isExpanded = expandedCategories[category._id];

    return (
      <React.Fragment key={category._id}>
        <div className="relative">
          <div className="flex items-center">
            <button
              onClick={() => {
                if (hasSubcategories) {
                  toggleSubcategory(category._id);
                } else {
                  handleCategorySelect(category);
                  setShowMobileMenu(false);
                }
              }}
              className="flex-grow flex items-center justify-between w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 truncate"
              style={{ paddingLeft: `${level * 12 + 16}px` }}
            >
              <span>{category.name}</span>
              {hasSubcategories && (
                <svg
                  className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
        {hasSubcategories && isExpanded && (
          <div className="ml-2">
            {category.subCategories.map((subCategory) =>
              renderMobileCategory(subCategory, level + 1)
            )}
          </div>
        )}
      </React.Fragment>
    );
  }, [expandedCategories, toggleSubcategory, handleCategorySelect]);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-700 text-center py-1 px-4 text-sm">
          {error}
          <button
            onClick={handleRetryCategories}
            className="ml-2 underline hover:text-red-900"
            disabled={fetchInProgressRef.current}
          >
            {fetchInProgressRef.current ? 'Loading...' : 'Retry'}
          </button>
        </div>
      )}

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="p-2 text-red-600"
          aria-label="Toggle menu"
        >
          {showMobileMenu ? <CiCircleRemove size={24} strokeWidth={1} /> : <CiMenuBurger size={24} strokeWidth={1} />}
        </button>

        <Link to="/">
          <img src={Logo} alt="Raees Malls Logo" className="h-8 w-auto" />
        </Link>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="p-2 text-red-600"
            aria-label="Search"
          >
            <CiSearch size={24} strokeWidth={1} />
          </button>
          <button
            onClick={handleWishlistClick}
            className="p-2 relative text-red-600"
            aria-label="Wishlist"
          >
            <CiHeart size={24} strokeWidth={1} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </button>
          <button
            onClick={handleCartClick}
            className="p-2 relative text-red-600"
            aria-label="Cart"
          >
            <CiShoppingCart size={24} strokeWidth={1} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Search */}
      {showMobileSearch && (
        <div className="md:hidden px-4 py-3 bg-white border-b relative">
          <form onSubmit={handleSearch} className="flex">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 px-4 py-2 rounded-l-md border border-gray-300 focus:outline-none focus:border-red-500 text-gray-800"
              aria-label="Search products"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-r-md"
              aria-label="Submit search"
              disabled={isSearching}
            >
              <CiSearch size={20} strokeWidth={1} />
            </button>
          </form>

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
                        <p className="text-sm text-red-600">${product.price}</p>
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
            <div className="flex flex-col gap-2 mb-4">
              {isAuthenticated ? (
                <button
                  onClick={(e) => {
                    handleAccountClick(e);
                    closeMobileMenu();
                  }}
                  className="w-full py-2 bg-red-600 text-white rounded-md font-medium text-center"
                >
                  Account
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="w-full py-2 bg-gray-100 rounded-md font-medium text-center text-gray-800"
                    onClick={closeMobileMenu}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="w-full py-2 bg-red-600 text-white rounded-md font-medium text-center"
                    onClick={closeMobileMenu}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
            <div className="relative" id="mobile-category-dropdown">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-gray-700 rounded-md border"
                aria-label="Select category"
                disabled={loading || fetchInProgressRef.current}
              >
                <span className="truncate">
                  {loading || fetchInProgressRef.current ? 'Loading...' : selectedCategory}
                </span>
                <RiArrowDownLine
                  size={18}
                  className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                />
              </button>
              {showDropdown && (
                <div className="mt-1 w-full bg-white rounded-md shadow-lg z-60 max-h-96 overflow-y-auto">
                  {loading || fetchInProgressRef.current ? (
                    <div className="px-4 py-2 text-gray-800">Loading categories...</div>
                  ) : categoriesWithSubcategories.length > 0 ? (
                    categoriesWithSubcategories.map((category) =>
                      renderMobileCategory(category)
                    )
                  ) : (
                    <div className="px-4 py-2 text-gray-800">No categories available</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="px-4 py-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) =>
                  `block px-2 py-3 text-gray-700 hover:text-red-600 transition-colors ${
                    isActive ? 'text-red-600 font-medium' : ''
                  }`
                }
                onClick={closeMobileMenu}
              >
                {link.name}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Desktop Top Navigation */}
      <nav className="hidden md:flex max-w-7xl mx-auto px-4 py-4 bg-white items-center justify-between border-b">
        <div className="flex-shrink-0">
          <Link to="/">
            <img src={Logo} alt="Raees Malls Logo" className="h-12 w-auto" />
          </Link>
        </div>

        <div className="flex items-center flex-1 max-w-xl mx-6 relative">
          <div className="relative" id="category-dropdown">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-4 py-3 flex items-center gap-2 bg-gray-50 text-gray-700 rounded-l-md border-r border hover:bg-gray-100 transition-colors hover:shadow-md min-w-[180px] justify-between"
              aria-label="Select category"
              disabled={loading || fetchInProgressRef.current}
            >
              <span className="truncate">
                {loading || fetchInProgressRef.current ? 'Loading...' : selectedCategory}
              </span>
              <RiArrowDownLine
                size={18}
                className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`}
              />
            </button>

            {showDropdown && (
              <div className="absolute left-0 mt-1 w-64 bg-white rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                {loading || fetchInProgressRef.current ? (
                  <div className="px-4 py-2 text-gray-800">Loading categories...</div>
                ) : categoriesWithSubcategories.length > 0 ? (
                  categoriesWithSubcategories.map((category) =>
                    renderDesktopCategory(category)
                  )
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
              className="w-full px-4 py-3 border border-l-0 placeholder-gray-400 text-gray-800 focus:outline-none focus:border-red-300"
              aria-label="Search products"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-red-600 text-white rounded-r-md hover:bg-red-700 transition-colors"
              aria-label="Submit search"
              disabled={isSearching}
            >
              <CiSearch size={20} strokeWidth={1} />
            </button>

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
                            <p className="text-sm text-red-600">${product.price}</p>
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

        <div className="flex items-center gap-2 lg:gap-3">
          <button
            onClick={handleWishlistClick}
            className="p-2 text-red-600 hover:text-red-700 transition-colors relative cursor-pointer"
            aria-label="Wishlist"
          >
            <CiHeart size={24} strokeWidth={1} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </button>
          <button
            onClick={handleCartClick}
            className="p-2 text-red-600 hover:text-red-700 transition-colors relative cursor-pointer"
            aria-label="Cart"
          >
            <CiShoppingCart size={24} strokeWidth={1} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {isAuthenticated ? (
            <button
              onClick={handleAccountClick}
              className="flex items-center gap-1 p-2 text-red-600 hover:text-red-700 transition-colors cursor-pointer"
              aria-label="Account"
            >
              <CiUser size={24} strokeWidth={1} />
              <span className="text-sm">Account</span>
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Desktop Bottom Navigation */}
      <nav className="hidden md:flex max-w-7xl mx-auto h-14 bg-[#1e3a8a] items-center justify-center px-4 lg:px-6">
        <div className="flex items-center space-x-4 lg:space-x-8">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-medium hover:text-red-600 transition-colors ${
                  isActive ? 'text-red-600 font-semibold' : 'text-white'
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;