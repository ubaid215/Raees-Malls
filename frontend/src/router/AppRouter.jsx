// 📁 AppRouter.jsx
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import AuthContext
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
import CartContainer from '../components/features/CartContainer';
import Login from '../pages/Login';
import Register from '../pages/Register';
import AdminLogin from '../admin/pages/AdminLogin';
import AdminRegister from '../admin/pages/AdminRegister';
import Profile from '../components/shared/Profile'; 

// Lazy load your pages
const HomePage = lazy(() => import('../pages/HomePage'));
const AllProducts = lazy(() => import('../pages/AllProducts'));
const ProductDetails = lazy(() => import('../components/Products/ProductDetails'));
const About = lazy(() => import('../pages/About'));
const Contact = lazy(() => import('../pages/Contact'));
const Dashboard = lazy(() => import('../admin/pages/Dashboard'));
const ProductInventory = lazy(() => import('../admin/pages/ProductInventory'));
const OrderManagment = lazy(() => import('../admin/pages/OrderManagment'));

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />; // Wait for auth state

  if (!user) {
    // Redirect to appropriate login based on route
    return <Navigate to={requireAdmin ? '/admin/login' : '/login'} replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    // If admin access is required but user isn't an admin, redirect to home
    return <Navigate to="/" replace />;
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
          <Route path="categories" element={<CategorySection />} />
          <Route path="recent-products" element={<RecentProducts />} />
          <Route path="featured-products" element={<FeaturedProducts />} />
          <Route path="products/:productId" element={<ProductDetails />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          
          {/* Protected Customer Routes */}
          <Route
            path="checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="cart"
            element={
              <ProtectedRoute>
                <CartContainer />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          {/* Public Admin Routes */}
          <Route path="login" element={<AdminLogin />} />
          <Route path="register" element={<AdminRegister />} />

          {/* Protected Admin Routes (require admin role) */}
          <Route
            path=""
            element={
              <ProtectedRoute requireAdmin>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory"
            element={
              <ProtectedRoute requireAdmin>
                <ProductInventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="add-products"
            element={
              <ProtectedRoute requireAdmin>
                <AddProductPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="hero-slider"
            element={
              <ProtectedRoute requireAdmin>
                <HeroSliderAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="edit-product/:id"
            element={
              <ProtectedRoute requireAdmin>
                <EditProductPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="category"
            element={
              <ProtectedRoute requireAdmin>
                <CategoryManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders"
            element={
              <ProtectedRoute requireAdmin>
                <OrderManagment />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders-history"
            element={
              <ProtectedRoute requireAdmin>
                <OrdersHistory />
              </ProtectedRoute>
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