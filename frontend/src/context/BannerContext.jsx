import React, { createContext, useContext, useState, useEffect } from 'react';
import { getBanners } from '../services/bannerService';

const BannerContext = createContext();

export const BannerProvider = ({ children }) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [needsFetch, setNeedsFetch] = useState(true);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const fetchedBanners = await getBanners();
      console.log('Fetched banners:', fetchedBanners); // Debugging log
      setBanners(fetchedBanners);
      setError(null);
    } catch (err) {
      console.error('Fetch banners error:', err.message); // Debugging log
      setError(err.message);
    } finally {
      setLoading(false);
      setNeedsFetch(false);
    }
  };

  useEffect(() => {
    if (needsFetch) {
      fetchBanners();
    }
  }, [needsFetch]);

  return (
    <BannerContext.Provider value={{ banners, loading, error, fetchBanners, setBanners, setNeedsFetch }}>
      {children}
    </BannerContext.Provider>
  );
};

export const useBanners = () => {
  const context = useContext(BannerContext);
  if (!context) {
    throw new Error('useBanners must be used within a BannerProvider');
  }
  return context;
};