import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { addToWishlist, getWishlist, removeFromWishlist } from '../services/wishlistService';
import socketService from '../services/socketService';
import { v4 as uuidv4 } from 'uuid';

export const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getDeviceId = () => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const safeExtractValue = (obj, path, defaultValue = null) => {
    try {
      const keys = path.split('.');
      let current = obj;
      for (const key of keys) {
        if (current === null || current === undefined) {
          return defaultValue;
        }
        current = current[key];
      }
      return current !== null && current !== undefined ? current : defaultValue;
    } catch (error) {
      console.warn(`Error extracting value from path ${path}:`, error);
      return defaultValue;
    }
  };

  const fetchWishlist = useCallback(
    debounce(async () => {
      setLoading(true);
      setError('');
      try {
        const wishlistData = await getWishlist();
        if (!wishlistData) {
          // console.log('No wishlist data received, setting empty array');
          setWishlist([]);
          return;
        }

        if (!Array.isArray(wishlistData)) {
          console.error('fetchWishlist: Expected wishlistData to be an array, got:', typeof wishlistData, wishlistData);
          setError('Invalid wishlist data format');
          setWishlist([]);
          return;
        }

        if (wishlistData.length === 0) {
          // console.log('Wishlist is empty');
          setWishlist([]);
          return;
        }

        const transformedData = wishlistData
          .map((item, index) => {
            try {
              const product = item?.productId || item?.product || item;
              
              if (!product) {
                console.warn(`Item ${index} has no product data:`, item);
                return null;
              }

              const productId = product._id || product.id || safeExtractValue(item, 'productId._id') || safeExtractValue(item, 'productId');
              
              if (!productId) {
                console.warn(`Item ${index} has no valid product ID:`, product);
                return null;
              }

              const title = safeExtractValue(product, 'title') || 
                           safeExtractValue(product, 'name') || 
                           'Unknown Product';

              const images = safeExtractValue(product, 'images') || [];
              const imageUrl = Array.isArray(images) && images.length > 0 
                ? (images[0]?.url || images[0]?.src || images[0])
                : '/placeholder-product.png';

              const originalPrice = Number(safeExtractValue(product, 'price', 0)) || 0;
              const discountPrice = Number(safeExtractValue(product, 'discountPrice')) || null;
              const finalPrice = discountPrice && discountPrice > 0 ? discountPrice : originalPrice;

              const rating = Number(safeExtractValue(product, 'averageRating', 0)) || 
                           Number(safeExtractValue(product, 'rating', 0)) || 0;
              const reviews = Number(safeExtractValue(product, 'numReviews', 0)) || 
                            Number(safeExtractValue(product, 'reviewCount', 0)) || 0;

              const stock = Number(safeExtractValue(product, 'stock', 0)) || 
                          Number(safeExtractValue(product, 'quantity', 0)) || 0;

              const transformedItem = {
                productId: productId,
                title: title,
                image: imageUrl,
                price: originalPrice,
                discountPrice: discountPrice,
                rating: rating,
                reviews: reviews,
                stock: stock,
                variantId: safeExtractValue(item, 'variantId'),
              };

              return transformedItem;
            } catch (transformError) {
              console.error(`Error transforming item ${index}:`, transformError, item);
              return null;
            }
          })
          .filter(item => item !== null && item.productId);

        setWishlist(transformedData);
      } catch (err) {
        console.error('fetchWishlist error:', err);
        setError(err.message || 'Failed to fetch wishlist');
        setWishlist([]);
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    try {
      const deviceId = getDeviceId();
      socketService.connect(deviceId);
      
      socketService.on('wishlistUpdated', () => {
        try {
          fetchWishlist();
        } catch (socketError) {
          console.error('Error handling wishlistUpdated event:', socketError);
        }
      });

      fetchWishlist();
    } catch (initError) {
      console.error('Error initializing wishlist:', initError);
      setError('Failed to initialize wishlist');
      setLoading(false);
    }

    return () => {
      try {
        socketService.off('wishlistUpdated');
      } catch (cleanupError) {
        console.error('Error cleaning up socket listeners:', cleanupError);
      }
    };
  }, [fetchWishlist]);

  const addItemToWishlist = async (productId, variantId = null) => {
    if (!productId) {
      const error = 'Product ID is required';
      setError(error);
      throw new Error(error);
    }

    setLoading(true);
    setError('');
    try {
      await addToWishlist(productId, variantId);
      await fetchWishlist();
    } catch (err) {
      console.error('addItemToWishlist error:', err);
      const errorMessage = err.message || 'Failed to add to wishlist';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const removeItemFromWishlist = async (productId, variantId = null) => {
    if (!productId) {
      const error = 'Product ID is required';
      setError(error);
      throw new Error(error);
    }

    setLoading(true);
    setError('');
    try {
      await removeFromWishlist(productId, variantId);
      await fetchWishlist();
    } catch (err) {
      console.error('removeItemFromWishlist error:', err);
      const errorMessage = err.message || 'Failed to remove from wishlist';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    wishlist,
    wishlistCount: wishlist.length,
    loading,
    error,
    addItemToWishlist,
    removeItemFromWishlist,
    fetchWishlist,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

// Custom hook to use the Wishlist context
export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};