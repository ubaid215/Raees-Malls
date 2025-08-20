import './TiptapEditor.css';
import './Toast.css'; 
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './router/AppRouter';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { DiscountProvider } from './context/DiscountContext';
import { ProductProvider } from './context/ProductContext';
import { OrderProvider } from './context/OrderContext';
import { CartProvider } from './context/CartContext';
import { CategoryProvider } from './context/CategoryContext';
import { ReviewProvider } from './context/ReviewContext';
import { BannerProvider } from './context/BannerContext';
import { WishlistProvider } from './context/WishlistContext';
import { ToastProvider } from './context/ToastContext'; 

function App() {
  return (
    <BrowserRouter>
      {/* Wrap everything with ToastProvider at the top level */}
      <ToastProvider>
        <AuthProvider>
          <AdminAuthProvider>
            {/* Data providers that don't depend on user auth */}
            <BannerProvider>
              <CategoryProvider>
                <ProductProvider>
                  {/* User-specific providers */}
                  <CartProvider>
                    <OrderProvider>
                      <ReviewProvider>
                        {/* Admin-specific provider */}
                        <DiscountProvider>
                          <WishlistProvider>
                            <AppRouter />
                          </WishlistProvider>
                        </DiscountProvider>
                      </ReviewProvider>
                    </OrderProvider>
                  </CartProvider>
                </ProductProvider>
              </CategoryProvider>
            </BannerProvider>
          </AdminAuthProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;