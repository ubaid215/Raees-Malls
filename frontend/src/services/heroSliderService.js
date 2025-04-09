const API_URL = 'http://localhost:5000/api/hero-images';

export const getSlides = async () => {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch slides');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching slides:', error);
    throw error;
  }
};

export const addSlide = async (slideData) => {
  try {
    const formData = new FormData();
    formData.append('image', slideData.imageFile); 
    formData.append('title', slideData.title || '');
    formData.append('caption', slideData.caption || '');
    formData.append('link', slideData.link || '');
    formData.append('order', slideData.order || 0);

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add slide');
    }
    return await response.json();
  } catch (error) {
    console.error('Error adding slide:', error);
    throw error;
  }
};

export const updateSlide = async (id, slideData) => {
  try {
    const formData = new FormData();
    if (slideData.imageFile) {
      formData.append('image', slideData.imageFile); // Include file if provided
    }
    formData.append('title', slideData.title || '');
    formData.append('caption', slideData.caption || '');
    formData.append('link', slideData.link || '');
    formData.append('order', slideData.order || 0);

    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update slide');
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating slide:', error);
    throw error;
  }
};

export const deleteSlide = async (id) => {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete slide');
    }
    return await response.json();
  } catch (error) {
    console.error('Error deleting slide:', error);
    throw error;
  }
};