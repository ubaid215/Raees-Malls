import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';
import Button from '../../components/core/Button';
import Input from '../../components/core/Input';
import axios from 'axios';

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    imageFile: null,
    previewUrl: '',
  });
  const [editCategory, setEditCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = 'http://localhost:5000/api/categories';

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL);
      if (response.data.success) {
        setCategories(response.data.data);
      } else {
        throw new Error(response.data.error || 'Failed to fetch categories');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewCategory((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setNewCategory((prev) => ({
        ...prev,
        imageFile: file,
        previewUrl,
      }));
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', newCategory.name);
      formData.append('description', newCategory.description);
      if (newCategory.imageFile) {
        formData.append('image', newCategory.imageFile);
      }

      const response = await axios.post(API_URL, formData);
      if (response.data.success) {
        setCategories((prev) => [...prev, response.data.data]);
        setNewCategory({ name: '', description: '', imageFile: null, previewUrl: '' });
        setError(null);
      } else {
        throw new Error(response.data.error || 'Failed to add category');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditCategory = (category) => {
    setEditCategory(category);
    setNewCategory({
      name: category.name,
      description: category.description || '',
      imageFile: null,
      previewUrl: category.imageUrl ? `http://localhost:5000${category.imageUrl}` : '',
    });
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', newCategory.name);
      formData.append('description', newCategory.description);
      if (newCategory.imageFile) {
        formData.append('image', newCategory.imageFile);
      }

      const response = await axios.put(`${API_URL}/${editCategory._id}`, formData);
      if (response.data.success) {
        setCategories((prev) =>
          prev.map((cat) => (cat._id === editCategory._id ? response.data.data : cat))
        );
        setNewCategory({ name: '', description: '', imageFile: null, previewUrl: '' });
        setEditCategory(null);
        setError(null);
      } else {
        throw new Error(response.data.error || 'Failed to update category');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        const response = await axios.delete(`${API_URL}/${id}`);
        if (response.data.success) {
          setCategories((prev) => prev.filter((cat) => cat._id !== id));
        } else {
          throw new Error(response.data.error || 'Failed to delete category');
        }
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (loading) {
    return <div>Loading categories...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        <p>Error: {error}</p>
        <Button onClick={fetchCategories} variant="outline" className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Category Management</h1>

      {/* Add/Edit Category Form */}
      <form onSubmit={editCategory ? handleUpdateCategory : handleAddCategory} className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Category Name"
            name="name"
            value={newCategory.name}
            onChange={handleChange}
            placeholder="Enter category name"
            required
          />
          <Input
            label="Description (Optional)"
            name="description"
            value={newCategory.description}
            onChange={handleChange}
            as="textarea"
            rows={2}
            placeholder="Enter category description"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full p-2 border rounded"
            />
            {newCategory.previewUrl && (
              <img
                src={newCategory.previewUrl}
                alt="Preview"
                className="mt-2 h-32 object-contain border rounded"
              />
            )}
          </div>
        </div>
        <Button type="submit" className="flex items-center">
          <FiPlus className="mr-2" /> {editCategory ? 'Update Category' : 'Add Category'}
        </Button>
        {editCategory && (
          <Button type="button" onClick={() => setEditCategory(null)} variant="outline" className="ml-2">
            Cancel Edit
          </Button>
        )}
      </form>

      {/* Category List */}
      {categories.length === 0 ? (
        <p className="text-gray-500">No categories found. Add one above!</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{category.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{category.slug}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{category.description || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {category.imageUrl ? (
                      <img
                        src={`http://localhost:5000${category.imageUrl}`}
                        alt={category.name}
                        className="h-16 object-cover"
                        onError={(e) => (e.target.src = '/placeholder-category.png')}
                      />
                    ) : (
                      'No Image'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit"
                      >
                        <FiEdit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <FiTrash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;