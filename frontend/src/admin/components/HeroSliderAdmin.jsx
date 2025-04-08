// HeroSliderAdmin.jsx
import { useState } from 'react';
import { FaTrash, FaPlus, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useSlider } from '../../context/SliderContext';

const HeroSliderAdmin = () => {
  const { slides, addSlide, deleteSlide } = useSlider();
  const [newSlide, setNewSlide] = useState({
    imageUrl: '',
    title: '',
    subtitle: '',
    ctaText: 'Shop Now',
    ctaLink: '#'
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const handleAddSlide = async () => {
    try {
      setIsUploading(true);
      await addSlide(newSlide);
      setNewSlide({
        imageUrl: '',
        title: '',
        subtitle: '',
        ctaText: 'Shop Now',
        ctaLink: '#'
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding slide:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteSlide = async (id) => {
    try {
      await deleteSlide(id);
    } catch (error) {
      console.error('Error deleting slide:', error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewSlide({ ...newSlide, imageUrl: reader.result });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-blue-600 mb-6"
      >
        <FaArrowLeft className="mr-2" /> Back to Dashboard
      </button>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Hero Slider Management</h1>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center"
        >
          <FaPlus className="mr-2" /> Add New Slide
        </button>
      </div>

      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Current Slides</h2>
        {slides.length === 0 ? (
          <p className="text-gray-500">No slides added yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {slides.map((slide) => (
              <div key={slide.id} className="border rounded-lg overflow-hidden shadow-md">
                <div className="relative h-48 bg-gray-100">
                  <img 
                    src={slide.imageUrl || 'https://via.placeholder.com/150'} // Fallback if image is missing
                    alt={slide.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1">{slide.title}</h3>
                  <p className="text-gray-600 mb-2">{slide.subtitle}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {slide.ctaText}
                    </span>
                    <button 
                      onClick={() => handleDeleteSlide(slide.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-xl border">
          <h2 className="text-xl font-semibold mb-4">Add New Slide</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image*</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full p-2 border rounded"
                disabled={isUploading}
                required
              />
              {newSlide.imageUrl && (
                <div className="mt-2">
                  <img 
                    src={newSlide.imageUrl} 
                    alt="Preview" 
                    className="h-32 object-contain border rounded"
                  />
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title*</label>
              <input 
                type="text" 
                value={newSlide.title}
                onChange={(e) => setNewSlide({...newSlide, title: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
              <input 
                type="text" 
                value={newSlide.subtitle}
                onChange={(e) => setNewSlide({...newSlide, subtitle: e.target.value})}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CTA Text*</label>
              <input 
                type="text" 
                value={newSlide.ctaText}
                onChange={(e) => setNewSlide({...newSlide, ctaText: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CTA Link*</label>
              <input 
                type="text" 
                value={newSlide.ctaLink}
                onChange={(e) => setNewSlide({...newSlide, ctaLink: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button 
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button 
                onClick={handleAddSlide}
                disabled={!newSlide.imageUrl || !newSlide.title || isUploading}
                className={`px-4 py-2 rounded text-white ${(!newSlide.imageUrl || !newSlide.title || isUploading) ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isUploading ? 'Uploading...' : 'Add Slide'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroSliderAdmin;