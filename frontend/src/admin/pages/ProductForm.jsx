/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { toast } from "react-toastify";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { getCategories } from "../../services/categoryService";
import { useAdminAuth } from "../../context/AdminAuthContext";
import Button from "../../components/core/Button";
import Input from "../../components/core/Input";
import Textarea from "../../components/core/Textarea";
import Select from "../../components/core/Select";

// Component: ProductForm
// Description: A reusable form for creating or updating products, including images, specifications, and variants
const ProductForm = React.memo(({ product = null, onSubmit, isSubmitting }) => {
  const { admin } = useAdminAuth(); // Admin authentication context
  const navigate = useNavigate(); // Navigation hook for redirects

  // Validate product _id for editing
  useEffect(() => {
    if (product && !product._id) {
      console.error('Invalid product for editing: Missing _id', { product });
      toast.error('Invalid product data');
      navigate('/admin/inventory');
    }
  }, [product, navigate]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      // Initialize form with product data or defaults
      title: product?.title || "",
      description: product?.description || "",
      price: product?.price || "",
      discountPrice: product?.discountPrice || "",
      categoryId: product?.categoryId || "",
      brand: product?.brand || "",
      stock: product?.stock || "",
      sku: product?.sku || "",
      seo: {
        title: product?.seo?.title || "",
        description: product?.seo?.description || "",
        slug: product?.seo?.slug || "",
      },
    },
  });

  // State Management
  const [images, setImages] = useState(product?.images || []); // Existing images from product
  const [newImageFiles, setNewImageFiles] = useState([]); // New images to upload
  const [specifications, setSpecifications] = useState(product?.specifications || []); // Product specifications
  const [variants, setVariants] = useState(product?.variants || []); // Product variants
  const [categories, setCategories] = useState([]); // Available categories
  const [categoryError, setCategoryError] = useState(null); // Category fetch error

  const watchedPrice = watch("price"); // Watch price field for discount validation

  // Section: Fetch Categories
  // Description: Load categories from API on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categories = await getCategories();
        if (Array.isArray(categories)) {
          setCategories(categories);
        } else {
          setCategoryError("Invalid category data received");
          toast.error("Invalid category data received");
        }
      } catch (error) {
        setCategoryError(error.message || "Failed to fetch categories");
        toast.error(error.message || "Failed to fetch categories");
      }
    };
    fetchCategories();
  }, []);

  // Section: Image Handling
  // Description: Handle main product image uploads (baseImages)
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const validFormats = ['image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const maxImages = 5; // Backend limit for baseImages

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

    if (images.length + newImageFiles.length + validFiles.length > maxImages) {
      toast.error(`Maximum ${maxImages} base images allowed`);
      return;
    }
    setNewImageFiles(prev => [...prev, ...validFiles]);
  };

  // Description: Handle image uploads for variants (variantImages[0-2])
  const handleVariantImageChange = (vIndex, e) => {
    const files = Array.from(e.target.files);
    const validFormats = ['image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const maxCounts = [15, 15, 5]; // Backend limits for variantImages[0-2]

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

    const currentVariantImages = variants[vIndex].newImageFiles || [];
    const maxCount = maxCounts[vIndex] || 0;
    if (currentVariantImages.length + validFiles.length > maxCount) {
      toast.error(`Maximum ${maxCount} images allowed for variant ${vIndex + 1}`);
      return;
    }

    setVariants(prev =>
      prev.map((v, i) =>
        i === vIndex ? { ...v, newImageFiles: [...(v.newImageFiles || []), ...validFiles] } : v
      )
    );
  };

  // Description: Remove an existing image
  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Description: Remove a new image file
  const handleRemoveNewImage = (index) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Description: Remove a variant image file
  const handleRemoveVariantImage = (vIndex, imgIndex) => {
    setVariants(prev =>
      prev.map((v, i) =>
        i === vIndex
          ? { ...v, newImageFiles: v.newImageFiles.filter((_, idx) => idx !== imgIndex) }
          : v
      )
    );
  };

  // Section: Specifications Handling
  // Description: Add a new specification
  const handleAddSpecification = () => {
    setSpecifications(prev => [...prev, { key: "", value: "" }]);
  };

  // Description: Update a specification
  const handleSpecificationChange = (index, field, value) => {
    setSpecifications(prev =>
      prev.map((spec, i) =>
        i === index ? { ...spec, [field]: value } : spec
      )
    );
  };

  // Description: Remove a specification
  const handleRemoveSpecification = (index) => {
    setSpecifications(prev => prev.filter((_, i) => i !== index));
  };

  // Section: Variants Handling
  // Description: Add a new variant
  const handleAddVariant = () => {
    if (variants.length >= 3) {
      toast.error('Maximum 3 variants allowed');
      return;
    }
    setVariants(prev => [
      ...prev,
      {
        sku: "",
        price: "",
        discountPrice: "",
        stock: "",
        attributes: [{ key: "", value: "" }],
        images: [],
        newImageFiles: [],
      },
    ]);
  };

  // Description: Update a variant field
  const handleVariantChange = (index, field, value) => {
    setVariants(prev =>
      prev.map((v, i) =>
        i === index ? { ...v, [field]: value } : v
      )
    );
  };

  // Description: Add an attribute to a variant
  const handleAddAttribute = (vIndex) => {
    setVariants(prev =>
      prev.map((v, i) =>
        i === vIndex ? { ...v, attributes: [...v.attributes, { key: "", value: "" }] } : v
      )
    );
  };

  // Description: Update a variant attribute
  const handleAttributeChange = (vIndex, aIndex, field, value) => {
    setVariants(prev =>
      prev.map((v, i) =>
        i === vIndex
          ? {
              ...v,
              attributes: v.attributes.map((attr, ai) =>
                ai === aIndex ? { ...attr, [field]: value } : attr
              ),
            }
          : v
      )
    );
  };

  // Description: Remove a variant attribute
  const handleRemoveAttribute = (vIndex, aIndex) => {
    setVariants(prev =>
      prev.map((v, i) =>
        i === vIndex
          ? { ...v, attributes: v.attributes.filter((_, ai) => ai !== aIndex) }
          : v
      )
    );
  };

  // Description: Remove a variant
  const handleRemoveVariant = (index) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  // Section: Form Submission
  // Description: Handle form submission, validate data, and prepare images
  const handleFormSubmit = async (data) => {
    if (!admin) {
      toast.error('You must be logged in as an admin');
      navigate('/admin/login');
      return;
    }

    // Validate discountPrice
    if (data.discountPrice) {
      const discount = parseFloat(data.discountPrice);
      const price = parseFloat(data.price);
      if (isNaN(discount) || isNaN(price)) {
        toast.error('Price and discount price must be valid numbers');
        return;
      }
      if (discount >= price) {
        toast.error('Discount price must be less than price');
        return;
      }
      if (discount < 0) {
        toast.error('Discount price must be positive');
        return;
      }
    }

    // Prepare productData object
    const productData = {
      title: data.title,
      description: data.description,
      price: parseFloat(data.price),
      categoryId: data.categoryId,
      brand: data.brand || undefined,
      stock: parseInt(data.stock),
      sku: data.sku,
      seo: {
        title: data.seo.title || undefined,
        description: data.seo.description || undefined,
        slug: data.seo.slug || undefined,
      },
    };

    // Include discountPrice if valid
    if (data.discountPrice && !isNaN(parseFloat(data.discountPrice))) {
      productData.discountPrice = parseFloat(data.discountPrice);
    }

    // Append specifications
    const validSpecs = specifications.filter(spec => spec.key.trim() && spec.value.trim());
    if (validSpecs.length > 0) {
      productData.specifications = validSpecs;
    }

    // Append variants
    const validVariants = variants.filter(v =>
      v.sku.trim() && v.price && v.stock &&
      v.attributes.every(attr => attr.key && attr.value.trim())
    );
    if (validVariants.length > 0) {
      productData.variants = validVariants.map(variant => ({
        sku: variant.sku,
        price: parseFloat(variant.price),
        discountPrice: variant.discountPrice ? parseFloat(variant.discountPrice) : undefined,
        stock: parseInt(variant.stock),
        attributes: variant.attributes,
        images: variant.images || [],
      }));
    }

    // Validate variant count
    if (validVariants.length > 3) {
      toast.error('Maximum 3 variants allowed');
      return;
    }

    // Prepare images for submission
    const images = {
      baseImages: newImageFiles,
      variantImages: variants.map(v => v.newImageFiles || []),
    };

    try {
      await onSubmit(productData, images);
      toast.success('Product created successfully');
      setNewImageFiles([]); // Reset base images
      setVariants(prev =>
        prev.map(v => ({ ...v, newImageFiles: [] })) // Reset variant images
      );
    } catch (error) {
      toast.error(error.message || 'Failed to create product');
    }
  };

  // Section: Render
  // Description: Render the form UI
  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Basic Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Basic Information</h2>
        <Input
          label="Title"
          {...register("title", {
            required: "Title is required",
            minLength: { value: 3, message: "Title must be at least 3 characters" },
            maxLength: { value: 100, message: "Title cannot exceed 100 characters" },
          })}
          error={errors.title?.message}
        />
        <Textarea
          label="Description"
          {...register("description", {
            required: "Description is required",
            minLength: { value: 10, message: "Description must be at least 10 characters" },
            maxLength: { value: 1000, message: "Description cannot exceed 1000 characters" },
          })}
          error={errors.description?.message}
        />
        <Input
          label="Price"
          type="number"
          step="0.01"
          {...register("price", {
            required: "Price is required",
            min: { value: 0, message: "Price must be positive" },
          })}
          error={errors.price?.message}
        />
        <Input
          label="Discount Price"
          type="number"
          step="0.01"
          {...register("discountPrice", {
            min: { value: 0, message: "Discount price must be positive" },
          })}
          error={errors.discountPrice?.message}
        />
        <Select
          label="Category"
          {...register("categoryId", {
            required: "Category is required",
          })}
          options={categories.map(cat => ({ value: cat._id, label: cat.name }))}
          error={errors.categoryId?.message || categoryError}
        />
        <Input
          label="Brand"
          {...register("brand", {
            minLength: { value: 2, message: "Brand must be at least 2 characters" },
            maxLength: { value: 50, message: "Brand cannot exceed 50 characters" },
          })}
          error={errors.brand?.message}
        />
        <Input
          label="Stock"
          type="number"
          {...register("stock", {
            required: "Stock is required",
            min: { value: 0, message: "Stock must be positive" },
          })}
          error={errors.stock?.message}
        />
        <Input
          label="SKU"
          {...register("sku", {
            required: "SKU is required",
            pattern: {
              value: /^[A-Z0-9-]+$/i,
              message: "SKU can only contain letters, numbers, and hyphens",
            },
            minLength: { value: 5, message: "SKU must be at least 5 characters" },
            maxLength: { value: 20, message: "SKU cannot exceed 20 characters" },
          })}
          error={errors.sku?.message}
        />
      </div>

      {/* SEO Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">SEO Information</h2>
        <Input
          label="SEO Title"
          {...register("seo.title", {
            maxLength: { value: 100, message: "SEO title cannot exceed 100 characters" },
          })}
          error={errors.seo?.title?.message}
        />
        <Textarea
          label="SEO Description"
          {...register("seo.description", {
            maxLength: { value: 160, message: "SEO description cannot exceed 160 characters" },
          })}
          error={errors.seo?.description?.message}
        />
        <Input
          label="SEO Slug"
          {...register("seo.slug", {
            pattern: {
              value: /^[a-z0-9-]+$/,
              message: "SEO slug can only contain lowercase letters, numbers, and hyphens",
            },
          })}
          error={errors.seo?.slug?.message}
        />
      </div>

      {/* Images */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Images</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Base Images (up to 5, JPEG/PNG, 5MB max each)
          </label>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png"
            onChange={handleImageChange}
            className="mt-1 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-[#FFE6E8] file:text-[#E63946]
              hover:file:bg-[#E63946] hover:file:text-white"
          />
          {errors.images && <p className="mt-1 text-sm text-red-600">{errors.images.message}</p>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((img, index) => (
            <div key={index} className="relative">
              <img
                src={img.url.startsWith('http') ? img.url : `http://localhost:5000${img.url}`}
                alt={img.alt || "Product image"}
                className="h-24 w-24 object-cover rounded"
                onError={(e) => (e.target.src = "/placeholder-product.png")}
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          {newImageFiles.map((file, index) => (
            <div key={`new-${index}`} className="relative">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="h-24 w-24 object-cover rounded"
              />
              <button
                type="button"
                onClick={() => handleRemoveNewImage(index)}
                className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Specifications */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Specifications</h2>
        {specifications.map((spec, index) => (
          <div key={index} className="flex space-x-4 items-end">
            <Input
              label="Key"
              value={spec.key}
              onChange={(e) => handleSpecificationChange(index, "key", e.target.value)}
              placeholder="e.g., Material"
            />
            <Input
              label="Value"
              value={spec.value}
              onChange={(e) => handleSpecificationChange(index, "value", e.target.value)}
              placeholder="e.g., Cotton"
            />
            <Button
              type="button"
              onClick={() => handleRemoveSpecification(index)}
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-100"
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          onClick={handleAddSpecification}
          variant="outline"
          className="border-[#E63946] text-[#E63946] hover:bg-[#FFE6E8]"
        >
          Add Specification
        </Button>
      </div>

      {/* Variants */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Variants</h2>
        {variants.map((variant, vIndex) => (
          <div key={vIndex} className="border p-4 rounded-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-medium">Variant {vIndex + 1}</h3>
              <Button
                type="button"
                onClick={() => handleRemoveVariant(vIndex)}
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-100"
              >
                Remove Variant
              </Button>
            </div>
            <Input
              label="Variant SKU"
              value={variant.sku}
              onChange={(e) => handleVariantChange(vIndex, "sku", e.target.value)}
              placeholder="e.g., PROD-V1"
            />
            <Input
              label="Price"
              type="number"
              step="0.01"
              value={variant.price}
              onChange={(e) => handleVariantChange(vIndex, "price", e.target.value)}
            />
            <Input
              label="Discount Price"
              type="number"
              step="0.01"
              value={variant.discountPrice}
              onChange={(e) => handleVariantChange(vIndex, "discountPrice", e.target.value)}
            />
            <Input
              label="Stock"
              type="number"
              value={variant.stock}
              onChange={(e) => handleVariantChange(vIndex, "stock", e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Variant Images (up to {vIndex < 2 ? 15 : 5}, JPEG/PNG, 5MB max each)
              </label>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png"
                onChange={(e) => handleVariantImageChange(vIndex, e)}
                className="mt-1 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-[#FFE6E8] file:text-[#E63946]
                  hover:file:bg-[#E63946] hover:file:text-white"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {variant.images?.map((img, imgIndex) => (
                <div key={`variant-img-${imgIndex}`} className="relative">
                  <img
                    src={img.url.startsWith('http') ? img.url : `http://localhost:5000${img.url}`}
                    alt={img.alt || "Variant image"}
                    className="h-24 w-24 object-cover rounded"
                    onError={(e) => (e.target.src = "/placeholder-product.png")}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveVariantImage(vIndex, imgIndex)}
                    className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {variant.newImageFiles?.map((file, imgIndex) => (
                <div key={`variant-new-${imgIndex}`} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-24 w-24 object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveVariantImage(vIndex, imgIndex)}
                    className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Attributes</h4>
              {variant.attributes.map((attr, aIndex) => (
                <div key={aIndex} className="flex space-x-4 items-end">
                  <Input
                    label="Key"
                    value={attr.key}
                    onChange={(e) => handleAttributeChange(vIndex, aIndex, "key", e.target.value)}
                    placeholder="e.g., Color"
                  />
                  <Input
                    label="Value"
                    value={attr.value}
                    onChange={(e) => handleAttributeChange(vIndex, aIndex, "value", e.target.value)}
                    placeholder="e.g., Red"
                  />
                  <Button
                    type="button"
                    onClick={() => handleRemoveAttribute(vIndex, aIndex)}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-100"
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() => handleAddAttribute(vIndex)}
                variant="outline"
                className="border-[#E63946] text-[#E63946] hover:bg-[#FFE6E8]"
              >
                Add Attribute
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          onClick={handleAddVariant}
          variant="outline"
          className="border-[#E63946] text-[#E63946] hover:bg-[#FFE6E8]"
        >
          Add Variant
        </Button>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className={`w-full sm:w-auto px-6 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#E63946] hover:bg-[#FFFFFF] hover:text-[#E63946] hover:border-[#E63946] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E63946] ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isSubmitting ? 'Creating...' : product ? 'Update Product' : 'Create Product'}
      </Button>
    </form>
  );
});

export default ProductForm;