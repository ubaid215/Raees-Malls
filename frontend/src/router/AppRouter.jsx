import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoadingSpinner from '../components/core/LoadingSpinner';
import CustomerLayout from '../components/layout/CustomerLayout';
import AdminLayout from '../admin/components/AdminLayout';
import ProtectedRoute from '../context/ProtectedRoute';
import ProtectedAdminRoute from '../context/ProtectedAdminRoute';
import CategorySection from '../components/shared/CategorySection';
import CheckoutPage from '../pages/CheckoutPage';
import AdminProfile from '../admin/pages/AdminProfile';

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
const Order = lazy(() => import('../pages/Order'));
const GoogleCallback = lazy(() => import('../pages/GoogleCallback'));
const Dashboard = lazy(() => import('../admin/pages/Dashboard'));
const ProductInventory = lazy(() => import('../admin/pages/ProductInventory'));
const OrderManagement = lazy(() => import('../admin/pages/OrderManagment'));
const AdminLogin = lazy(() => import('../admin/pages/AdminLogin'));
const AddProductPage = lazy(() => import('../admin/pages/AddProductPage'));
const EditProductPage = lazy(() => import('../admin/pages/EditProductPage'));
const HeroSliderAdmin = lazy(() => import('../admin/components/HeroSliderAdmin'));
const CategoryManager = lazy(() => import('../admin/components/CategoryManager'));
const BannerManager = lazy(() => import('../admin/components/BannerManager'));
const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy'));
const ReturnPolicy = lazy(() => import('../pages/ReturnPolicy'));
const RefundShipping = lazy(() => import('../pages/RefundShipping'));
const WarrantyTerms = lazy(() => import('../pages/WarrantyTerms'));

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
          <Route path="all-categories" element={<CategorySection />} />
          <Route path="contact" element={<Contact />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="callback" element={<GoogleCallback />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="return-policy" element={<ReturnPolicy />} />
          <Route path="refund-shipping" element={<RefundShipping />} />
          <Route path="warranty-terms" element={<WarrantyTerms />} />

          {/* Protected Customer Routes */}
          <Route
            path="wishlist"
            element={
                <Wishlist />
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
                <CheckoutPage />
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
          <Route
            path="orders"
            element={
              <ProtectedRoute>
                <Order />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders/:orderId"
            element={
              <ProtectedRoute>
                <Order />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="login" element={<AdminLogin />} />
          <Route element={<ProtectedAdminRoute />}>
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<ProductInventory />} />
            <Route path="add-products" element={<AddProductPage />} />
            <Route path="edit-product/:id" element={<EditProductPage />} />
            <Route path="orders" element={<OrderManagement />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="category" element={<CategoryManager />} />
            <Route path="banner-upload" element={<BannerManager />} />
            <Route path="hero-slider" element={<HeroSliderAdmin />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;