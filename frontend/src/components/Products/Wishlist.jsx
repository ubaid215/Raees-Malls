import React, { useContext } from 'react';
import { WishlistContext } from '../../context/WishlistContext';
import WishlistProductCard from './WishlistProductCard';
import Button from '../core/Button';
import { Link } from 'react-router-dom';
import { Loader2, Heart, ShoppingBag, Sparkles, Star } from 'lucide-react';

function Wishlist() {
  const { wishlist, wishlistCount, loading, error } = useContext(WishlistContext);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-rose-200/20 to-pink-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-gradient-to-r from-purple-200/20 to-rose-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-gradient-to-r from-pink-200/20 to-red-200/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        
        {/* Floating Hearts */}
        <div className="absolute top-1/4 left-1/4 animate-float">
          <Heart className="text-rose-300/40 w-6 h-6" />
        </div>
        <div className="absolute top-1/3 right-1/3 animate-float delay-1000">
          <Sparkles className="text-pink-300/40 w-5 h-5" />
        </div>
        <div className="absolute bottom-1/3 left-1/3 animate-float delay-2000">
          <Star className="text-rose-300/40 w-4 h-4" />
        </div>
      </div>

      <div className="relative z-10 py-6 sm:py-8 lg:py-12">
        {/* Compact Header */}
        <header className="text-center mb-8 sm:mb-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <Heart className="text-rose-500 mr-3 w-8 h-8 sm:w-10 sm:h-10" fill="currentColor" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-rose-400 to-pink-400 rounded-full animate-ping"></div>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                My Wishlist
              </h1>
            </div>
            
            {/* Compact Stats Card */}
            <div className="inline-flex items-center bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg border border-rose-100">
              <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center mr-3">
                {wishlistCount}
              </div>
              <span className="text-gray-700 font-medium">
                {wishlistCount === 1 ? 'Item' : 'Items'} saved
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-16">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-rose-100">
                <div className="relative">
                  <Loader2 className="animate-spin h-12 w-12 text-rose-500 mx-auto mb-4" />
                  <div className="absolute inset-0 bg-gradient-to-r from-rose-400 to-pink-400 rounded-full blur-md opacity-30 animate-pulse"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Your Favorites</h3>
                <p className="text-gray-600">Fetching your wishlist...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 max-w-md mx-auto border border-red-100">
                <div className="bg-gradient-to-r from-red-100 to-rose-100 rounded-full p-4 w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <span className="text-red-500 text-2xl">⚠️</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Something went wrong</h3>
                <p className="text-red-600 mb-6">{error}</p>
                <Button
                  variant="primary"
                  size="large"
                  onClick={() => window.location.reload()}
                  className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : wishlist.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 sm:p-12 max-w-lg mx-auto border border-rose-100">
                <div className="relative mb-8">
                  <div className="bg-gradient-to-br from-rose-100 to-pink-100 rounded-full p-6 w-20 h-20 mx-auto flex items-center justify-center">
                    <Heart className="text-rose-500 w-8 h-8" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-rose-400 to-pink-400 rounded-full animate-bounce"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  Your Wishlist is Empty
                </h3>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Discover amazing products and save your favorites here. 
                  Start building your dream collection!
                </p>
                <Link to="/products">
                  <Button 
                    variant="primary" 
                    size="large" 
                    className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    <ShoppingBag size={20} className="mr-3" />
                    Start Shopping
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Compact Filter Bar */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-4 mb-8 border border-rose-100">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-700 font-medium text-sm">All Items</span>
                    <span className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      {wishlistCount}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    💡 Add to cart quickly - items may go out of stock
                  </div>
                </div>
              </div>

              {/* Optimized Products Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6 lg:gap-8">
                {wishlist.map((item, index) => (
                  <div 
                    key={item.productId} 
                    className="group transform transition-all duration-500 hover:scale-105"
                    style={{ 
                      animationDelay: `${index * 100}ms`,
                      animation: 'fadeInUp 0.8s ease-out forwards',
                      opacity: 0
                    }}
                  >
                    <div className="relative">
                      <WishlistProductCard
                        productId={item.productId}
                        image={item.image}
                        title={item.title}
                        price={item.price}
                        rating={item.rating}
                        reviews={item.reviews}
                        stock={item.stock}
                      />
                      {/* Hover effect overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-rose-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Enhanced Call to Action */}
              <div className="text-center mt-16">
                <div className="bg-gradient-to-r from-rose-50 via-white to-pink-50 rounded-3xl p-8 sm:p-12 border border-rose-100 shadow-lg relative overflow-hidden">
                  {/* Decorative elements */}
                  <div className="absolute top-4 left-4 w-20 h-20 bg-gradient-to-r from-rose-200/30 to-pink-200/30 rounded-full blur-xl"></div>
                  <div className="absolute bottom-4 right-4 w-24 h-24 bg-gradient-to-r from-pink-200/30 to-purple-200/30 rounded-full blur-xl"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-center mb-4">
                      <Sparkles className="text-rose-500 w-6 h-6 mr-2" />
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-800">
                        Discover More Treasures
                      </h3>
                      <Sparkles className="text-rose-500 w-6 h-6 ml-2" />
                    </div>
                    <p className="text-gray-600 mb-6 text-base max-w-md mx-auto">
                      Explore thousands of amazing products and find your next favorite item
                    </p>
                    <Link to="/products">
                      <Button 
                        variant="outline" 
                        size="large"
                        className="border-2 border-rose-300 hover:border-rose-400 hover:bg-rose-50 text-rose-600 hover:text-rose-700 px-8 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                      >
                        <ShoppingBag size={18} className="mr-2" />
                        Browse Products
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-float.delay-1000 {
          animation-delay: 1s;
        }
        
        .animate-float.delay-2000 {
          animation-delay: 2s;
        }
        
        /* Responsive grid improvements */
        @media (max-width: 640px) {
          .grid-cols-2 > div {
            min-height: 280px;
          }
        }
        
        @media (min-width: 641px) and (max-width: 1024px) {
          .grid-cols-3 > div {
            min-height: 320px;
          }
        }
        
        @media (min-width: 1025px) {
          .grid-cols-4 > div,
          .grid-cols-5 > div,
          .grid-cols-6 > div {
            min-height: 360px;
          }
        }
      `}</style>
    </div>
  );
}

export default Wishlist;