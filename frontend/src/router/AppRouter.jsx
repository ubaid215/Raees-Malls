import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoadingSpinner from '../components/core/LoadingSpinner';
import CustomerLayout from '../components/layout/CustomerLayout';
import AdminLayout from '../admin/components/AdminLayout';
import ProtectedRoute from '../context/ProtectedRoute';
import ProtectedAdminRoute from '../context/ProtectedAdminRoute';

// Lazy load pages
const HomePage = lazy(() => import('../pages/HomePage'));
const AllProducts = lazy(() => import('../pages/AllProducts'));
const ProductDetails = lazy(() => import('../components/Products/ProductDetails'));
const About = lazy(() => import('../pages/About'));
const Contact = lazy(() => import('../pages/Contact'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const Profile = lazy(() => import('../components/shared/Profile'));
const Wishlist = lazy(() => import('../components/Products/Wishlist'));
const Cart = lazy(() => import('../components/features/Cart'));
const Checkout = lazy(() => import('../components/features/Checkout'));
const Dashboard = lazy(() => import('../admin/pages/Dashboard'));
const ProductInventory = lazy(() => import('../admin/pages/ProductInventory'));
const OrderManagement = lazy(() => import('../admin/pages/OrderManagment'));
const AdminLogin = lazy(() => import('../admin/pages/AdminLogin'));
const AddProductPage = lazy(() => import('../admin/pages/AddProductPage'));
const EditProductPage = lazy(() => import('../admin/pages/EditProductPage'));
const OrdersHistory = lazy(() => import('../admin/pages/OrdersHistory'));
const HeroSliderAdmin = lazy(() => import('../admin/components/HeroSliderAdmin'));
const CategoryManager = lazy(() => import('../admin/components/CategoryManager'));
const BannerManager = lazy(() => import('../admin/components/BannerManager'));

const AppRouter = () => {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Customer Routes */}
        <Route path="/" element={<CustomerLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<AllProducts />} />
          <Route path="product/:productId" element={<ProductDetails />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />

          {/* Protected Customer Routes */}
          <Route
            path="wishlist"
            element={
              <ProtectedRoute>
                <Wishlist />
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
            path="checkout"
            element={
              <ProtectedRoute>
                <Checkout />
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
          <Route path="login" element={<AdminLogin />} />
          <Route
            path="dashboard"
            element={
              <ProtectedAdminRoute>
                <Dashboard />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="inventory"
            element={
              <ProtectedAdminRoute>
                <ProductInventory />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="add-products"
            element={
              <ProtectedAdminRoute>
                <AddProductPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="edit-product/:id"
            element={
              <ProtectedAdminRoute>
                <EditProductPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="orders"
            element={
              <ProtectedAdminRoute>
                <OrderManagement />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="orders-history"
            element={
              <ProtectedAdminRoute>
                <OrdersHistory />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="category"
            element={
              <ProtectedAdminRoute>
                <CategoryManager />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="banner-upload"
            element={
              <ProtectedAdminRoute>
                <BannerManager />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="hero-slider"
            element={
              <ProtectedAdminRoute>
                <HeroSliderAdmin />
              </ProtectedAdminRoute>
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