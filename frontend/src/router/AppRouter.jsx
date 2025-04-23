import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/core/LoadingSpinner';
import CustomerLayout from '../components/layout/CustomerLayout';
import AdminLayout from '../admin/components/AdminLayout';
import OrdersHistory from '../admin/pages/OrdersHistory';
import AddProductPage from '../admin/pages/AddProductPage';
import EditProductPage from '../admin/pages/EditProductPage';
import HeroSliderAdmin from '../admin/components/HeroSliderAdmin';
import HeroSlider from '../components/shared/HeroSlider';
import CheckoutPage from '../pages/CheckoutPage';
import FeaturedProducts from '../components/Products/FeaturedProducts';
import CategoryManager from '../admin/components/CategoryManager';
import CategorySection from '../components/shared/CategorySection';
import RecentProducts from '../components/Products/RecentProducts';
import Login from '../pages/Login';
import Register from '../pages/Register'; 
import Profile from '../components/shared/Profile';
import Navbar from '../components/layout/Home/Navbar';
import HeroSection from '../components/layout/Home/HeroSection';
import Categories from '../components/layout/Home/Categories';
import ProductRowSlider from '../components/Products/ProductRowSlider';
import Wishlist from '../components/Products/Wishlist';
import Cart from '../components/features/Cart';
import Checkout from '../components/features/Checkout';
import BannerManager from '../admin/components/BannerManager';

// Lazy load pages
const HomePage = lazy(() => import('../pages/HomePage'));
const AllProducts = lazy(() => import('../pages/AllProducts'));
const ProductDetails = lazy(() => import('../components/Products/ProductDetails'));
const About = lazy(() => import('../pages/About'));
const Contact = lazy(() => import('../pages/Contact'));
const Dashboard = lazy(() => import('../admin/pages/Dashboard'));
const ProductInventory = lazy(() => import('../admin/pages/ProductInventory'));
const OrderManagement = lazy(() => import('../admin/pages/OrderManagment'));

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const AppRouter = () => {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Customer Routes */}
        <Route path="/" element={<CustomerLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<AllProducts />} />
          <Route path="hero-slider" element={<HeroSlider />} />
          <Route path="product-slider" element={<ProductRowSlider />} />
          <Route path="navbar" element={<Navbar />} />
          <Route path="hero-section" element={<HeroSection />} />
          <Route path="categories" element={<CategorySection />} />
          <Route path="categories-section" element={<Categories />} />
          <Route path="recent-products" element={<RecentProducts />} />
          <Route path="featured-products" element={<FeaturedProducts />} />
          <Route path="product/:productId" element={<ProductDetails />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />

          {/* Protected Customer Routes */}
          <Route
            path="checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="cart"
            element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            }
          />
          <Route
            path="account"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          {/* Protected Admin Routes */}
          <Route
            path=""
            element={
              
                <Dashboard />
              
            }
          />
          <Route
            path="inventory"
            element={
              
                <ProductInventory />
              
            }
          />
          <Route
            path="add-products"
            element={
              
                <AddProductPage />
              
            }
          />
          <Route
            path="hero-slider"
            element={
              
                <HeroSliderAdmin />
              
            }
          />
          <Route
            path="edit-product/:id"
            element={
              
                <EditProductPage />
              
            }
          />
          <Route
            path="category"
            element={
              
                <CategoryManager />
              
            }
          />
          <Route
            path="orders"
            element={
              
                <OrderManagement />
              
            }
          />
          <Route
            path="orders-history"
            element={
              
                <OrdersHistory />
              
            }
          />
          <Route
            path="banner-upload"
            element={
              
                <BannerManager />
              
            }
          />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;