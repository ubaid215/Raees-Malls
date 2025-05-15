import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ProductForm from "./ProductForm";
import { createProduct } from "../../services/productService";
import socketService from "../../services/socketService";

const AddProductPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (productData, media) => {
    setLoading(true);
    try {
      console.log('Submitting product:', {
        productData,
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
          if (!variant.sku || variant.sku.trim() === '') {
            const { sku, ...rest } = variant;
            return rest;
          }
          return variant;
        });
      }

      const product = await createProduct(productData, media);

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
        stack: err.stack
      });
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-[#E63946] mb-6">Add New Product</h1>
      <ProductForm 
        onSubmit={handleSubmit} 
        loading={loading} 
        skuOptional={true}
      />
    </section>
  );
};

export default AddProductPage;