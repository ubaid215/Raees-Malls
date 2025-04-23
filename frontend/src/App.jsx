import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRouter from './router/AppRouter';
import { SliderProvider } from './context/SliderContext';
import { BannerProvider } from './context/BannerContext';
import { CartWishlistProvider } from './context/CartWishlistContext';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <SliderProvider>
        <BannerProvider>
          <CartWishlistProvider>
            <Router>
              <AppRouter />
            </Router>
          </CartWishlistProvider>
        </BannerProvider>
      </SliderProvider>
    </AuthProvider>
  );
}

export default App;