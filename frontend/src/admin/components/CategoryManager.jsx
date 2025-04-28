import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { categoryService } from '../../services/categoryAPI';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiImage } from 'react-icons/fi';
import Button from '../../components/core/Button';
import Input from '../../components/core/Input';
import CategorySelector from '../../admin/pages/CategorySelector';
import ImagePreview from '../../components/core/ImagePreview';

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [editCategory, setEditCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      parentCategories: [],
    },
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isImageRemoved, setIsImageRemoved] = useState(false);

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
      // Validate image
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Only JPEG, PNG, and WebP images are allowed');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error('Image size must be less than 5MB');
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setIsImageRemoved(false);
    }
  };

  // Clear image
  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
    setIsImageRemoved(true);
  };

  // Generate slug from name
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Watch name changes to auto-generate slug
  const nameValue = watch('name');
  useEffect(() => {
    if (nameValue && !editCategory) {
      setValue('slug', generateSlug(nameValue));
    }
  }, [nameValue, setValue, editCategory]);

  // Handle form submission
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('slug', data.slug);
      if (data.description) formData.append('description', data.description);
      
      // Handle parent categories
      data.parentCategories.forEach(parent => {
        formData.append('parentId', parent._id);
      });

      // Handle image
      if (imageFile) {
        formData.append('image', imageFile);
      } else if (isImageRemoved && editCategory?.image) {
        formData.append('removeImage', 'true');
      }

      let response;
      if (editCategory) {
        response = await categoryService.updateCategory(editCategory._id, formData);
      } else {
        response = await categoryService.createCategory(formData);
      }

      if (response.success) {
        toast.success(response.message);
        await fetchCategories();
        resetForm();
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    reset();
    setImageFile(null);
    setImagePreview('');
    setEditCategory(null);
    setIsImageRemoved(false);
  };

  // Handle edit category
  const handleEditCategory = useCallback((category) => {
    setEditCategory(category);
    setValue('name', category.name);
    setValue('slug', category.slug);
    setValue('description', category.description || '');
    setValue('parentCategories', category.parentId ? [{ _id: category.parentId }] : []);
    setImageFile(null);
    setImagePreview(category.image || '');
    setIsImageRemoved(false);
  }, [setValue]);

  // Handle delete category
  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        const response = await categoryService.deleteCategory(id);
        if (response.success) {
          setCategories(prev => prev.filter(cat => cat._id !== id));
          toast.success(response.message);
          if (editCategory?._id === id) {
            resetForm();
          }
        } else {
          throw new Error(response.message);
        }
      } catch (err) {
        toast.error(err.message || 'Failed to delete category');
      }
    }
  };

  // Memoized categories excluding current edit category and its children
  const availableParentCategories = useMemo(() => {
    if (!editCategory) return categories;
    
    // Filter out current category and its descendants
    const filterOutDescendants = (categoryId, allCategories) => {
      const descendants = new Set();
      const queue = [categoryId];
      
      while (queue.length > 0) {
        const currentId = queue.pop();
        const children = allCategories.filter(cat => cat.parentId === currentId);
        
        children.forEach(child => {
          descendants.add(child._id);
          queue.push(child._id);
        });
      }
      
      return descendants;
    };
    
    const descendants = filterOutDescendants(editCategory._id, categories);
    return categories.filter(cat => 
      cat._id !== editCategory._id && !descendants.has(cat._id)
    );
  }, [categories, editCategory]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
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
      <form onSubmit={handleSubmit(onSubmit)} className="mb-8 bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
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

            <Input
              label="URL Slug*"
              {...register('slug', {
                required: 'Slug is required',
                pattern: {
                  value: /^[a-z0-9-]+$/,
                  message: 'Slug can only contain lowercase letters, numbers, and hyphens',
                },
              })}
              placeholder="Enter URL slug"
            />
            {errors.slug && (
              <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
            )}

            <Input
              label="Description (Optional)"
              {...register('description', {
                maxLength: { value: 500, message: 'Description cannot exceed 500 characters' },
              })}
              as="textarea"
              rows={3}
              placeholder="Enter category description"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent Category (Optional)
              </label>
              <CategorySelector
                selected={watch('parentCategories') || []}
                onChange={handleParentCategoriesChange}
                categories={availableParentCategories}
                placeholder="Select parent category..."
                maxSelections={1} // Only allow one parent
                showImages={true}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Image (Optional)
              </label>
              <div className="mt-1 flex items-center">
                <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                  <FiImage className="inline mr-2" />
                  {imageFile ? 'Change Image' : 'Upload Image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                {(imagePreview || (editCategory?.image && !isImageRemoved)) && (
                  <button
                    type="button"
                    onClick={clearImage}
                    className="ml-2 p-1 text-red-600 hover:text-red-800"
                    title="Remove image"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Recommended size: 600x400px (Max 5MB)
              </p>

              {(imagePreview || (editCategory?.image && !isImageRemoved)) && (
                <div className="mt-3">
                  <ImagePreview 
                    src={imagePreview || editCategory?.image} 
                    alt="Category preview"
                    className="h-40 w-full object-contain border rounded"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex space-x-3">
          <Button 
            type="submit" 
            isLoading={isSubmitting}
            className="flex items-center"
          >
            {editCategory ? (
              <>
                <FiEdit2 className="mr-2" /> Update Category
              </>
            ) : (
              <>
                <FiPlus className="mr-2" /> Add Category
              </>
            )}
          </Button>
          {editCategory && (
            <Button 
              type="button" 
              onClick={resetForm}
              variant="outline"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Category List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No categories found. Add one above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parent
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {category.image && (
                          <div className="flex-shrink-0 h-10 w-10 mr-3">
                            <img
                              className="h-10 w-10 rounded object-cover"
                              src={category.image}
                              alt={category.name}
                              onError={(e) => {
                                e.target.src = '/placeholder-category.png';
                              }}
                            />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{category.name}</div>
                          <div className="text-sm text-gray-500">{category.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {category.parentId ? (
                          categories.find(c => c._id === category.parentId)?.name || 'N/A'
                        ) : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 line-clamp-2">
                        {category.description || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="text-blue-600 hover:text-blue-900"
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
    </div>
  );
};

export default CategoryManager;