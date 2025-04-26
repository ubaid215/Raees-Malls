/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { categoryService } from '../../services/categoryAPI';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';
import Button from '../../components/core/Button';
import Input from '../../components/core/Input';
import CategorySelector from '../../admin/pages/CategorySelector';

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [editCategory, setEditCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      seo: {
        title: '',
        description: '',
        slug: '',
      },
      parentCategories: [],
    },
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await categoryService.getAllCategories();
      if (response.success) {
        setCategories(response.data);
      } else {
        throw new Error(response.message);
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

  // Handle parent categories change
  const handleParentCategoriesChange = useCallback((selectedParents) => {
    setValue('parentCategories', selectedParents);
  }, [setValue]);

  // Handle image change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Clear image
  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      if (data.seo.title) formData.append('seo.title', data.seo.title);
      if (data.seo.description) formData.append('seo.description', data.seo.description);
      if (data.seo.slug) formData.append('seo.slug', data.seo.slug);
      data.parentCategories.forEach(parent => {
        formData.append('parents', parent._id);
      });
      if (imageFile) {
        formData.append('image', imageFile);
      }

      let response;
      if (editCategory) {
        response = await categoryService.updateCategory(editCategory._id, formData);
        if (response.success) {
          setCategories(prev =>
            prev.map(cat => (cat._id === editCategory._id ? response.data : cat))
          );
          toast.success(response.message);
        }
      } else {
        response = await categoryService.createCategory(formData);
        if (response.success) {
          setCategories(prev => [...prev, response.data]);
          toast.success(response.message);
        }
      }

      if (response.success) {
        reset();
        setImageFile(null);
        setImagePreview('');
        setEditCategory(null);
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save category');
    }
  };

  // Handle edit category
  const handleEditCategory = useCallback((category) => {
    setEditCategory(category);
    setValue('name', category.name);
    setValue('description', category.description || '');
    setValue('seo.title', category.seo?.title || '');
    setValue('seo.description', category.seo?.description || '');
    setValue('seo.slug', category.seo?.slug || '');
    setValue('parentCategories', category.parents || []);
    setImageFile(null);
    setImagePreview(category.image?.url || '');
  }, [setValue]);

  // Handle delete category
  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        const response = await categoryService.deleteCategory(id);
        if (response.success) {
          setCategories(prev => prev.filter(cat => cat._id !== id));
          toast.success(response.message);
        } else {
          throw new Error(response.message);
        }
      } catch (err) {
        toast.error(err.message || 'Failed to delete category');
      }
    }
  };

  // Memoized image preview section
  const ImagePreviewSection = useMemo(() => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Category Image (Optional)</label>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="w-full p-2 border rounded"
      />
      {imagePreview && (
        <div className="mt-2 relative">
          <img
            src={imagePreview}
            alt="Preview"
            className="h-32 object-contain border rounded"
          />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white"
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  ), [imagePreview]);

  if (loading) {
    return <div className="p-4 text-gray-600">Loading categories...</div>;
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
      <form onSubmit={handleSubmit(onSubmit)} className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              label="Category Name*"
              {...register('name', {
                required: 'Name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
                maxLength: { value: 100, message: 'Name cannot exceed 100 characters' },
              })}
              placeholder="Enter category name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
          <div>
            <Input
              label="Description (Optional)"
              {...register('description', {
                minLength: { value: 10, message: 'Description must be at least 10 characters' },
                maxLength: { value: 1000, message: 'Description cannot exceed 1000 characters' },
              })}
              as="textarea"
              rows={2}
              placeholder="Enter category description"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Categories (Optional)</label>
            <CategorySelector
              selected={editCategory?.parents || []}
              onChange={handleParentCategoriesChange}
              categories={categories.filter(cat => !editCategory || cat._id !== editCategory._id)}
              placeholder="Select parent categories..."
              maxSelections={3}
            />
            {errors.parentCategories && (
              <p className="mt-1 text-sm text-red-600">{errors.parentCategories.message}</p>
            )}
          </div>
          <div>
            <Input
              label="SEO Title (Optional)"
              {...register('seo.title', {
                maxLength: { value: 60, message: 'SEO title cannot exceed 60 characters' },
              })}
              placeholder="Enter SEO title"
            />
            {errors.seo?.title && (
              <p className="mt-1 text-sm text-red-600">{errors.seo.title.message}</p>
            )}
          </div>
          <div>
            <Input
              label="SEO Description (Optional)"
              {...register('seo.description', {
                maxLength: { value: 160, message: 'SEO description cannot exceed 160 characters' },
              })}
              as="textarea"
              rows={2}
              placeholder="Enter SEO description"
            />
            {errors.seo?.description && (
              <p className="mt-1 text-sm text-red-600">{errors.seo.description.message}</p>
            )}
          </div>
          <div>
            <Input
              label="SEO Slug (Optional)"
              {...register('seo.slug', {
                pattern: {
                  value: /^[a-z0-9-]+$/,
                  message: 'SEO slug can only contain lowercase letters, numbers, and hyphens',
                },
              })}
              placeholder="Enter SEO slug"
            />
            {errors.seo?.slug && (
              <p className="mt-1 text-sm text-red-600">{errors.seo.slug.message}</p>
            )}
          </div>
          {ImagePreviewSection}
        </div>
        <div className="flex space-x-2">
          <Button type="submit" className="flex items-center">
            <FiPlus className="mr-2" /> {editCategory ? 'Update Category' : 'Add Category'}
          </Button>
          {editCategory && (
            <Button type="button" onClick={() => {
              reset();
              setImageFile(null);
              setImagePreview('');
              setEditCategory(null);
            }} variant="outline">
              Cancel Edit
            </Button>
          )}
        </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parents</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{category.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category.parents?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {category.parents.map(parent => (
                          <span key={parent._id} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                            {parent.name}
                          </span>
                        ))}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{category.description || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {category.image?.url ? (
                      <img
                        src={category.image.url}
                        alt={category.image.alt || category.name}
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