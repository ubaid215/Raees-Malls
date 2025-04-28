import { useState } from 'react';
import { useBanners } from '../../context/BannerContext';
import { FiEdit, FiTrash2, FiPlus, FiUpload } from 'react-icons/fi';
import Modal from '../../components/core/Modal';

const BannerManager = () => {
  const { banners, loading, error, createBanner, updateBanner, deleteBanner } = useBanners();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    position: '',
    title: '',
    subtitle: '',
    link: '',
    isActive: true,
    expiresAt: '',
    image: null
  });

  const positions = [
    { value: 'hero-side-top', label: 'Hero Section - Side Top' },
    { value: 'hero-side-bottom-left', label: 'Hero Section - Side Bottom Left' },
    { value: 'hero-side-bottom-right', label: 'Hero Section - Side Bottom Right' },
    { value: 'home-featured-1', label: 'Homepage - Featured 1' },
    { value: 'home-featured-2', label: 'Homepage - Featured 2' },
    { value: 'home-featured-3', label: 'Homepage - Featured 3' }
  ];

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setFormData({ ...formData, image: files[0] });
      if (files[0]) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImage(reader.result);
        };
        reader.readAsDataURL(files[0]);
      } else {
        setPreviewImage(null);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null && formData[key] !== '') {
        form.append(key, formData[key]);
      }
    });

    const result = currentBanner 
      ? await updateBanner(currentBanner._id, form)
      : await createBanner(form);

    if (result.success) {
      resetForm();
      setIsModalOpen(false);
    } else {
      alert(result.error);
    }
  };

  const handleEdit = (banner) => {
    setCurrentBanner(banner);
    setFormData({
      name: banner.name,
      position: banner.position,
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      link: banner.link || '',
      isActive: banner.isActive,
      expiresAt: banner.expiresAt ? new Date(banner.expiresAt).toISOString().split('T')[0] : '',
      image: null
    });
    setPreviewImage(banner.imageUrl);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this banner?')) {
      await deleteBanner(id);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      position: '',
      title: '',
      subtitle: '',
      link: '',
      isActive: true,
      expiresAt: '',
      image: null
    });
    setPreviewImage(null);
    setCurrentBanner(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Banner Management</h1>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center"
        >
          <FiPlus className="mr-2" /> Add New Banner
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
  {banners && banners.length > 0 ? (
    banners.map((banner) => (
      <tr key={banner._id}>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">{banner.name}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-500">
            {positions.find(p => p.value === banner.position)?.label || banner.position}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${banner.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {banner.isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button
            onClick={() => handleEdit(banner)}
            className="text-blue-600 hover:text-blue-900 mr-4"
          >
            <FiEdit />
          </button>
          <button
            onClick={() => handleDelete(banner._id)}
            className="text-red-600 hover:text-red-900"
          >
            <FiTrash2 />
          </button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
        No banners found
      </td>
    </tr>
  )}
</tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-xl font-semibold mb-4">
          {currentBanner ? 'Edit Banner' : 'Add New Banner'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banner Name*</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position*</label>
              <select
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
                disabled={!!currentBanner}
              >
                <option value="">Select Position</option>
                {positions.map((pos) => (
                  <option key={pos.value} value={pos.value}>
                    {pos.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image*</label>
              <div className="flex items-center space-x-4">
                <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <FiUpload className="w-6 h-6 mb-2 text-gray-500" />
                  <p className="text-sm text-gray-500">
                    {formData.image ? formData.image.name : 'Click to upload image'}
                  </p>
                  <input
                    type="file"
                    name="image"
                    onChange={handleInputChange}
                    className="hidden"
                    accept="image/*"
                    required={!currentBanner}
                  />
                </label>
                {previewImage && (
                  <div className="w-24 h-24 border rounded overflow-hidden">
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">Recommended size: 800x600px</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                maxLength="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
              <input
                type="text"
                name="subtitle"
                value={formData.subtitle}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                maxLength="200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
              <input
                type="url"
                name="link"
                value={formData.link}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder="https://example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                <input
                  type="date"
                  name="expiresAt"
                  value={formData.expiresAt}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {currentBanner ? 'Update Banner' : 'Add Banner'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BannerManager;