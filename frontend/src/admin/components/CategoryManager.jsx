import React, { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiImage, FiChevronDown } from 'react-icons/fi';
import Button from '../../components/core/Button';
import Input from '../../components/core/Input';
import ImagePreview from '../../components/core/ImagePreview';
import { CategoryContext } from '../../context/CategoryContext';
import SocketService from '../../services/socketService';

const CategorySelector = ({ selected, onChange, categories, placeholder, maxSelections, showImages, className, dropdownClassName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Force re-render when selected prop changes
  useEffect(() => {
    console.log('CategorySelector: Selected prop changed:', selected);
  }, [selected]);

  const handleSelect = (category) => {
    console.log('CategorySelector: Selecting category:', category);
    const newSelection = selected.some((item) => item._id === category._id)
      ? selected.filter((item) => item._id !== category._id)
      : maxSelections === 1
      ? [{ _id: category._id, name: category.name, image: category.image }]
      : [...selected, { _id: category._id, name: category.name, image: category.image }].slice(0, maxSelections);
    
    console.log('CategorySelector: New selection:', newSelection);
    onChange(newSelection);
    if (maxSelections === 1) setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="w-full p-2 border border-gray-300 rounded-md bg-white text-left text-sm text-gray-700 flex items-center justify-between focus:ring-2 focus:ring-red-500 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">
          {selected.length > 0 ? selected.map((cat) => cat.name).join(', ') : placeholder}
        </span>
        <FiChevronDown className={`h-5 w-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className={`absolute mt-1 ${dropdownClassName}`}>
          {categories.map((category) => (
            <div
              key={category._id}
              className={`flex items-center p-2 cursor-pointer hover:bg-gray-100 transition-colors ${
                selected.some((s) => s._id === category._id) ? 'bg-red-50 border-l-2 border-red-500' : ''
              }`}
              onClick={() => handleSelect(category)}
            >
              {showImages && category.image && (
                <img
                  src={category.image}
                  alt={category.name}
                  className="h-6 w-6 rounded object-cover mr-2"
                  onError={(e) => (e.target.src = '/placeholder-category.png')}
                />
              )}
              <span className="text-sm">{category.name}</span>
              {selected.some((s) => s._id === category._id) && (
                <span className="ml-auto text-red-500 text-xs">✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CategoryManager = () => {
  const {
    categories,
    loading,
    error,
    fetchCategories,
    createNewCategory,
    updateExistingCategory,
    deleteExistingCategory,
  } = useContext(CategoryContext);

  const [editCategory, setEditCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isImageRemoved, setIsImageRemoved] = useState(false);
  const [selectedParentCategories, setSelectedParentCategories] = useState([]);

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

  // Detect mobile device for conditional rendering
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    console.log('CategoryManager: Fetching initial categories');
    fetchCategories({ forcePublic: false }).catch((err) => {
      console.error('Fetch categories failed:', err);
      toast.error(err.message || 'Failed to fetch categories');
    });
  }, [fetchCategories]);

  // Socket.IO listener for real-time updates
  useEffect(() => {
    console.log('CategoryManager: Setting up Socket.IO listeners');
    const handleCategoryCreated = ({ category }) => {
      console.log('CategoryManager: Received categoryCreated:', category);
      toast.success(`New category added: ${category.name}`);
    };

    const handleCategoryUpdated = ({ category }) => {
      console.log('CategoryManager: Received categoryUpdated:', category);
      toast.info(`Category updated: ${category.name}`);
    };

    const handleCategoryDeleted = ({ categoryIds }) => {
      console.log('CategoryManager: Received categoryDeleted:', categoryIds);
      toast.warn('Category deleted');
    };

    SocketService.on('categoryCreated', handleCategoryCreated);
    SocketService.on('categoryUpdated', handleCategoryUpdated);
    SocketService.on('categoryDeleted', handleCategoryDeleted);

    return () => {
      console.log('CategoryManager: Cleaning up Socket.IO listeners');
      SocketService.off('categoryCreated', handleCategoryCreated);
      SocketService.off('categoryUpdated', handleCategoryUpdated);
      SocketService.off('categoryDeleted', handleCategoryDeleted);
    };
  }, []);

  // Log categories changes for debugging
  useEffect(() => {
    console.log('CategoryManager: Categories updated:', categories.map(c => ({ _id: c._id, name: c.name })));
  }, [categories]);

  // Update selected parent categories when form parentId changes
  useEffect(() => {
    const parentId = watch('parentId');
    console.log('CategoryManager: ParentId changed:', parentId);
    
    if (parentId) {
      const parentCategory = categories.find(c => c._id === parentId);
      if (parentCategory) {
        const newSelection = [{ _id: parentCategory._id, name: parentCategory.name, image: parentCategory.image }];
        console.log('CategoryManager: Setting selected parent categories:', newSelection);
        setSelectedParentCategories(newSelection);
      }
    } else {
      console.log('CategoryManager: Clearing selected parent categories');
      setSelectedParentCategories([]);
    }
  }, [watch('parentId'), categories]);

  const handleParentCategoryChange = useCallback(
    (selectedParents) => {
      console.log('CategoryManager: Parent category changed via selector:', selectedParents);
      const parentId = selectedParents[0]?._id || null;
      setValue('parentId', parentId, { shouldDirty: true });
      setSelectedParentCategories(selectedParents);
    },
    [setValue]
  );

  const handleNativeSelectChange = (e) => {
    const parentId = e.target.value || null;
    console.log('CategoryManager: Native select changed:', parentId);
    setValue('parentId', parentId, { shouldDirty: true });
  };

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
    };

    // Handle image logic
    if (editCategory) {
      // For updates
      if (isImageRemoved) {
        // User explicitly removed the image
        categoryData.removeImage = true;
        console.log('CategoryManager: Image removal flag set');
      } else if (imageFile) {
        // User uploaded a new image
        categoryData.image = imageFile;
        console.log('CategoryManager: New image file set');
      }
      // If neither removed nor new image, don't include image fields
    } else {
      // For new categories
      if (imageFile) {
        categoryData.image = imageFile;
        console.log('CategoryManager: New category with image');
      }
    }

    console.log('CategoryManager: Category data being sent:', {
      ...categoryData,
      image: categoryData.image ? 'File object' : undefined
    });

    if (editCategory) {
      console.log('CategoryManager: Updating category:', editCategory._id, categoryData);
      await updateExistingCategory(editCategory._id, categoryData);
    } else {
      console.log('CategoryManager: Creating category:', categoryData);
      await createNewCategory(categoryData);
    }

    resetForm();
  } catch (err) {
    console.error('CategoryManager: Submit error:', err);
    const errorMessage =
      err.response?.data?.errors?.map((e) => e.msg).join(', ') ||
      err.response?.data?.message ||
      err.message ||
      'Failed to save category';
    toast.error(errorMessage);
  } finally {
    setIsSubmitting(false);
  }
};

  const resetForm = () => {
    console.log('CategoryManager: Resetting form');
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
    setSelectedParentCategories([]);
  };

  const handleEditCategory = useCallback(
    (category) => {
      console.log('CategoryManager: Editing category:', category._id, category);
      setEditCategory(category);
      setValue('name', category.name);
      setValue('slug', category.slug);
      setValue('description', category.description || '');
      setValue('parentId', category.parentId?._id || null);
      setImageFile(null);
      setImagePreview(category.image || '');
      setIsImageRemoved(false);
      
      // Set selected parent categories for the selector
      if (category.parentId) {
        setSelectedParentCategories([{
          _id: category.parentId._id,
          name: category.parentId.name,
          image: category.parentId.image
        }]);
      } else {
        setSelectedParentCategories([]);
      }
    },
    [setValue]
  );

  const handleDeleteCategory = async (id) => {
    console.log('CategoryManager: Deleting category:', id);
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteExistingCategory(id);
      } catch (err) {
        console.error('CategoryManager: Delete error:', err);
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
        const children = allCategories.filter(
          (cat) => cat.parentId?._id === currentId
        );
        children.forEach((child) => {
          descendants.add(child._id);
          queue.push(child._id);
        });
      }
      return descendants;
    };
    const descendants = filterOutDescendants(editCategory._id, categories);
    return categories.filter(
      (cat) => cat._id !== editCategory._id && !descendants.has(cat._id)
    );
  }, [categories, editCategory]);

  if (loading && categories.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error && categories.length === 0) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        <p>Error: {error}</p>
        <Button
          onClick={() => fetchCategories({ forcePublic: false })}
          variant="outline"
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Category Management
      </h1>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mb-8 bg-white rounded-lg shadow p-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              label="Category Name*"
              {...register('name', {
                required: 'Name is required',
                minLength: {
                  value: 2,
                  message: 'Name must be at least 2 characters',
                },
                maxLength: {
                  value: 50,
                  message: 'Name cannot exceed 50 characters',
                },
              })}
              error={errors.name?.message}
              placeholder="Enter category name"
              className="w-full"
            />
            <Input
              label="URL Slug*"
              {...register('slug', {
                required: 'Slug is required',
                pattern: {
                  value: /^[a-z0-9-]+$/,
                  message:
                    'Slug can only contain lowercase letters, numbers, and hyphens',
                },
              })}
              error={errors.slug?.message}
              placeholder="Enter URL slug"
              className="w-full"
            />
            <Input
              label="Description (Optional)"
              {...register('description', {
                maxLength: {
                  value: 500,
                  message: 'Description cannot exceed 500 characters',
                },
              })}
              as="textarea"
              rows={3}
              placeholder="Enter category description"
              error={errors.description?.message}
              className="w-full"
            />
          </div>
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent Category (Optional)
              </label>
              {isMobile ? (
                <select
                  {...register('parentId')}
                  onChange={handleNativeSelectChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:outline-none text-sm"
                  value={watch('parentId') || ''}
                >
                  <option value="">Select parent category...</option>
                  {availableParentCategories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              ) : (
                <CategorySelector
                  selected={selectedParentCategories}
                  onChange={handleParentCategoryChange}
                  categories={availableParentCategories}
                  placeholder="Select parent category..."
                  maxSelections={1}
                  showImages
                  className="w-full"
                  dropdownClassName="w-full max-h-60 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg z-50"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Image (Optional)
              </label>
              <div className="mt-1 flex items-center">
                <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors">
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
                    className="ml-2 p-1 text-red-600 hover:text-red-800 transition-colors"
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
        <div className="mt-6 flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0">
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="flex items-center w-full sm:w-auto"
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
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
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
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Category
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Parent
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category._id} className="hover:bg-gray-50 transition-colors">
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
                          <div className="text-sm font-medium text-gray-900">
                            {category.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {category.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {category.parentId?.name || '—'}
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
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category._id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
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