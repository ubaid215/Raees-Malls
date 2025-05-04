import React, { useState, useEffect } from 'react';
import { useBanners } from '../../context/BannerContext';
import { createBanner, updateBanner, deleteBanner } from '../../services/bannerService';
import { toast } from 'react-toastify';
import Button from '../../components/core/Button';
import LoadingSkeleton from '../../components/shared/LoadingSkelaton';

const BannerManager = () => {
  const { banners, loading, error, fetchBanners, setBanners, setNeedsFetch } = useBanners();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetUrl: '',
    priority: 0,
    isActive: true,
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
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!editingId && !image) errors.image = 'Image is required for new banners';
    if (image && !['image/jpeg', 'image/png'].includes(image.type)) {
      errors.image = 'Only JPEG or PNG images are allowed';
    }
    if (formData.priority < 0) errors.priority = 'Priority must be non-negative';
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
        // Update existing banner
        updatedBanner = await updateBanner(editingId, formData, image);
        setBanners((prev) =>
          prev.map((banner) => (banner._id === editingId ? updatedBanner : banner))
        );
        toast.success('Banner updated successfully', { position: 'top-right', autoClose: 3000 });
      } else {
        // Create new banner
        updatedBanner = await createBanner(formData, image);
        setBanners((prev) => [...prev, updatedBanner]);
        toast.success('Banner created successfully', { position: 'top-right', autoClose: 3000 });
      }
      // Reset form
      setFormData({
        title: '',
        description: '',
        targetUrl: '',
        priority: 0,
        isActive: true,
      });
      setImage(null);
      setEditingId(null);
      setFormErrors({});
    } catch (err) {
      const errorMessage = err.message.includes(',')
        ? err.message.split(', ').join('; ')
        : err.message;
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
    } catch (err) {
      toast.error(err.message, { position: 'top-right', autoClose: 5000 });
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSkeleton type="text" width="48" height="8" className="mb-4" />
        <LoadingSkeleton type="table" width="full" height="40" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">Manage Banners</h1>

      {/* Banner Form */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
          {editingId ? 'Edit Banner' : 'Create Banner'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              name="title"
              id="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`mt-1 block w-full border ${
                formErrors.title ? 'border-red-500' : 'border-gray-300'
              } rounded-md shadow-sm p-2 focus:ring-red-500 focus:border-red-500 sm:text-sm`}
            />
            {formErrors.title && <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>}
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              id="description"
              value={formData.description}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-red-500 focus:border-red-500 sm:text-sm"
              rows="4"
            />
          </div>
          <div>
            <label htmlFor="targetUrl" className="block text-sm font-medium text-gray-700">
              Target URL
            </label>
            <input
              type="url"
              name="targetUrl"
              id="targetUrl"
              value={formData.targetUrl}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-red-500 focus:border-red-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <input
              type="number"
              name="priority"
              id="priority"
              value={formData.priority}
              onChange={handleInputChange}
              min="0"
              className={`mt-1 block w-full border ${
                formErrors.priority ? 'border-red-500' : 'border-gray-300'
              } rounded-md shadow-sm p-2 focus:ring-red-500 focus:border-red-500 sm:text-sm`}
            />
            {formErrors.priority && <p className="mt-1 text-sm text-red-600">{formErrors.priority}</p>}
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              id="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
          </div>
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700">
              Image
            </label>
            <input
              type="file"
              name="image"
              id="image"
              accept="image/jpeg,image/png"
              onChange={handleImageChange}
              className={`mt-1 block w-full ${
                formErrors.image ? 'border-red-500' : ''
              }`}
            />
            {formErrors.image && <p className="mt-1 text-sm text-red-600">{formErrors.image}</p>}
          </div>
          <div className="flex justify-end gap-4">
            {editingId && (
              <Button
                type="button"
                onClick={() => {
                  setFormData({
                    title: '',
                    description: '',
                    targetUrl: '',
                    priority: 0,
                    isActive: true,
                  });
                  setImage(null);
                  setEditingId(null);
                  setFormErrors({});
                }}
                className="bg-gray-600 text-white hover:bg-gray-700"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {editingId ? 'Update Banner' : 'Create Banner'}
            </Button>
          </div>
        </form>
      </div>

      {/* Banner Table */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Banners</h2>
        {banners.length === 0 ? (
          <p className="text-gray-600">No banners found</p>
        ) : (
          <div className="overflow-x-auto">
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
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {banners.map((banner) => (
                  <tr key={banner._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={banner.image.url}
                        alt={banner.image.alt || banner.title}
                        className="h-12 w-12 object-cover rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {banner.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {banner.priority}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {banner.isActive ? 'Yes' : 'No'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        onClick={() => handleEdit(banner)}
                        className="text-blue-600 hover:text-blue-800 mr-4"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(banner._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerManager;