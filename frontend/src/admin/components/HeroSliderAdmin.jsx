/* eslint-disable no-constant-binary-expression */
import { useState } from 'react';
import { FaTrash, FaPlus, FaArrowLeft, FaEdit } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useSlider } from '../../context/SliderContext';

const HeroSliderAdmin = () => {
  const { slides, addSlide, updateSlide, deleteSlide, loading } = useSlider();
  const [newSlide, setNewSlide] = useState({
    title: '',
    caption: '',
    link: '',
    order: 0,
    imageFile: null,
    previewUrl: '',
  });
  const [editSlide, setEditSlide] = useState(null); // For editing existing slides
  const [showAddForm, setShowAddForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const handleAddSlide = async () => {
    try {
      setIsUploading(true);
      await addSlide(newSlide);
      setNewSlide({
        title: '',
        caption: '',
        link: '',
        order: 0,
        imageFile: null,
        previewUrl: '',
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding slide:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditSlide = (slide) => {
    setEditSlide(slide);
    setNewSlide({
      title: slide.title || '',
      caption: slide.caption || '',
      link: slide.link || '',
      order: slide.order || 0,
      imageFile: null,
      previewUrl: `http://localhost:5000${slide.imageUrl}`, // Preload current image
    });
    setShowAddForm(true);
  };

  const handleUpdateSlide = async () => {
    try {
      setIsUploading(true);
      await updateSlide(editSlide._id, newSlide);
      setNewSlide({
        title: '',
        caption: '',
        link: '',
        order: 0,
        imageFile: null,
        previewUrl: '',
      });
      setEditSlide(null);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error updating slide:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteSlide = async (id) => {
    if (window.confirm('Are you sure you want to delete this slide?')) {
      try {
        await deleteSlide(id);
      } catch (error) {
        console.error('Error deleting slide:', error);
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setNewSlide({
        ...newSlide,
        imageFile: file,
        previewUrl,
      });
    }
  };

  const handleCancel = () => {
    setNewSlide({
      title: '',
      caption: '',
      link: '',
      order: 0,
      imageFile: null,
      previewUrl: '',
    });
    setEditSlide(null);
    setShowAddForm(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-red-600 mb-6"
      >
        <FaArrowLeft className="mr-2" /> Back to Dashboard
      </button>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Hero Slider Management</h1>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-red-600 text-white px-4 py-2 rounded flex items-center"
          disabled={loading}
        >
          <FaPlus className="mr-2" /> Add New Slide
        </button>
      </div>

      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Current Slides</h2>
        {loading && slides.length === 0 ? (
          <p className="text-gray-500">Loading slides...</p>
        ) : slides.length === 0 ? (
          <p className="text-gray-500">No slides added yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {slides.map((slide) => (
              <div key={slide._id} className="border rounded-lg overflow-hidden shadow-md">
                <div className="relative h-48 bg-gray-100">
                  <img 
                    src={`http://localhost:5000${slide.imageUrl}` || 'https://via.placeholder.com/150'}
                    alt={slide.title} 
                    className="w-full h-full object-cover"
                    onError={(e) => (e.target.src = 'https://via.placeholder.com/150')}
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1">{slide.title || 'Untitled'}</h3>
                  <p className="text-gray-600 mb-2">{slide.caption || 'No caption'}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded">
                      Order: {slide.order}
                    </span>
                    <div className="space-x-2">
                      <button 
                        onClick={() => handleEditSlide(slide)}
                        className="text-blue-600 hover:text-blue-800"
                        disabled={loading}
                      >
                        <FaEdit />
                      </button>
                      <button 
                        onClick={() => handleDeleteSlide(slide._id)}
                        className="text-red-600 hover:text-red-800"
                        disabled={loading}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-xl border">
          <h2 className="text-xl font-semibold mb-4">
            {editSlide ? 'Edit Slide' : 'Add New Slide'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image{!editSlide && '*'}</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageChange}
                className="w-full p-2 border rounded"
                disabled={isUploading}
                required={!editSlide} // Required only for new slides
              />
              {newSlide.previewUrl && (
                <div className="mt-2">
                  <img 
                    src={newSlide.previewUrl} 
                    alt="Preview" 
                    className="h-32 object-contain border rounded"
                  />
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input 
                type="text" 
                value={newSlide.title}
                onChange={(e) => setNewSlide({...newSlide, title: e.target.value})}
                className="w-full p-2 border rounded"
                disabled={isUploading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
              <input 
                type="text" 
                value={newSlide.caption}
                onChange={(e) => setNewSlide({...newSlide, caption: e.target.value})}
                className="w-full p-2 border rounded"
                disabled={isUploading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
              <input 
                type="text" 
                value={newSlide.link}
                onChange={(e) => setNewSlide({...newSlide, link: e.target.value})}
                className="w-full p-2 border rounded"
                disabled={isUploading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <input 
                type="number" 
                value={newSlide.order}
                onChange={(e) => setNewSlide({...newSlide, order: parseInt(e.target.value) || 0})}
                className="w-full p-2 border rounded"
                disabled={isUploading}
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button 
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button 
                onClick={editSlide ? handleUpdateSlide : handleAddSlide}
                disabled={(!editSlide && !newSlide.imageFile) || isUploading}
                className={`px-4 py-2 rounded text-white ${((!editSlide && !newSlide.imageFile) || isUploading) ? 'bg-red-300' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isUploading ? 'Processing...' : editSlide ? 'Update Slide' : 'Add Slide'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroSliderAdmin;