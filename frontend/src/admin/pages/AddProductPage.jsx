// AddProductPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductForm from "./ProductForm";
import { createProduct } from "../../services/productService";
import socketService from "../../services/socketService";
import UploadProgressBar from "../../components/core/UploadProgressBar";
import { toastSuccess, toastError } from "../../components/core/ToastNotification";

const AddProductPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');

  const safeParseNumber = (value) => {
    if (value === null || value === undefined) return undefined;
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  };

  const safeParseInt = (value) => {
    if (value === null || value === undefined) return undefined;
    const num = parseInt(value);
    return isNaN(num) ? undefined : num;
  };

  const handleSubmit = async (productData, media) => {
    setLoading(true);
    setCurrentStage('Preparing product data...');

    try {
      const processedVariants = productData.variants?.map(variant => {
        const processed = {
          color: variant.color && variant.color.name ? { name: variant.color.name.trim() } : undefined,
          images: variant.images || [],
          videos: variant.videos || []
        };

        if (variant.price !== undefined && variant.stock !== undefined) {
          processed.price = safeParseNumber(variant.price) || 0;
          processed.discountPrice = safeParseNumber(variant.discountPrice);
          processed.stock = safeParseInt(variant.stock) || 0;
          processed.sku = variant.sku?.trim() || undefined;
        }

        if (variant.storageOptions?.length > 0) {
          processed.storageOptions = variant.storageOptions
            .filter(opt => opt.capacity && opt.price && opt.stock !== undefined)
            .map(opt => ({
              capacity: opt.capacity.trim(),
              price: safeParseNumber(opt.price) || 0,
              discountPrice: safeParseNumber(opt.discountPrice),
              stock: safeParseInt(opt.stock) || 0,
              sku: opt.sku?.trim() || undefined
            }));
        }

        if (variant.sizeOptions?.length > 0) {
          processed.sizeOptions = variant.sizeOptions
            .filter(opt => opt.size && opt.price && opt.stock !== undefined)
            .map(opt => ({
              size: opt.size.trim(),
              price: safeParseNumber(opt.price) || 0,
              discountPrice: safeParseNumber(opt.discountPrice),
              stock: safeParseInt(opt.stock) || 0,
              sku: opt.sku?.trim() || undefined
            }));
        }

        return processed;
      }) || [];

      const processColor = (color) => {
        if (!color) return undefined;
        if (typeof color === 'object' && color.name) {
          return { name: color.name.trim() };
        }
        if (typeof color === 'string') {
          return { name: color.trim() };
        }
        return undefined;
      };

      const submissionData = {
        ...productData,
        price: safeParseNumber(productData.price),
        discountPrice: safeParseNumber(productData.discountPrice),
        shippingCost: safeParseNumber(productData.shippingCost) || 0,
        stock: safeParseInt(productData.stock),
        color: processColor(productData.color),
        specifications: productData.specifications || [],
        features: productData.features || [],
        variants: processedVariants,
        sku: productData.sku?.trim() || undefined
      };

      setCurrentStage('Uploading product data...');
      const config = {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
          setCurrentStage(`Uploading: ${percentCompleted}% complete`);
        },
        timeout: 300000,
      };

      const product = await createProduct(submissionData, media, config);

      if (!product || !product._id) {
        throw new Error('Failed to create product: Invalid product data returned');
      }

      if (socketService && typeof socketService.emit === 'function') {
        socketService.emit("productAdded", product);
      }

      toastSuccess("Product created successfully");
      navigate("/admin/inventory");
    } catch (err) {
      console.error('AddProductPage submit error:', {
        message: err.message,
        stack: err.stack,
        response: err.response?.data,
      });

      const errorMessage = err.response?.data?.errors 
        ? err.response.data.errors.map(e => e.message || e.msg).join(', ')
        : err.response?.data?.message || err.message || 'Something went wrong during upload';
      toastError(errorMessage);
    } finally {
      setLoading(false);
      setUploadProgress(0);
      setCurrentStage('');
    }
  };

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-[#E63946] mb-6">Add New Product</h1>
      {currentStage && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">{currentStage}</p>
          <UploadProgressBar progress={uploadProgress} />
        </div>
      )}
      <ProductForm 
        onSubmit={handleSubmit} 
        loading={loading} 
        skuOptional={true}
      />
    </section>
  );
};

export default AddProductPage;