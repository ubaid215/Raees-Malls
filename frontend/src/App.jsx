import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRouter from './router/AppRouter';
import { SliderProvider } from './context/SliderContext';
import { BannerProvider } from './context/BannerContext';
import { CartWishlistProvider } from './context/CartWishlistContext';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <AdminAuthProvider>
          <SliderProvider>
            <BannerProvider>
              <CartWishlistProvider>
                <AppRouter />
              </CartWishlistProvider>
            </BannerProvider>
          </SliderProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;