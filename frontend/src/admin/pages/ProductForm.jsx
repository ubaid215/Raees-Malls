/* eslint-disable no-unused-vars */
import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { productService } from '../../services/productAPI';
import { categoryService } from '../../services/categoryAPI';
import { socketService } from '../../services/socketService';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';

const ProductForm = React.memo(({ product = null }) => {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState(product?.images || []);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [specifications, setSpecifications] = useState(
    product?.specifications || [{ key: '', value: '' }]
  );
  const [variants, setVariants] = useState(
    product?.variants || [{ sku: '', price: '', discountPrice: '', stock: '', attributes: [{ key: 'size', value: '' }], images: [], newImageFiles: [] }]
  );
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    defaultValues: product
      ? {
          title: product.title,
          description: product.description,
          price: product.price,
          discountPrice: product.discountPrice || '',
          categoryId: product.categoryId?._id || product.categoryId || '',
          brand: product.brand || '',
          stock: product.stock,
          sku: product.sku,
          seo: {
            title: product.seo?.title || '',
            description: product.seo?.description || '',
            slug: product.seo?.slug || '',
          },
        }
      : {
          title: '',
          description: '',
          price: '',
          discountPrice: '',
          categoryId: '',
          brand: '',
          stock: '',
          sku: '',
          seo: {
            title: '',
            description: '',
            slug: '',
          },
        },
  });

  const watchedPrice = watch('price');
  const watchedCategoryId = watch('categoryId');

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryService.getAllCategories();
        if (response.success) {
          setCategories(response.data);
        } else {
          setCategoryError(response.message || 'Failed to fetch categories');
          toast.error(response.message || 'Failed to fetch categories');
        }
      } catch (error) {
        setCategoryError(error.message || 'Failed to fetch categories');
        toast.error(error.message || 'Failed to fetch categories');
      }
    };
    fetchCategories();
  }, []);

  // Handle form submission
  const onSubmit = async (data) => {
    if (!admin) {
      toast.error('You must be logged in as an admin');
      navigate('/admin/login');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();

      // Append basic fields
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('price', data.price);
      if (data.discountPrice) formData.append('discountPrice', data.discountPrice);
      formData.append('categoryId', data.categoryId);
      if (data.brand) formData.append('brand', data.brand);
      formData.append('stock', data.stock);
      formData.append('sku', data.sku);

      // Append SEO fields
      if (data.seo.title) formData.append('seo.title', data.seo.title);
      if (data.seo.description) formData.append('seo.description', data.seo.description);
      if (data.seo.slug) formData.append('seo.slug', data.seo.slug);

      // Append specifications
      const validSpecs = specifications.filter(spec => spec.key.trim() && spec.value.trim());
      if (validSpecs.length > 0) {
        formData.append('specifications', JSON.stringify(validSpecs));
      }

      // Append base product images
      newImageFiles.forEach(file => {
        formData.append('images', file);
      });

      // Append variants
      const validVariants = variants.filter(v => 
        v.sku.trim() && v.price && v.stock && 
        v.attributes.every(attr => attr.key && attr.value.trim())
      );
      if (validVariants.length > 0) {
        validVariants.forEach((variant, index) => {
          formData.append(`variants[${index}][sku]`, variant.sku);
          formData.append(`variants[${index}][price]`, variant.price);
          if (variant.discountPrice) formData.append(`variants[${index}][discountPrice]`, variant.discountPrice);
          formData.append(`variants[${index}][stock]`, variant.stock);
          formData.append(`variants[${index}][attributes]`, JSON.stringify(variant.attributes));
          variant.newImageFiles?.forEach(file => {
            formData.append(`variants[${index}][images]`, file);
          });
        });
      }

      let response;
      if (product) {
        response = await productService.updateProduct(product._id, formData);
        toast.success(response.message || 'Product updated successfully');
      } else {
        response = await productService.createProduct(formData);
        toast.success(response.message || 'Product created successfully');
        socketService.emit('productAdded', response.data);
      }

      if (response.success) {
        navigate('/admin/inventory');
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle base product image selection
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const validFormats = ['image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    const validFiles = files.filter(file => {
      if (!validFormats.includes(file.type)) {
        toast.error(`${file.name} is not a valid image (JPEG/PNG only)`);
        return false;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} exceeds 5MB limit`);
        return false;
      }
      return true;
    });

    if (images.length + newImageFiles.length + validFiles.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setNewImageFiles(prev => [...prev, ...validFiles]);
  };

  // Remove base product image
  const removeExistingImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle variant image selection
  const handleVariantImageChange = (variantIndex, e) => {
    const files = Array.from(e.target.files);
    const validFormats = ['image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    const validFiles = files.filter(file => {
      if (!validFormats.includes(file.type)) {
        toast.error(`${file.name} is not a valid image (JPEG/PNG only)`);
        return false;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} exceeds 5MB limit`);
        return false;
      }
      return true;
    });

    setVariants(prev => prev.map((v, i) => {
      if (i !== variantIndex) return v;
      const totalImages = (v.images?.length || 0) + (v.newImageFiles?.length || 0) + validFiles.length;
      if (totalImages > 5) {
        toast.error('Maximum 5 images allowed per variant');
        return v;
      }
      return { ...v, newImageFiles: [...(v.newImageFiles || []), ...validFiles] };
    }));
  };

  // Remove variant image
  const removeVariantExistingImage = (variantIndex, imageIndex) => {
    setVariants(prev => prev.map((v, i) => {
      if (i !== variantIndex) return v;
      return { ...v, images: v.images.filter((_, idx) => idx !== imageIndex) };
    }));
  };

  const removeVariantNewImage = (variantIndex, imageIndex) => {
    setVariants(prev => prev.map((v, i) => {
      if (i !== variantIndex) return v;
      return { ...v, newImageFiles: v.newImageFiles.filter((_, idx) => idx !== imageIndex) };
    }));
  };

  // Add specification
  const addSpecification = () => {
    setSpecifications(prev => [...prev, { key: '', value: '' }]);
  };

  // Remove specification
  const removeSpecification = (index) => {
    setSpecifications(prev => prev.filter((_, i) => i !== index));
  };

  // Update specification
  const updateSpecification = (index, field, value) => {
    setSpecifications(prev =>
      prev.map((spec, i) => (i === index ? { ...spec, [field]: value } : spec))
    );
  };

  // Add variant
  const addVariant = () => {
    setVariants(prev => [
      ...prev,
      { sku: '', price: '', discountPrice: '', stock: '', attributes: [{ key: 'size', value: '' }], images: [], newImageFiles: [] }
    ]);
  };

  // Remove variant
  const removeVariant = (index) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  // Update variant field
  const updateVariant = (index, field, value) => {
    setVariants(prev =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  // Add variant attribute
  const addVariantAttribute = (variantIndex) => {
    setVariants(prev => prev.map((v, i) => {
      if (i !== variantIndex) return v;
      return { ...v, attributes: [...v.attributes, { key: 'size', value: '' }] };
    }));
  };

  // Remove variant attribute
  const removeVariantAttribute = (variantIndex, attrIndex) => {
    setVariants(prev => prev.map((v, i) => {
      if (i !== variantIndex) return v;
      return { ...v, attributes: v.attributes.filter((_, idx) => idx !== attrIndex) };
    }));
  };

  // Update variant attribute
  const updateVariantAttribute = (variantIndex, attrIndex, field, value) => {
    setVariants(prev => prev.map((v, i) => {
      if (i !== variantIndex) return v;
      return {
        ...v,
        attributes: v.attributes.map((attr, idx) =>
          idx === attrIndex ? { ...attr, [field]: value } : attr
        ),
      };
    }));
  };

  // Memoized sections
  const ImageUploadSection = useMemo(() => (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Product Images (up to 5)</label>
      <input
        type="file"
        accept="image/jpeg,image/png"
        multiple
        onChange={handleImageChange}
        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#FFE6E8] file:text-[#E63946] hover:file:bg-[#FFF0F1]"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
        {images.map((image, index) => (
          <div key={`existing-${index}`} className="relative group">
            <img
              src={image.url.startsWith('http') ? image.url : `http://localhost:5000${image.url}`}
              alt={image.alt || 'Product image'}
              className="h-24 w-full object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => removeExistingImage(index)}
              className="absolute top-1 right-1 p-1 bg-[#E63946] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <XMarkIcon className="h-4 w-4 text-white" />
            </button>
          </div>
        ))}
        {newImageFiles.map((file, index) => (
          <div key={`new-${index}`} className="relative group">
            <img
              src={URL.createObjectURL(file)}
              alt={file.name}
              className="h-24 w-full object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => removeNewImage(index)}
              className="absolute top-1 right-1 p-1 bg-[#E63946] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <XMarkIcon className="h-4 w-4 text-white" />
            </button>
          </div>
        ))}
      </div>
    </div>
  ), [images, newImageFiles]);

  const SpecificationsSection = useMemo(() => (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Specifications</label>
      {specifications.map((spec, index) => (
        <div key={index} className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
          <input
            type="text"
            value={spec.key}
            onChange={(e) => updateSpecification(index, 'key', e.target.value)}
            placeholder="Key (e.g., Weight)"
            className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm"
          />
          <input
            type="text"
            value={spec.value}
            onChange={(e) => updateSpecification(index, 'value', e.target.value)}
            placeholder="Value (e.g., 1kg)"
            className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm"
          />
          <button
            type="button"
            onClick={() => removeSpecification(index)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#E63946] hover:bg-[#FFFFFF] hover:text-[#E63946] hover:border-[#E63946] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E63946]"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addSpecification}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#E63946] hover:bg-[#FFFFFF] hover:text-[#E63946] hover:border-[#E63946] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E63946]"
      >
        Add Specification
      </button>
    </div>
  ), [specifications]);

  const VariantsSection = useMemo(() => (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Variants</label>
      {variants.map((variant, vIndex) => (
        <div key={vIndex} className="border p-4 rounded-md space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Variant SKU*</label>
              <input
                type="text"
                value={variant.sku}
                onChange={(e) => updateVariant(vIndex, 'sku', e.target.value)}
                placeholder="SKU (e.g., TSHIRT-BLUE-M)"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Price*</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={variant.price}
                onChange={(e) => updateVariant(vIndex, 'price', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Discount Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={variant.discountPrice}
                onChange={(e) => updateVariant(vIndex, 'discountPrice', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Stock*</label>
              <input
                type="number"
                min="0"
                value={variant.stock}
                onChange={(e) => updateVariant(vIndex, 'stock', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Attributes</label>
            {variant.attributes.map((attr, aIndex) => (
              <div key={aIndex} className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                <select
                  value={attr.key}
                  onChange={(e) => updateVariantAttribute(vIndex, aIndex, 'key', e.target.value)}
                  className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm"
                >
                  <option value="size">Size</option>
                  <option value="color">Color</option>
                  <option value="material">Material</option>
                  <option value="style">Style</option>
                </select>
                <input
                  type="text"
                  value={attr.value}
                  onChange={(e) => updateVariantAttribute(vIndex, aIndex, 'value', e.target.value)}
                  placeholder="Value (e.g., Blue)"
                  className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeVariantAttribute(vIndex, aIndex)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#E63946] hover:bg-[#FFFFFF] hover:text-[#E63946] hover:border-[#E63946] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E63946]"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addVariantAttribute(vIndex)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#E63946] hover:bg-[#FFFFFF] hover:text-[#E63946] hover:border-[#E63946] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E63946]"
            >
              Add Attribute
            </button>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Variant Images (up to 5)</label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={(e) => handleVariantImageChange(vIndex, e)}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#FFE6E8] file:text-[#E63946] hover:file:bg-[#FFF0F1]"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
              {variant.images?.map((image, index) => (
                <div key={`v-existing-${index}`} className="relative group">
                  <img
                    src={image.url.startsWith('http') ? image.url : `http://localhost:5000${image.url}`}
                    alt={image.alt || 'Variant image'}
                    className="h-24 w-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariantExistingImage(vIndex, index)}
                    className="absolute top-1 right-1 p-1 bg-[#E63946] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XMarkIcon className="h-4 w-4 text-white" />
                  </button>
                </div>
              ))}
              {variant.newImageFiles?.map((file, index) => (
                <div key={`v-new-${index}`} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-24 w-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariantNewImage(vIndex, index)}
                    className="absolute top-1 right-1 p-1 bg-[#E63946] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XMarkIcon className="h-4 w-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => removeVariant(vIndex)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#E63946] hover:bg-[#FFFFFF] hover:text-[#E63946] hover:border-[#E63946] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E63946]"
          >
            Remove Variant
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addVariant}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#E63946] hover:bg-[#FFFFFF] hover:text-[#E63946] hover:border-[#E63946] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E63946]"
      >
        Add Variant
      </button>
    </div>
  ), [variants]);

  return (
    <div className="w-full min-h-screen bg-gray-100 flex items-start justify-center px-4 sm:px-6 lg:px-8 py-8">
      <div className="w-full max-w-7xl bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#E63946] mb-6">
          {product ? 'Edit Product' : 'Add New Product'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Product Title*
                </label>
                <input
                  id="title"
                  type="text"
                  {...register('title', {
                    required: 'Title is required',
                    minLength: { value: 3, message: 'Title must be at least 3 characters' },
                    maxLength: { value: 100, message: 'Title cannot exceed 100 characters' },
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm py-2 px-3"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
                  SKU*
                </label>
                <input
                  id="sku"
                  type="text"
                  {...register('sku', {
                    required: 'SKU is required',
                    minLength: { value: 5, message: 'SKU must be at least 5 characters' },
                    maxLength: { value: 20, message: 'SKU cannot exceed 20 characters' },
                    pattern: {
                      value: /^[A-Z0-9-]+$/i,
                      message: 'SKU can only contain letters, numbers, and hyphens',
                    },
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm py-2 px-3"
                />
                {errors.sku && (
                  <p className="mt-1 text-sm text-red-600">{errors.sku.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Price*
                </label>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('price', {
                    required: 'Price is required',
                    min: { value: 0, message: 'Price must be positive' },
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm py-2 px-3"
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="discountPrice" className="block text-sm font-medium text-gray-700">
                  Discount Price
                </label>
                <input
                  id="discountPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('discountPrice', {
                    min: { value: 0, message: 'Discount price must be positive' },
                    validate: value =>
                      !value ||
                      parseFloat(value) < parseFloat(watchedPrice || Infinity) ||
                      'Discount must be less than price',
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm py-2 px-3"
                />
                {errors.discountPrice && (
                  <p className="mt-1 text-sm text-red-600">{errors.discountPrice.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
                  Category*
                </label>
                <select
                  id="categoryId"
                  {...register('categoryId', { required: 'Category is required' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm py-2 px-3"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
                )}
                {categoryError && (
                  <p className="mt-1 text-sm text-red-600">{categoryError}</p>
                )}
              </div>

              <div>
                <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
                  Brand
                </label>
                <input
                  id="brand"
                  type="text"
                  {...register('brand', {
                    minLength: { value: 2, message: 'Brand must be at least 2 characters' },
                    maxLength: { value: 50, message: 'Brand cannot exceed 50 characters' },
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm py-2 px-3"
                />
                {errors.brand && (
                  <p className="mt-1 text-sm text-red-600">{errors.brand.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                  Stock*
                </label>
                <input
                  id="stock"
                  type="number"
                  min="0"
                  {...register('stock', {
                    required: 'Stock is required',
                    min: { value: 0, message: 'Stock cannot be negative' },
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm py-2 px-3"
                />
                {errors.stock && (
                  <p className="mt-1 text-sm text-red-600">{errors.stock.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description*
            </label>
            <textarea
              id="description"
              rows={6}
              {...register('description', {
                required: 'Description is required',
                minLength: { value: 10, message: 'Description must be at least 10 characters' },
                maxLength: { value: 1000, message: 'Description cannot exceed 1000 characters' },
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm py-2 px-3"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">SEO Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label htmlFor="seo.title" className="block text-sm font-medium text-gray-700">
                  SEO Title
                </label>
                <input
                  id="seo.title"
                  type="text"
                  {...register('seo.title', {
                    maxLength: { value: 60, message: 'SEO title cannot exceed 60 characters' },
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm py-2 px-3"
                />
                {errors.seo?.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.seo.title.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="seo.description" className="block text-sm font-medium text-gray-700">
                  SEO Description
                </label>
                <textarea
                  id="seo.description"
                  rows={3}
                  {...register('seo.description', {
                    maxLength: { value: 160, message: 'SEO description cannot exceed 160 characters' },
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm py-2 px-3"
                />
                {errors.seo?.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.seo.description.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="seo.slug" className="block text-sm font-medium text-gray-700">
                  SEO Slug (optional)
                </label>
                <input
                  id="seo.slug"
                  type="text"
                  {...register('seo.slug', {
                    pattern: {
                      value: /^[a-z0-9-]+$/,
                      message: 'SEO slug can only contain lowercase letters, numbers, and hyphens',
                    },
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E63946] focus:ring-[#E63946] sm:text-sm py-2 px-3"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Leave blank to auto-generate from title
                </p>
                {errors.seo?.slug && (
                  <p className="mt-1 text-sm text-red-600">{errors.seo.slug.message}</p>
                )}
              </div>
            </div>
          </div>

          {ImageUploadSection}

          {SpecificationsSection}

          {VariantsSection}

          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              type="button"
              onClick={() => navigate('/admin/inventory')}
              className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E63946]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#E63946] hover:bg-[#FFFFFF] hover:text-[#E63946] hover:border-[#E63946] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E63946] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {product ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                product ? 'Update Product' : 'Create Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default ProductForm;