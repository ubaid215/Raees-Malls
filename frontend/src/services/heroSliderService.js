// heroSliderService.js
export const getSlides = async (currentSlides) => {
  return currentSlides; 
};

export const addSlide = async (slide, currentSlides) => {
  const newId = Math.max(...currentSlides.map(s => s.id), 0) + 1;
  const newSlide = { ...slide, id: newId };
  return newSlide; 
};

export const deleteSlide = async (id, currentSlides) => {
  return currentSlides.filter(slide => slide.id !== id); 
};