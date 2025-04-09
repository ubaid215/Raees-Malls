import { createContext, useContext, useState, useEffect } from 'react';
import { getSlides, addSlide, updateSlide, deleteSlide } from '../services/heroSliderService';

const SliderContext = createContext();

export const SliderProvider = ({ children }) => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSlides = async () => {
    try {
      setLoading(true);
      const response = await getSlides();
      setSlides(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  const addNewSlide = async (slideData) => {
    try {
      setLoading(true);
      const response = await addSlide(slideData);
      await fetchSlides(); // Refresh the slides list
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateExistingSlide = async (id, slideData) => {
    try {
      setLoading(true);
      const response = await updateSlide(id, slideData);
      await fetchSlides(); // Refresh the slides list
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeSlide = async (id) => {
    try {
      setLoading(true);
      await deleteSlide(id);
      await fetchSlides(); // Refresh the slides list
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <SliderContext.Provider
      value={{
        slides,
        loading,
        error,
        addSlide: addNewSlide,
        updateSlide: updateExistingSlide,
        deleteSlide: removeSlide,
        refreshSlides: fetchSlides,
      }}
    >
      {children}
    </SliderContext.Provider>
  );
};

export const useSlider = () => useContext(SliderContext);