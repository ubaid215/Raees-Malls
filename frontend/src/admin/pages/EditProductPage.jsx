import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAdminAuth } from '../../context/AdminAuthContext';
import ProductForm from './ProductForm';
import { updateProduct, getProductById } from '../../services/productService';
import LoadingSpinner from '../../components/core/LoadingSpinner';
import Button from '../../components/core/Button';

const EditProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { admin, isAdminAuthenticated, loading: authLoading } = useAdminAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productData, setProductData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check admin access
  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      toast.error('You must be logged in as an admin');
      navigate('/admin/login');
    }
  }, [authLoading, isAdminAuthenticated, navigate]);

  // Fetch product data
  const fetchProduct = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const product = await getProductById(id, { isPublic: false });
      if (!product) {
        throw new Error('Product not found');
      }
      setProductData(product);
    } catch (err) {
      console.error('Failed to fetch product:', err);
      setError(err.message || 'Failed to load product');
      toast.error(err.message || 'Failed to load product');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchProduct();
    }
  }, [fetchProduct, isAdminAuthenticated]);

  // Handle form submission
  const handleSubmit = useCallback(async (formData, media) => {
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('Submitting product update:', {
        productData: {
          ...formData,
          shippingCost: formData.shippingCost,
          color: formData.color,
        },
        baseImagesCount: media.baseImages?.length || 0,
        baseVideosCount: media.baseVideos?.length || 0,
        variantImagesCount: media.variantImages?.map(v => v?.length || 0) || [],
        variantVideosCount: media.variantVideos?.map(v => v?.length || 0) || []
      });

      // Prepare data for submission
      const submissionData = {
        ...formData,
        // Remove SKU if empty to allow auto-generation
        sku: formData.sku?.trim() || undefined,
        color: formData.color || undefined,
        variants: formData.variants?.map(variant => ({
          ...variant,
          // Remove variant SKU if empty
          sku: variant.sku?.trim() || undefined,
          color: variant.color || undefined,
          specifications: Array.isArray(variant.specifications) ? variant.specifications : [],
        }))
      };

      const updatedProduct = await updateProduct(id, submissionData, media);
      
      toast.success('Product updated successfully');
      navigate('/admin/inventory');
      return updatedProduct;
    } catch (err) {
      console.error('Update failed:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update product';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [id, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !productData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-md text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button
            onClick={fetchProduct}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Edit Product | Admin Dashboard</title>
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Edit Product</h1>
            <Button
              onClick={() => navigate('/admin/inventory')}
              variant="outline"
              className="border-gray-300 text-gray-700"
            >
              Back to Inventory
            </Button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded border border-red-200">
              {error}
            </div>
          )}

          {productData ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <ProductForm
                product={productData}
                onSubmit={handleSubmit}
                loading={isSubmitting}
                isEditMode={true}
                skuOptional={true} // SKU is optional in edit mode
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No product data available</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EditProductPage;