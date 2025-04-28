import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './router/AppRouter';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { WishlistProvider } from './context/WishlistContext';
import { DiscountProvider } from './context/DiscountContext';
import { ProductProvider } from './context/ProductContext';
import { OrderProvider } from './context/OrderContext';
import { CartProvider } from './context/CartContext';
import { CategoryProvider } from './context/CategoryContext';
import { ReviewProvider } from './context/ReviewContext';
import { BannerProvider } from './context/BannerContext';

function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <BrowserRouter>
          {/* Data providers that don't depend on user auth */}
          <BannerProvider>
            <CategoryProvider>
              <ProductProvider>
                {/* User-specific providers */}
                <CartProvider>
                  <OrderProvider>
                    <WishlistProvider>
                      <ReviewProvider>
                        {/* Admin-specific provider */}
                        <DiscountProvider>
                          <AppRouter />
                        </DiscountProvider>
                      </ReviewProvider>
                    </WishlistProvider>
                  </OrderProvider>
                </CartProvider>
              </ProductProvider>
            </CategoryProvider>
          </BannerProvider>
        </BrowserRouter>
      </AdminAuthProvider>
    </AuthProvider>
  );
}

export default App;