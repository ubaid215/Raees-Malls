import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { getBanners } from '../services/bannerService';

export const BannerContext = createContext();

export const BannerProvider = ({ children }) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBanners = useCallback(async () => {
    const cacheKey = 'banners';
    const now = Date.now();
    
    // Safely retrieve cached data
    let cachedData = null;
    let cachedTimestamp = null;
    
    try {
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        cachedData = JSON.parse(cachedStr);
      }
      
      const timestampStr = localStorage.getItem(`${cacheKey}_timestamp`);
      if (timestampStr) {
        cachedTimestamp = parseInt(timestampStr);
      }
    } catch (cacheErr) {
      console.warn('Banner cache read error:', cacheErr);
    }

    // Use cache if less than 1 hour old
    if (cachedData && cachedTimestamp && now - cachedTimestamp < 3600000) {
      setBanners(cachedData);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const bannerData = await getBanners();
      
      // Ensure banner data is an array
      const validBannerData = Array.isArray(bannerData) ? bannerData : [];
      
      setBanners(validBannerData);
      
      // Update cache safely
      try {
        localStorage.setItem(cacheKey, JSON.stringify(validBannerData));
        localStorage.setItem(`${cacheKey}_timestamp`, now.toString());
      } catch (cacheErr) {
        console.warn('Banner cache write error:', cacheErr);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch banners');
      // Fallback to cache if available
      if (cachedData) {
        setBanners(cachedData);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to fetch banners on mount
  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);
  
  // Effect to clean up stale cache on mount
  useEffect(() => {
    try {
      const now = Date.now();
      const timestampStr = localStorage.getItem('banners_timestamp');
      if (timestampStr) {
        const timestamp = parseInt(timestampStr);
        if (now - timestamp > 86400000) { // 24 hours
          localStorage.removeItem('banners');
          localStorage.removeItem('banners_timestamp');
        }
      }
    } catch (err) {
      console.warn('Banner cache cleanup error:', err);
    }
  }, []);

  const value = useMemo(() => ({
    banners,
    loading,
    error,
    refreshBanners: fetchBanners // Export the refresh function for manual updates
  }), [banners, loading, error, fetchBanners]);

  return <BannerContext.Provider value={value}>{children}</BannerContext.Provider>;
};

export const useBanners = () => {
  const context = useContext(BannerContext);
  if (!context) {
    throw new Error('useBanners must be used within a BannerProvider');
  }
  return context;
};