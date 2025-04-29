import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiImage } from 'react-icons/fi';

// Core components
import Button from '../../components/core/Button';
import Input from '../../components/core/Input';
import CategorySelector from '../../admin/pages/CategorySelector';
import ImagePreview from '../../components/core/ImagePreview';

// API services
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../services/categoryService';


const CategoryManager = () => {
  // ===== STATE MANAGEMENT =====
  const [categories, setCategories] = useState([]);
  const [editCategory, setEditCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Image handling states
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isImageRemoved, setIsImageRemoved] = useState(false);

  // ===== FORM HANDLING =====
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
      parentId: null,
    },
  });

  /**
   * Fetches all categories from the API (admin view)
   */
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCategories({ isPublic: false }); // Fetch admin categories
      console.log('Fetched categories:', response); // Debug log
      setCategories(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Fetch categories error:', err);
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load categories on component mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

 
  const handleParentCategoryChange = useCallback((selectedParents) => {
    setValue('parentId', selectedParents[0]?._id || null);
  }, [setValue]);


  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Only JPEG, PNG, and WebP images are allowed');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setIsImageRemoved(false);
    }
  };

  /**
   * Clears the selected image
   */
  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
    setIsImageRemoved(true);
  };

 
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Auto-generate slug from name for new categories
  const nameValue = watch('name');
  useEffect(() => {
    if (nameValue && !editCategory) {
      setValue('slug', generateSlug(nameValue));
    }
  }, [nameValue, setValue, editCategory]);


  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const categoryData = {
        name: data.name,
        slug: data.slug,
        description: data.description || undefined,
        parentId: data.parentId || undefined,
        image: imageFile || undefined,
      };
      if (isImageRemoved && editCategory?.image) {
        categoryData.removeImage = 'true';
      }

      console.log('Submitting category data:', categoryData); // Debug log

      if (editCategory) {
        await updateCategory(editCategory._id, categoryData);
        toast.success('Category updated successfully');
      } else {
        await createCategory(categoryData);
        toast.success('Category created successfully');
      }

      await fetchCategories(); // Refresh categories
      resetForm();
    } catch (err) {
      console.error('Submit error:', err);
      const errorMessage = err.response?.data?.errors
        ? err.response.data.errors.map(e => e.msg).join(', ')
        : err.response?.data?.message || err.message || 'Failed to save category';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

 
  const resetForm = () => {
    reset({
      name: '',
      slug: '',
      description: '',
      parentId: null,
    });
    setImageFile(null);
    setImagePreview('');
    setEditCategory(null);
    setIsImageRemoved(false);
  };

  /**
   * Loads a category into the form for editing
   * @param {Object} category - The category to edit
   */
  const handleEditCategory = useCallback((category) => {
    setEditCategory(category);
    setValue('name', category.name);
    setValue('slug', category.slug);
    setValue('description', category.description || '');
    setValue('parentId', category.parentId || null);
    setImageFile(null);
    setImagePreview(category.image || '');
    setIsImageRemoved(false);
  }, [setValue]);


  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory(id);
        toast.success('Category deleted successfully');
        await fetchCategories(); // Refresh categories
        if (editCategory?._id === id) {
          resetForm();
        }
      } catch (err) {
        console.error('Delete error:', err);
        toast.error(err.message || 'Failed to delete category');
      }
    }
  };

  
  const availableParentCategories = useMemo(() => {
    if (!editCategory) return categories;
    
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

  // ===== RENDER LOADING AND ERROR STATES =====
  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
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

  // ===== MAIN COMPONENT RENDER =====
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Category Management</h1>

      {/* Category Form Section */}
      <form onSubmit={handleSubmit(onSubmit)} className="mb-8 bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Basic Info */}
          <div className="space-y-4">
            <Input
              label="Category Name*"
              {...register('name', {
                required: 'Name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
                maxLength: { value: 50, message: 'Name cannot exceed 50 characters' },
              })}
              error={errors.name?.message}
              placeholder="Enter category name"
            />

            <Input
              label="URL Slug*"
              {...register('slug', {
                required: 'Slug is required',
                pattern: {
                  value: /^[a-z0-9-]+$/,
                  message: 'Slug can only contain lowercase letters, numbers, and hyphens',
                },
              })}
              error={errors.slug?.message}
              placeholder="Enter URL slug"
            />

            <Input
              label="Description (Optional)"
              {...register('description', {
                maxLength: { value: 500, message: 'Description cannot exceed 500 characters' },
              })}
              as="textarea"
              rows={3}
              placeholder="Enter category description"
              error={errors.description?.message}
            />
          </div>

          {/* Right Column - Parent and Image */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent Category (Optional)
              </label>
              <CategorySelector
                selected={categories.filter(c => c._id === watch('parentId'))}
                onChange={handleParentCategoryChange}
                categories={availableParentCategories}
                placeholder="Select parent category..."
                maxSelections={1}
                showImages
              />
            </div>

            {/* Image Upload Section */}
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
                    accept="image/jpeg,image/png,image/webp"
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

        {/* Form Buttons */}
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

      {/* Category List Section */}
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
                        {category.parentId 
                          ? categories.find(c => c._id === category.parentId)?.name || 'N/A'
                          : '—'}
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