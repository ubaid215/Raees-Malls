import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const BannerContext = createContext();

export const BannerProvider = ({ children }) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/banners');
      setBanners(data.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const createBanner = async (formData) => {
    try {
      const { data } = await axios.post('/api/banners', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      await fetchBanners();
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  const updateBanner = async (id, formData) => {
    try {
      const { data } = await axios.put(`/api/banners/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      await fetchBanners();
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  const deleteBanner = async (id) => {
    try {
      await axios.delete(`/api/banners/${id}`);
      await fetchBanners();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  return (
    <BannerContext.Provider value={{ 
      banners, 
      loading, 
      error, 
      createBanner, 
      updateBanner, 
      deleteBanner,
      fetchBanners
    }}>
      {children}
    </BannerContext.Provider>
  );
};

export const useBanners = () => useContext(BannerContext);