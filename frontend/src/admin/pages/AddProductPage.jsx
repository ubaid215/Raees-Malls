import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ProductForm from "./ProductForm";
import { createProduct } from "../../services/productService";
import socketService from "../../services/socketService";
import UploadProgressBar from "../../components/core/UploadProgressBar";

const AddProductPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');

  const handleSubmit = async (productData, media) => {
    setLoading(true);
    setCurrentStage('Preparing files...');
    
    try {
      console.log('Submitting product:', {
        productData: {
          ...productData,
          shippingCost: productData.shippingCost,
        },
        baseImagesCount: media.baseImages?.length || 0,
        baseVideosCount: media.baseVideos?.length || 0,
        variantImagesCount: media.variantImages?.map(v => v?.length || 0) || [],
        variantVideosCount: media.variantVideos?.map(v => v?.length || 0) || []
      });

      if (!productData.sku || productData.sku.trim() === '') {
        delete productData.sku;
      }

      if (productData.variants) {
        productData.variants = productData.variants.map(variant => {
          const cleanedVariant = {
            ...variant,
            specifications: Array.isArray(variant.specifications) ? variant.specifications : [],
          };
          if (!variant.sku || variant.sku.trim() === '') {
            const { sku, ...rest } = cleanedVariant;
            return rest;
          }
          return cleanedVariant;
        });
      }

      setCurrentStage('Uploading product data...');
      const config = {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
        timeout: 300000 // 5 minutes
      };

      const product = await createProduct(productData, media, config);

      if (!product || !product._id) {
        throw new Error('Failed to create product: Invalid product data returned');
      }

      if (socketService && typeof socketService.emit === 'function') {
        socketService.emit("productAdded", product);
        console.log('Emitted productAdded event:', product._id);
      } else {
        console.warn('Socket service not available, skipping productAdded event');
      }

      toast.success("Product created successfully");
      navigate("/admin/inventory");
    } catch (err) {
      console.error('AddProductPage submit error:', {
        message: err.message,
        stack: err.stack,
        response: err.response?.data
      });
      
      const errorMessage = err.response?.data?.message || 
                         err.message || 
                         'Something went wrong during upload';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setUploadProgress(0);
      setCurrentStage('');
    }
  };

  return (
    <section className="container mx-auto px-4 py-6">
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