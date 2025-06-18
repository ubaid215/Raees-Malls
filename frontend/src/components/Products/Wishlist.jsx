import React, { useContext } from 'react';
import { WishlistContext } from '../../context/WishlistContext';
import WishlistProductCard from './WishlistProductCard';
import Button from '../core/Button';
import { Link } from 'react-router-dom';
import { Loader2, Heart, ShoppingBag } from 'lucide-react';

function Wishlist() {
  const { wishlist, wishlistCount, loading, error } = useContext(WishlistContext);
  // console.log('Wishlist component - wishlist:', JSON.stringify(wishlist, null, 2), 'wishlistCount:', wishlistCount);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-8 sm:py-12 md:py-16">
      {/* Header Section */}
      <header className="text-center mb-8 sm:mb-12 md:mb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <Heart className="text-red-500 mr-3" size={40} />
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
              Your Wishlist
            </h1>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-md border border-gray-200 max-w-md mx-auto">
            <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">
              <span className="text-red-600 text-2xl sm:text-3xl font-bold">{wishlistCount}</span>
              <span className="ml-2 text-gray-600">
                {wishlistCount === 1 ? 'Item' : 'Items'} Saved
              </span>
            </p>
            <p className="text-sm sm:text-base text-gray-500 mt-2">
              Keep track of products you love
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-16 sm:py-24">
            <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-xs max-w-md mx-auto text-center">
              <Loader2 className="animate-spin h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Your Favorites</h3>
              <p className="text-gray-600">Please wait while we fetch your wishlist...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16 sm:py-24">
            <div className="bg-white rounded-2xl shadow-xs p-8 sm:p-12 max-w-lg mx-auto border border-red-100">
              <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <span className="text-red-600 text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Oops! Something went wrong</h3>
              <p className="text-lg text-red-600 mb-6">{error}</p>
              <Button
                variant="primary"
                size="large"
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700 px-8 py-3 text-lg font-semibold"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : wishlist.length === 0 ? (
          <div className="text-center py-16 sm:py-24">
            <div className="bg-white rounded-3xl shadow-xs p-8 sm:p-12 max-w-lg mx-auto border border-gray-100">
              <div className="bg-gradient-to-br from-red-100 to-pink-100 rounded-full p-6 w-24 h-24 mx-auto mb-8 flex items-center justify-center">
                <Heart className="text-red-500" size={40} />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
                Your Wishlist is Empty
              </h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Discover amazing products and save your favorites here. 
                Start building your dream collection today!
              </p>
              <Link to="/products">
                <Button 
                  variant="primary" 
                  size="large" 
                  className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
                >
                  <ShoppingBag size={24} className="mr-3" />
                  Start Shopping
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Filter/Sort Bar */}
            <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 mb-8 border border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-700 font-medium">Showing all items</span>
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                    {wishlistCount} products
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Add to cart quickly this product, This may out of stock.
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 sm:gap-8 lg:gap-10">
              {wishlist.map((item, index) => (
                <div 
                  key={item.productId} 
                  className="transform transition-all duration-300"
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    animation: 'fadeInUp 0.6s ease-out forwards',
                    opacity: 0
                  }}
                >
                  <WishlistProductCard
                    productId={item.productId}
                    image={item.image}
                    title={item.title}
                    price={item.price}
                    rating={item.rating}
                    reviews={item.reviews}
                    stock={item.stock}
                  />
                </div>
              ))}
            </div>

            {/* Call to Action */}
            <div className="text-center mt-12 sm:mt-16 ">
              <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-3xl p-8 sm:p-12 border border-red-100 flex flex-col items-center justify-center">
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
                  Want to explore more?
                </h3>
                <p className="text-gray-600 mb-6 text-lg">
                  Discover thousands of products and find your next favorite item
                </p>
                <Link to="/products">
                  <Button 
                    variant="outline" 
                    size="large"
                    className="border-2 border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 hover:text-red-700 px-8 py-3 text-lg font-semibold "
                  >
                    Browse Products
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}
      </section>

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
      `}</style>
    </div>
  );
}

export default Wishlist;