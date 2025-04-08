// SliderContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { getSlides, addSlide, deleteSlide } from '../services/heroSliderService';

const SliderContext = createContext();

export const SliderProvider = ({ children }) => {
  // Metadata persisted in localStorage (no images)
  const [slideMetadata, setSlideMetadata] = useState(() => {
    const savedSlides = localStorage.getItem('heroSlides');
    return savedSlides ? JSON.parse(savedSlides) : [];
  });

  // Images stored in memory only (reset on refresh)
  const [slideImages, setSlideImages] = useState({});

  // Combine metadata and images for the full slides array
  const slides = slideMetadata.map(meta => ({
    ...meta,
    imageUrl: slideImages[meta.id] || '' // Use image from memory if available
  }));

  // Save metadata to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('heroSlides', JSON.stringify(slideMetadata));
  }, [slideMetadata]);

  const addNewSlide = async (slide) => {
    try {
      // Add metadata to service and get new slide
      const newSlide = await addSlide(
        { title: slide.title, subtitle: slide.subtitle, ctaText: slide.ctaText, ctaLink: slide.ctaLink },
        slideMetadata
      );
      
      // Update metadata
      setSlideMetadata(prev => [...prev, newSlide]);
      
      // Store image in memory
      setSlideImages(prev => ({
        ...prev,
        [newSlide.id]: slide.imageUrl
      }));
      
      return newSlide;
    } catch (error) {
      console.error('Error adding slide:', error);
      throw error;
    }
  };

  const removeSlide = async (id) => {
    try {
      const updatedMetadata = await deleteSlide(id, slideMetadata);
      setSlideMetadata(updatedMetadata);
      
      // Remove image from memory
      setSlideImages(prev => {
        const newImages = { ...prev };
        delete newImages[id];
        return newImages;
      });
    } catch (error) {
      console.error('Error deleting slide:', error);
      throw error;
    }
  };

  return (
    <SliderContext.Provider value={{ slides, addSlide: addNewSlide, deleteSlide: removeSlide }}>
      {children}
    </SliderContext.Provider>
  );
};

export const useSlider = () => useContext(SliderContext);