import React, { useState, useEffect } from 'react';
import { useBanners } from '../../context/BannerContext';
import { createBanner, updateBanner, deleteBanner } from '../../services/bannerService';
import { toast } from 'react-toastify';
import LoadingSkeleton from '../../components/shared/LoadingSkelaton';

const BannerManager = () => {
  const { banners, loading, error, fetchBanners, setBanners, setNeedsFetch } = useBanners();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetUrl: '',
    priority: 0,
    isActive: true,
    position: 'hero-slider',
  });
  const [image, setImage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (error) {
      toast.error(error, { position: 'top-right', autoClose: 5000 });
    }
  }, [error]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
    setFormErrors((prev) => ({ ...prev, image: '' }));
  };

  const validateForm = () => {
    const errors = {};
    
    if (!editingId && !image) errors.image = 'Image is required for new banners';
    if (image && !['image/jpeg', 'image/png'].includes(image.type)) {
      errors.image = 'Only JPEG or PNG images are allowed';
    }
    if (formData.priority < 0) errors.priority = 'Priority must be non-negative';
    if (!formData.position) errors.position = 'Position is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the form errors', { position: 'top-right', autoClose: 5000 });
      return;
    }

    try {
      let updatedBanner;
      if (editingId) {
        updatedBanner = await updateBanner(editingId, formData, image);
        console.log('Updated banner:', updatedBanner);
        setBanners((prev) =>
          prev.map((banner) => (banner._id === editingId ? updatedBanner : banner))
        );
        toast.success('Banner updated successfully', { position: 'top-right', autoClose: 3000 });
      } else {
        updatedBanner = await createBanner(formData, image);
        console.log('Created banner:', updatedBanner);
        setBanners((prev) => [...prev, updatedBanner]);
        toast.success('Banner created successfully', { position: 'top-right', autoClose: 3000 });
      }
      setFormData({
        title: '',
        description: '',
        targetUrl: '',
        priority: 0,
        isActive: true,
        position: 'hero-slider',
      });
      setImage(null);
      setEditingId(null);
      setFormErrors({});
      setNeedsFetch(true);
    } catch (err) {
      const errorMessage = err.message.includes(',')
        ? err.message.split(', ').join('; ')
        : err.message;
      console.error('Banner submission error:', err);
      toast.error(errorMessage, { position: 'top-right', autoClose: 5000 });
    }
  };

  const handleEdit = (banner) => {
    setFormData({
      title: banner.title,
      description: banner.description || '',
      targetUrl: banner.targetUrl || '',
      priority: banner.priority,
      isActive: banner.isActive,
      position: banner.position,
    });
    setImage(null);
    setEditingId(banner._id);
    setFormErrors({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      await deleteBanner(id);
      setBanners((prev) => prev.filter((banner) => banner._id !== id));
      toast.success('Banner deleted successfully', { position: 'top-right', autoClose: 3000 });
      setNeedsFetch(true);
    } catch (err) {
      console.error('Banner deletion error:', err);
      toast.error(err.message, { position: 'top-right', autoClose: 5000 });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      targetUrl: '',
      priority: 0,
      isActive: true,
      position: 'hero-slider',
    });
    setImage(null);
    setEditingId(null);
    setFormErrors({});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto">
          <LoadingSkeleton type="text" width="48" height="8" className="mb-4" />
          <LoadingSkeleton type="table" width="full" height="40" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Banner Management
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Create and manage banners for your website
          </p>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 sm:mb-8">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              {editingId ? 'Edit Banner' : 'Create New Banner'}
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Title */}
              <div className="lg:col-span-2">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.title ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  placeholder="Enter banner title"
                />
                {formErrors.title && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠</span>
                    {formErrors.title}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="lg:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-vertical"
                  placeholder="Enter banner description"
                />
              </div>

              {/* Target URL */}
              <div>
                <label htmlFor="targetUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Target URL
                </label>
                <input
                  type="url"
                  name="targetUrl"
                  id="targetUrl"
                  value={formData.targetUrl}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="https://example.com"
                />
              </div>

              {/* Priority */}
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <input
                  type="number"
                  name="priority"
                  id="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.priority ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  placeholder="0"
                />
                {formErrors.priority && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠</span>
                    {formErrors.priority}
                  </p>
                )}
              </div>

              {/* Position */}
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                  Position *
                </label>
                <select
                  name="position"
                  id="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.position ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <option value="hero-slider">Hero Slider</option>
                  <option value="featured-products-banner">Featured Products Banner</option>
                </select>
                {formErrors.position && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠</span>
                    {formErrors.position}
                  </p>
                )}
              </div>

              {/* Active Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active Banner
                  </label>
                </div>
              </div>

              {/* Image Upload */}
              <div className="lg:col-span-2">
                <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                  Banner Image {!editingId && '*'}
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="image"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="image"
                          name="image"
                          type="file"
                          accept="image/jpeg,image/png"
                          onChange={handleImageChange}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                  </div>
                </div>
                {formErrors.image && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠</span>
                    {formErrors.image}
                  </p>
                )}
                {image && (
                  <p className="mt-2 text-sm text-green-600 flex items-center">
                    <span className="mr-1">✓</span>
                    Selected: {image.name}
                  </p>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 pt-6 border-t border-gray-200">
              <div className="flex-1 sm:flex-none sm:order-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
                >
                  {editingId ? '✓ Update Banner' : '+ Create Banner'}
                </button>
              </div>
              {editingId && (
                <div className="flex-1 sm:flex-none sm:order-1">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-2.5 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Banners List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                All Banners ({banners.length})
              </h2>
            </div>
          </div>
          
          {banners.length === 0 ? (
            <div className="p-6 sm:p-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No banners yet</h3>
              <p className="mt-2 text-gray-500">Get started by creating your first banner.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {banners.map((banner) => (
                      <tr key={banner._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <img
                            src={banner.image.url}
                            alt={banner.image.alt || banner.title}
                            className="h-12 w-12 object-cover rounded-lg border border-gray-200"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {banner.title}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {banner.position.replace('-', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {banner.priority}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            banner.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {banner.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(banner)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(banner._id)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-gray-200">
                {banners.map((banner) => (
                  <div key={banner._id} className="p-4 sm:p-6">
                    <div className="flex items-start space-x-4">
                      <img
                        src={banner.image.url}
                        alt={banner.image.alt || banner.title}
                        className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate">
                              {banner.title}
                            </h3>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {banner.position.replace('-', ' ')}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                banner.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {banner.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              Priority: {banner.priority}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleEdit(banner)}
                            className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(banner._id)}
                            className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BannerManager;