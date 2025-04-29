import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';
import { getBanners } from '../services/bannerService';

export const BannerContext = createContext();

export const BannerProvider = ({ children }) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsFetch, setNeedsFetch] = useState(true);

  const cacheKey = 'banners';
  const cacheTTL = 3600000; // 1 hour in ms
  const cacheCleanupTTL = 86400000; // 24 hours in ms

  // Load banners from cache on mount
  const loadFromCache = useCallback(() => {
    try {
      const cachedStr = localStorage.getItem(cacheKey);
      const timestampStr = localStorage.getItem(`${cacheKey}_timestamp`);
      const now = Date.now();

      if (cachedStr && timestampStr) {
        const cachedData = JSON.parse(cachedStr);
        const cachedTimestamp = parseInt(timestampStr);

        if (now - cachedTimestamp < cacheTTL) {
          setBanners(Array.isArray(cachedData) ? cachedData : []);
          setNeedsFetch(false);
          return true;
        }
      }
    } catch (cacheErr) {
      console.warn('Banner cache read error:', cacheErr);
    }
    return false;
  }, []);

  // Clean up stale cache
  const cleanupCache = useCallback(() => {
    try {
      const timestampStr = localStorage.getItem(`${cacheKey}_timestamp`);
      if (timestampStr) {
        const timestamp = parseInt(timestampStr);
        const now = Date.now();
        if (now - timestamp > cacheCleanupTTL) {
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(`${cacheKey}_timestamp`);
        }
      }
    } catch (err) {
      console.warn('Banner cache cleanup error:', err);
    }
  }, []);

  // Fetch banners from API
  const fetchBanners = useCallback(async () => {
    // Check cache first
    if (loadFromCache()) {
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const bannerData = await getBanners();
      const validBannerData = Array.isArray(bannerData) ? bannerData : [];
      
      setBanners(validBannerData);
      setNeedsFetch(false);

      // Update cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify(validBannerData));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      } catch (cacheErr) {
        console.warn('Banner cache write error:', cacheErr);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch banners');
      setNeedsFetch(true);
      // Fallback to cache if available
      if (loadFromCache()) {
        setError('Using cached banners due to fetch error');
      }
    } finally {
      setLoading(false);
    }
  }, [loadFromCache]);

  // Run cache cleanup on mount
  cleanupCache();

  const value = useMemo(() => ({
    banners,
    loading,
    error,
    needsFetch,
    fetchBanners,
  }), [banners, loading, error, needsFetch, fetchBanners]);

  return <BannerContext.Provider value={value}>{children}</BannerContext.Provider>;
};

export const useBanners = () => {
  const context = useContext(BannerContext);
  if (!context) {
    throw new Error('useBanners must be used within a BannerProvider');
  }
  return context;
};