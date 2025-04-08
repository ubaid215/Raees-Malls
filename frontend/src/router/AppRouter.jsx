import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoadingSpinner from '../components/core/LoadingSpinner';
import CustomerLayout from '../components/layout/CustomerLayout';
import AdminLayout from '../admin/components/AdminLayout';
import OrdersHistory from '../admin/pages/OrdersHistory';
import AddProductPage from '../admin/pages/AddProductPage';
import EditProductPage from '../admin/pages/EditProductPage';
import HeroSliderAdmin from '../admin/components/HeroSliderAdmin';
import HeroSlider from '../components/shared/HeroSlider';
import CheckoutPage from '../pages/CheckoutPage';
import FeaturedProducts from '../pages/FeaturedProducts';

// Lazy load your pages
const HomePage = lazy(() => import('../pages/HomePage'));
const AllProducts = lazy(() => import('../pages/AllProducts'));
const ProductDetails = lazy(() => import('../pages/ProductDetails'));
const About = lazy(() => import('../pages/About'));
const Contact = lazy(() => import('../pages/Contact'));
const Dashboard = lazy(() => import('../admin/pages/Dashboard'));
const ProductManagement = lazy(() => import('../admin/pages/ProductManagment'));
const ProductInventory = lazy(() => import('../admin/pages/ProductInventory'));
const OrderManagment = lazy(() => import('../admin/pages/OrderManagment'));
const ProductForm = lazy(() => import('../admin/pages/ProductForm'));

const AppRouter = () => {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Customer Routes */}
        <Route path="/" element={<CustomerLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<AllProducts />} />
          <Route path="hero-slider" element={<HeroSlider />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="featured-products" element={<FeaturedProducts />} />
          <Route path="products/:productId" element={<ProductDetails />} /> 
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<ProductInventory />} />
          <Route path="add-products" element={<AddProductPage />} />
          <Route path="hero-slider" element={<HeroSliderAdmin />} />
          <Route path="edit-product/:id" element={<EditProductPage />}/>
          <Route path="orders" element={<OrderManagment />} />
          <Route path="orders-history" element={<OrdersHistory />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;