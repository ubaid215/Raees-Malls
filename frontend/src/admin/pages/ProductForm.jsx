import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { getCategories } from '../../services/categoryService';
import Button from '../../components/core/Button';
import Input from '../../components/core/Input';
import Textarea from '../../components/core/TextArea';
import Select from '../../components/core/Select';
import LoadingSpinner from '../../components/core/LoadingSpinner';
import imageCompression from 'browser-image-compression';

const ProductForm = ({
  product = null,
  onSubmit,
  loading = false,
  isEditMode = false,
  skuOptional = false
}) => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      title: product?.title || '',
      description: product?.description || '',
      price: product?.price || 0,
      discountPrice: product?.discountPrice || undefined,
      shippingCost: product?.shippingCost || 0,
      categoryId: product?.categoryId?._id || product?.categoryId || '',
      brand: product?.brand || '',
      stock: product?.stock || 0,
      sku: product?.sku || '',
      color: product?.color?.name || '',
      seo: {
        title: product?.seo?.title || '',
        description: product?.seo?.description || ''
      },
      specifications: product?.specifications || [],
      features: product?.features || [],
      variants: product?.variants || [],
      isFeatured: product?.isFeatured || false
    }
  });

  const [existingImages, setExistingImages] = useState(product?.images || []);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [existingVideos, setExistingVideos] = useState(product?.videos || []);
  const [newVideoFiles, setNewVideoFiles] = useState([]);
  const [specifications, setSpecifications] = useState(product?.specifications || []);
  const [features, setFeatures] = useState(product?.features || []);
  const [variants, setVariants] = useState(
    product?.variants?.map(v => ({
      ...v,
      newImageFiles: [],
      newVideoFiles: [],
      specifications: Array.isArray(v.specifications) ? v.specifications : [],
      color: v.color?.name || ''
    })) || []
  );
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [currentStage, setCurrentStage] = useState('');

  const skuValidation = skuOptional ? {
    pattern: {
      value: /^[A-Z0-9-]*$/i,
      message: "SKU can only contain letters, numbers, and hyphens"
    },
    maxLength: { value: 20, message: "SKU cannot exceed 20 characters" }
  } : {
    pattern: {
      value: /^[A-Z0-9-]+$/i,
      message: "SKU can only contain letters, numbers, and hyphens"
    },
    minLength: { value: 5, message: "SKU must be at least 5 characters" },
    maxLength: { value: 20, message: "SKU cannot exceed 20 characters" }
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categories = await getCategories();
        setCategories(categories);
      } catch (error) {
        toast.error('Failed to load categories');
        console.error('Error loading categories:', error);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    setCurrentStage('Compressing images...');

    for (const file of files) {
      try {
        if (!file.type.startsWith('image/')) {
          toast.error(`Invalid file type: ${file.name}. Only JPEG and PNG allowed.`);
          continue;
        }

        const compressedFile = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
          fileType: file.type,
        });

        if (compressedFile.size > 5 * 1024 * 1024) {
          toast.error(`File still too large after compression: ${file.name}`);
          setCurrentStage('');
          continue;
        }

        const fileExtension = file.name.split('.').pop().toLowerCase();
        const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
        const fileName = `${file.name.split('.')[0]}-compressed.${fileExtension}`;
        const correctedFile = new File([compressedFile], fileName, { type: mimeType });

        validFiles.push(correctedFile);
      } catch (error) {
        console.error('Compression error:', error);
        toast.error(`Failed to process file: ${file.name}`);
      }
    }

    if (existingImages.length + newImageFiles.length + validFiles.length > 10) {
      toast.error('Maximum 10 images allowed');
      setCurrentStage('');
      return;
    }

    setNewImageFiles(prev => [...prev, ...validFiles]);
    setCurrentStage('');
  };

  const handleVideoChange = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];

    for (const file of files) {
      if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}. Use MP4, WebM, or MOV.`);
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File too large: ${file.name}. Max 50MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (existingVideos.length + newVideoFiles.length + validFiles.length > 3) {
      toast.error('Maximum 3 videos allowed');
      return;
    }

    setNewVideoFiles(prev => [...prev, ...validFiles]);
  };

  const handleVariantImageChange = async (variantIndex, e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    setCurrentStage('Compressing variant images...');

    for (const file of files) {
      try {
        if (!file.type.startsWith('image/')) {
          toast.error(`Invalid file type: ${file.name}. Only JPEG and PNG allowed.`);
          continue;
        }

        const compressedFile = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
          fileType: file.type,
        });

        if (compressedFile.size > 5 * 1024 * 1024) {
          toast.error(`File still too large after compression: ${file.name}`);
          continue;
        }

        const fileExtension = file.name.split('.').pop().toLowerCase();
        const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
        const fileName = `${file.name.split('.')[0]}-compressed.${fileExtension}`;
        const correctedFile = new File([compressedFile], fileName, { type: mimeType });

        validFiles.push(correctedFile);
      } catch (error) {
        console.error('Compression error:', error);
        toast.error(`Failed to process file: ${file.name}`);
      }
    }

    const maxImages = variantIndex < 2 ? 15 : 5;
    const currentImages = variants[variantIndex].images?.length || 0;
    const currentNewImages = variants[variantIndex].newImageFiles?.length || 0;

    if (currentImages + currentNewImages + validFiles.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed for this variant`);
      setCurrentStage('');
      return;
    }

    setVariants(prev =>
      prev.map((v, i) =>
        i === variantIndex
          ? { ...v, newImageFiles: [...(v.newImageFiles || []), ...validFiles] }
          : v
      )
    );
    setCurrentStage('');
  };

  const handleVariantVideoChange = async (variantIndex, e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];

    for (const file of files) {
      if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}. Use MP4, WebM, or MOV.`);
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File too large: ${file.name}. Max 50MB.`);
        continue;
      }
      validFiles.push(file);
    }

    const maxVideos = 3;
    const currentVideos = variants[variantIndex].videos?.length || 0;
    const currentNewVideos = variants[variantIndex].newVideoFiles?.length || 0;

    if (currentVideos + currentNewVideos + validFiles.length > maxVideos) {
      toast.error(`Maximum ${maxVideos} videos allowed for this variant`);
      return;
    }

    setVariants(prev =>
      prev.map((v, i) =>
        i === variantIndex
          ? { ...v, newVideoFiles: [...(v.newVideoFiles || []), ...validFiles] }
          : v
      )
    );
  };

  const handleRemoveImage = (index, isNew = false) => {
    if (isNew) {
      setNewImageFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setExistingImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleRemoveVideo = (index, isNew = false) => {
    if (isNew) {
      setNewVideoFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setExistingVideos(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleRemoveVariantImage = (variantIndex, imageIndex, isNew = false) => {
    setVariants(prev =>
      prev.map((v, i) => {
        if (i !== variantIndex) return v;
        if (isNew) {
          return {
            ...v,
            newImageFiles: v.newImageFiles.filter((_, idx) => idx !== imageIndex)
          };
        }
        return {
          ...v,
          images: v.images.filter((_, idx) => idx !== imageIndex)
        };
      })
    );
  };

  const handleRemoveVariantVideo = (variantIndex, videoIndex, isNew = false) => {
    setVariants(prev =>
      prev.map((v, i) => {
        if (i !== variantIndex) return v;
        if (isNew) {
          return {
            ...v,
            newVideoFiles: v.newVideoFiles.filter((_, idx) => idx !== videoIndex)
          };
        }
        return {
          ...v,
          videos: v.videos.filter((_, idx) => idx !== videoIndex)
        };
      })
    );
  };

  const handleAddSpecification = () => {
    setSpecifications(prev => [...prev, { key: '', value: '' }]);
  };

  const handleSpecificationChange = (index, field, value) => {
    setSpecifications(prev =>
      prev.map((spec, i) =>
        i === index ? { ...spec, [field]: value } : spec
      )
    );
  };

  const handleRemoveSpecification = (index) => {
    setSpecifications(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddVariantSpecification = (variantIndex) => {
    setVariants(prev =>
      prev.map((v, i) =>
        i === variantIndex
          ? {
              ...v,
              specifications: [...(v.specifications || []), { key: '', value: '' }]
            }
          : v
      )
    );
  };

  const handleVariantSpecificationChange = (variantIndex, specIndex, field, value) => {
    setVariants(prev =>
      prev.map((v, i) =>
        i === variantIndex
          ? {
              ...v,
              specifications: v.specifications.map((spec, idx) =>
                idx === specIndex ? { ...spec, [field]: value } : spec
              )
            }
          : v
      )
    );
  };

  const handleRemoveVariantSpecification = (variantIndex, specIndex) => {
    setVariants(prev =>
      prev.map((v, i) =>
        i === variantIndex
          ? {
              ...v,
              specifications: v.specifications.filter((_, idx) => idx !== specIndex)
            }
          : v
      )
    );
  };

  const handleAddFeature = () => {
    if (features.length >= 10) {
      toast.error('Maximum 10 features allowed');
      return;
    }
    setFeatures(prev => [...prev, '']);
  };

  const handleFeatureChange = (index, value) => {
    setFeatures(prev =>
      prev.map((f, i) => (i === index ? value : f))
    );
  };

  const handleRemoveFeature = (index) => {
    setFeatures(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddVariant = () => {
    if (variants.length >= 3) {
      toast.error('Maximum 3 variants allowed');
      return;
    }
    setVariants(prev => [
      ...prev,
      {
        sku: '',
        price: 0,
        discountPrice: undefined,
        stock: 0,
        color: '',
        attributes: [{ key: '', value: '' }],
        images: [],
        videos: [],
        specifications: [],
        newImageFiles: [],
        newVideoFiles: []
      }
    ]);
  };

  const handleVariantChange = (index, field, value) => {
    setVariants(prev =>
      prev.map((v, i) => {
        if (i !== index) return v;
        const updatedVariant = { ...v, [field]: value };
        if (field === 'discountPrice' || field === 'price') {
          const price = parseFloat(updatedVariant.price) || 0;
          const discountPrice = parseFloat(updatedVariant.discountPrice) || 0;
          if (discountPrice && discountPrice >= price) {
            toast.error(`Variant ${i + 1}: Discount price must be less than the price`);
          }
        }
        if (field === 'stock') {
          const stock = parseInt(value) || 0;
          if (stock < 0) {
            toast.error(`Variant ${i + 1}: Stock must be a positive integer`);
            updatedVariant.stock = 0;
          }
        }
        if (field === 'color') {
          if (value.length > 50) {
            toast.error(`Variant ${i + 1}: Color name cannot exceed 50 characters`);
            updatedVariant.color = value.slice(0, 50);
          }
        }
        return updatedVariant;
      })
    );
  };

  const handleAddAttribute = (variantIndex) => {
    setVariants(prev =>
      prev.map((v, i) =>
        i === variantIndex
          ? { ...v, attributes: [...v.attributes, { key: '', value: '' }] }
          : v
      )
    );
  };

  const handleAttributeChange = (variantIndex, attrIndex, field, value) => {
    setVariants(prev =>
      prev.map((v, i) =>
        i === variantIndex
          ? {
              ...v,
              attributes: v.attributes.map((attr, idx) =>
                idx === attrIndex ? { ...attr, [field]: value } : attr
              )
            }
          : v
      )
    );
  };

  const handleRemoveAttribute = (variantIndex, attrIndex) => {
    setVariants(prev =>
      prev.map((v, i) =>
        i === variantIndex
          ? { ...v, attributes: v.attributes.filter((_, idx) => idx !== attrIndex) }
          : v
      )
    );
  };

  const handleRemoveVariant = (index) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmitHandler = async (data) => {
    if (!newImageFiles.length && !existingImages.length) {
      toast.error('At least one product image is required');
      return;
    }

    if (data.color && data.color.length > 50) {
      toast.error('Base product color name cannot exceed 50 characters');
      return;
    }

    for (let i = 0; i < features.length; i++) {
      const feature = features[i].trim();
      if (feature && (feature.length < 1 || feature.length > 200)) {
        toast.error(`Feature ${i + 1}: Must be between 1 and 200 characters`);
        return;
      }
    }

    for (let i = 0; i < specifications.length; i++) {
      const spec = specifications[i];
      if (spec.key.trim() && !spec.value.trim()) {
        toast.error(`Specification ${i + 1}: Value is required when key is provided`);
        return;
      }
      if (!spec.key.trim() && spec.value.trim()) {
        toast.error(`Specification ${i + 1}: Key is required ketika value is provided`);
        return;
      }
    }

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      const price = parseFloat(variant.price) || 0;
      const discountPrice = parseFloat(variant.discountPrice) || 0;
      const stock = parseInt(variant.stock) || 0;

      if (variant.color && variant.color.length > 50) {
        toast.error(`Variant ${i + 1}: Color name cannot exceed 50 characters`);
        return;
      }

      if (discountPrice && discountPrice >= price) {
        toast.error(`Variant ${i + 1}: Discount price must be less than the price`);
        return;
      }
      if (stock < 0) {
        toast.error(`Variant ${i + 1}: Stock must be a positive integer`);
        return;
      }
      if (!variant.attributes || variant.attributes.length === 0) {
        toast.error(`Variant ${i + 1}: At least one attribute is required`);
        return;
      }
      for (let j = 0; j < variant.attributes.length; j++) {
        const attr = variant.attributes[j];
        if (!attr.key.trim() || !attr.value.trim()) {
          toast.error(`Variant ${i + 1}, Attribute ${j + 1}: Both key and value are required`);
          return;
        }
      }
      for (let j = 0; j < (variant.specifications || []).length; j++) {
        const spec = variant.specifications[j];
        if (spec.key.trim() && !spec.value.trim()) {
          toast.error(`Variant ${i + 1}, Specification ${j + 1}: Value is required when key is provided`);
          return;
        }
        if (!spec.key.trim() && spec.value.trim()) {
          toast.error(`Variant ${i + 1}, Specification ${j + 1}: Key is required when value is provided`);
          return;
        }
      }
    }

    const productData = {
      ...data,
      price: parseFloat(data.price),
      discountPrice: data.discountPrice ? parseFloat(data.discountPrice) : undefined,
      shippingCost: parseFloat(data.shippingCost) || 0,
      stock: parseInt(data.stock),
      color: data.color ? { name: data.color.trim() } : undefined,
      specifications: specifications.filter(s => s.key.trim() && s.value.trim()),
      features: features.filter(f => f.trim()),
      variants: variants.map(v => ({
        ...v,
        price: parseFloat(v.price),
        discountPrice: v.discountPrice ? parseFloat(v.discountPrice) : undefined,
        stock: parseInt(v.stock),
        color: v.color ? { name: v.color.trim() } : undefined,
        attributes: v.attributes
          .filter(a => a.key.trim() && a.value.trim())
          .map(a => ({
            key: a.key.trim().toLowerCase(),
            value: a.value.trim()
          })),
        specifications: (v.specifications || [])
          .filter(s => s.key.trim() && s.value.trim())
          .map(s => ({
            key: s.key.trim(),
            value: s.value.trim()
          })),
        sku: v.sku?.trim() || undefined
      })).filter(v =>
        v.price >= 0 &&
        v.stock >= 0 &&
        v.attributes.length > 0
      ),
      sku: data.sku?.trim() || undefined
    };

    const media = {
      baseImages: newImageFiles,
      baseVideos: newVideoFiles,
      variantImages: variants.map(v => v.newImageFiles || []),
      variantVideos: variants.map(v => v.newVideoFiles || [])
    };

    await onSubmit(productData, media);
  };

  if (categoriesLoading) {
    return <LoadingSpinner />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Product Title"
            {...register("title", {
              required: "Title is required",
              minLength: { value: 3, message: "Minimum 3 characters" },
              maxLength: { value: 100, message: "Maximum 100 characters" }
            })}
            error={errors.title?.message}
          />
          <Input
            label="SKU"
            {...register("sku", skuValidation)}
            error={errors.sku?.message}
            placeholder={skuOptional ? "Leave blank to auto-generate" : ""}
          />
          <Input
            label="Price"
            type="number"
            step="0.01"
            min="0"
            {...register("price", {
              required: "Price is required",
              min: { value: 0, message: "Must be positive" }
            })}
            error={errors.price?.message}
          />
          <Input
            label="Discount Price"
            type="number"
            step="0.01"
            min="0"
            {...register("discountPrice", {
              validate: value =>
                !value || parseFloat(value) < parseFloat(watch("price")) ||
                "Discount must be less than price"
            })}
            error={errors.discountPrice?.message}
          />
          <Input
            label="Shipping Cost"
            type="number"
            step="0.01"
            min="0"
            {...register("shippingCost", {
              min: { value: 0, message: "Must be non-negative" }
            })}
            error={errors.shippingCost?.message}
          />
          <Select
            label="Category"
            {...register("categoryId", { required: "Category is required" })}
            options={categories.map(c => ({ value: c._id, label: c.name }))}
            error={errors.categoryId?.message}
          />
          <Input
            label="Brand"
            {...register("brand", {
              maxLength: { value: 50, message: "Maximum 50 characters" }
            })}
            error={errors.brand?.message}
          />
          <Input
            label="Stock Quantity"
            type="number"
            min="0"
            {...register("stock", {
              required: "Stock is required",
              min: { value: 0, message: "Must be positive" }
            })}
            error={errors.stock?.message}
          />
          <Input
            label="Color"
            {...register("color", {
              maxLength: { value: 50, message: "Color name cannot exceed 50 characters" }
            })}
            error={errors.color?.message}
            placeholder="Enter color name (optional)"
          />
          <div className="flex items-center mt-6">
            <input
              type="checkbox"
              id="isFeatured"
              {...register("isFeatured")}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isFeatured" className="ml-2 block text-sm text-gray-900">
              Featured Product
            </label>
          </div>
        </div>
        <div className="mt-6">
          <Textarea
            label="Description"
            rows={4}
            {...register("description", {
              required: "Description is required",
              minLength: { value: 10, message: "Minimum 10 characters" },
              maxLength: { value: 3000, message: "Maximum 3000 characters" }
            })}
            error={errors.description?.message}
          />
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Media</h2>
        {currentStage && (
          <div className="mb-4 text-sm text-gray-600">{currentStage}</div>
        )}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Main Product Images (Max 10, At least 1 required)
          </label>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png"
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-1 text-sm text-gray-500">
            JPEG or PNG, max 5MB each
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
          {existingImages.map((img, index) => (
            <div key={`existing-img-${index}`} className="relative group">
              <img
                src={img.url}
                alt={`Product ${index + 1}`}
                className="w-full h-32 object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          {newImageFiles.map((file, index) => (
            <div key={`new-img-${index}`} className="relative group">
              <img
                src={URL.createObjectURL(file)}
                alt={`New image ${index + 1}`}
                className="w-full h-32 object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index, true)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Main Product Videos (Max 3, Optional)
          </label>
          <input
            type="file"
            multiple
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleVideoChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-1 text-sm text-gray-500">
            MP4, WebM, or MOV, max 50MB each
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {existingVideos.map((vid, index) => (
            <div key={`existing-vid-${index}`} className="relative group">
              <video
                src={vid.url}
                controls
                className="w-full h-32 object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => handleRemoveVideo(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          {newVideoFiles.map((file, index) => (
            <div key={`new-vid-${index}`} className="relative group">
              <video
                src={URL.createObjectURL(file)}
                controls
                className="w-full h-32 object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => handleRemoveVideo(index, true)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">SEO Settings</h2>
        <div className="grid grid-cols-1 gap-6">
          <Input
            label="SEO Title"
            {...register("seo.title", {
              maxLength: { value: 60, message: "Maximum 60 characters" }
            })}
            error={errors.seo?.title?.message}
          />
          <Textarea
            label="SEO Description"
            rows={2}
            {...register("seo.description", {
              maxLength: { value: 160, message: "Maximum 160 characters" }
            })}
            error={errors.seo?.description?.message}
          />
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Features</h2>
          <Button
            type="button"
            onClick={handleAddFeature}
            variant="outline"
            size="sm"
            disabled={features.length >= 10}
          >
            Add Feature
          </Button>
        </div>
        {features.length === 0 ? (
          <p className="text-gray-500 text-sm">No features added</p>
        ) : (
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-end gap-4">
                <Input
                  label={`Feature ${index + 1}`}
                  value={feature}
                  onChange={(e) => handleFeatureChange(index, e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => handleRemoveFeature(index)}
                  variant="danger"
                  size="sm"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Specifications</h2>
          <Button
            type="button"
            onClick={handleAddSpecification}
            variant="outline"
            size="sm"
          >
            Add Specification
          </Button>
        </div>
        {specifications.length === 0 ? (
          <p className="text-gray-500 text-sm">No specifications added</p>
        ) : (
          <div className="space-y-4">
            {specifications.map((spec, index) => (
              <div key={index} className="flex items-end gap-4">
                <Input
                  label="Key"
                  value={spec.key}
                  onChange={(e) => handleSpecificationChange(index, 'key', e.target.value)}
                  className="flex-1"
                />
                <Input
                  label="Value"
                  value={spec.value}
                  onChange={(e) => handleSpecificationChange(index, 'value', e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => handleRemoveSpecification(index)}
                  variant="danger"
                  size="sm"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Variants</h2>
          <Button
            type="button"
            onClick={handleAddVariant}
            variant="outline"
            size="sm"
            disabled={variants.length >= 3}
          >
            Add Variant
          </Button>
        </div>
        {variants.length === 0 ? (
          <p className="text-gray-500 text-sm">No variants added</p>
        ) : (
          <div className="space-y-6">
            {variants.map((variant, vIndex) => (
              <div key={vIndex} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Variant {vIndex + 1}</h3>
                  <Button
                    type="button"
                    onClick={() => handleRemoveVariant(vIndex)}
                    variant="danger"
                    size="sm"
                  >
                    Remove Variant
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <Input
                    label="Variant SKU"
                    value={variant.sku}
                    onChange={(e) => handleVariantChange(vIndex, 'sku', e.target.value)}
                    placeholder="Leave blank to auto-generate"
                  />
                  <Input
                    label="Price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={variant.price}
                    onChange={(e) => handleVariantChange(vIndex, 'price', e.target.value)}
                  />
                  <Input
                    label="Discount Price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={variant.discountPrice || ''}
                    onChange={(e) => handleVariantChange(vIndex, 'discountPrice', e.target.value)}
                  />
                  <Input
                    label="Stock"
                    type="number"
                    min="0"
                    value={variant.stock}
                    onChange={(e) => handleVariantChange(vIndex, 'stock', e.target.value)}
                  />
                  <Input
                    label="Color"
                    value={variant.color}
                    onChange={(e) => handleVariantChange(vIndex, 'color', e.target.value)}
                    placeholder="Enter variant color (optional)"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variant Images (Max {vIndex < 2 ? 15 : 5})
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png"
                    onChange={(e) => handleVariantImageChange(vIndex, e)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    JPEG or PNG, max 5MB each
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                  {variant.images?.map((img, imgIndex) => (
                    <div key={`variant-img-${imgIndex}`} className="relative group">
                      <img
                        src={img.url}
                        alt={`Variant ${vIndex + 1} image ${imgIndex + 1}`}
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVariantImage(vIndex, imgIndex)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {variant.newImageFiles?.map((file, imgIndex) => (
                    <div key={`variant-new-img-${imgIndex}`} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`New variant ${vIndex + 1} image ${imgIndex + 1}`}
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVariantImage(vIndex, imgIndex, true)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variant Videos (Max 3)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(e) => handleVariantVideoChange(vIndex, e)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    MP4, WebM, or MOV, max 50MB each
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                  {variant.videos?.map((vid, vidIndex) => (
                    <div key={`variant-vid-${vidIndex}`} className="relative group">
                      <video
                        src={vid.url}
                        controls
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVariantVideo(vIndex, vidIndex)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {variant.newVideoFiles?.map((file, vidIndex) => (
                    <div key={`variant-new-vid-${vidIndex}`} className="relative group">
                      <video
                        src={URL.createObjectURL(file)}
                        controls
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVariantVideo(vIndex, vidIndex, true)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">Variant Specifications</h4>
                    <Button
                      type="button"
                      onClick={() => handleAddVariantSpecification(vIndex)}
                      variant="outline"
                      size="sm"
                    >
                      Add Specification
                    </Button>
                  </div>
                  {variant.specifications.length === 0 ? (
                    <p className="text-gray-500 text-sm">No specifications added</p>
                  ) : (
                    <div className="space-y-4">
                      {variant.specifications.map((spec, sIndex) => (
                        <div key={sIndex} className="flex items-end gap-4">
                          <Input
                            label="Key"
                            value={spec.key}
                            onChange={(e) => handleVariantSpecificationChange(vIndex, sIndex, 'key', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            label="Value"
                            value={spec.value}
                            onChange={(e) => handleVariantSpecificationChange(vIndex, sIndex, 'value', e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            onClick={() => handleRemoveVariantSpecification(vIndex, sIndex)}
                            variant="danger"
                            size="sm"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">Attributes</h4>
                    <Button
                      type="button"
                      onClick={() => handleAddAttribute(vIndex)}
                      variant="outline"
                      size="sm"
                    >
                      Add Attribute
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {variant.attributes.map((attr, aIndex) => (
                      <div key={aIndex} className="flex items-end gap-4">
                        <Input
                          label="Key"
                          value={attr.key}
                          onChange={(e) => handleAttributeChange(vIndex, aIndex, 'key', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          label="Value"
                          value={attr.value}
                          onChange={(e) => handleAttributeChange(vIndex, aIndex, 'value', e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={() => handleRemoveAttribute(vIndex, aIndex)}
                          variant="danger"
                          size="sm"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          loading={loading}
          className="min-w-[200px]"
        >
          {isEditMode ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;