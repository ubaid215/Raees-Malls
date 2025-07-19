import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import ProductForm from './ProductForm';
import { updateProduct, getProductById } from '../../services/productService';
import LoadingSpinner from '../../components/core/LoadingSpinner';
import Button from '../../components/core/Button';
import UploadProgressBar from '../../components/core/UploadProgressBar';
import { toastSuccess, toastError } from '../../components/core/ToastNotification';

const EditProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { admin, isAdminAuthenticated, loading: authLoading } = useAdminAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productData, setProductData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');

  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      toastError('You must be logged in as an admin');
      navigate('/admin/login');
    }
  }, [authLoading, isAdminAuthenticated, navigate]);

  const fetchProduct = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const product = await getProductById(id, { isPublic: false });
      if (!product) {
        throw new Error('Product not found');
      }

      const normalizedVariants = product.variants?.map(variant => ({
        ...variant,
        color: typeof variant.color === 'string' ? variant.color : variant.color?.name || '',
        price: variant.price !== undefined && variant.price !== null ? variant.price.toString() : '',
        discountPrice: variant.discountPrice !== undefined && variant.discountPrice !== null ? variant.discountPrice.toString() : '',
        stock: variant.stock !== undefined && variant.stock !== null ? variant.stock.toString() : '',
        sku: variant.sku || '',
        images: variant.images || [],
        videos: variant.videos || [],
        storageOptions: variant.storageOptions?.map(opt => ({
          ...opt,
          capacity: opt.capacity || '',
          price: opt.price !== undefined && opt.price !== null ? opt.price.toString() : '',
          discountPrice: opt.discountPrice !== undefined && opt.discountPrice !== null ? opt.discountPrice.toString() : '',
          stock: opt.stock !== undefined && opt.stock !== null ? opt.stock.toString() : '',
          sku: opt.sku || ''
        })) || [],
        sizeOptions: variant.sizeOptions?.map(opt => ({
          ...opt,
          size: opt.size || '',
          price: opt.price !== undefined && opt.price !== null ? opt.price.toString() : '',
          discountPrice: opt.discountPrice !== undefined && opt.discountPrice !== null ? opt.discountPrice.toString() : '',
          stock: opt.stock !== undefined && opt.stock !== null ? opt.stock.toString() : '',
          sku: opt.sku || ''
        })) || []
      })) || [];

      setProductData({
        ...product,
        price: product.price !== undefined && product.price !== null ? product.price.toString() : '',
        discountPrice: product.discountPrice !== undefined && product.discountPrice !== null ? product.discountPrice.toString() : '',
        stock: product.stock !== undefined && product.stock !== null ? product.stock.toString() : '',
        shippingCost: product.shippingCost !== undefined && product.shippingCost !== null ? product.shippingCost.toString() : '0',
        color: typeof product.color === 'string' ? product.color : product.color?.name || '',
        images: product.images || [],
        videos: product.videos || [],
        specifications: product.specifications || [],
        features: product.features || [],
        variants: normalizedVariants,
        removeBaseImages: false
      });
    } catch (err) {
      console.error('Failed to fetch product:', err);
      setError(err.message || 'Failed to load product');
      toastError(err.message || 'Failed to load product');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchProduct();
    }
  }, [fetchProduct, isAdminAuthenticated]);

  const handleSubmit = useCallback(async (formData, media) => {
    setIsSubmitting(true);
    setError(null);
    setCurrentStage('Preparing product data...');

    try {
      const processedVariants = formData.variants?.map(variant => {
        // Safely handle color value
        let colorValue = '';
        if (typeof variant.color === 'string') {
          colorValue = variant.color.trim();
        } else if (variant.color && typeof variant.color.name === 'string') {
          colorValue = variant.color.name.trim();
        }

        const processed = {
          color: colorValue ? { name: colorValue } : undefined,
          images: variant.images || [],
          videos: variant.videos || []
        };

        if (variant.price !== undefined && variant.stock !== undefined) {
          processed.price = parseFloat(variant.price) || 0;
          processed.stock = parseInt(variant.stock) || 0;
          if (variant.discountPrice) {
            processed.discountPrice = parseFloat(variant.discountPrice);
            if (processed.discountPrice >= processed.price) {
              throw new Error('Discount price must be less than regular price');
            }
          }
          processed.sku = variant.sku?.trim() || undefined;
        }

        if (variant.storageOptions?.length > 0) {
          processed.storageOptions = variant.storageOptions.map(opt => {
            if (!opt.capacity || !opt.price || opt.stock === undefined) {
              throw new Error('Storage options must have capacity, price, and stock');
            }
            return {
              capacity: opt.capacity.trim(),
              price: parseFloat(opt.price) || 0,
              discountPrice: opt.discountPrice ? parseFloat(opt.discountPrice) : undefined,
              stock: parseInt(opt.stock) || 0,
              sku: opt.sku?.trim() || undefined
            };
          });
        }

        if (variant.sizeOptions?.length > 0) {
          processed.sizeOptions = variant.sizeOptions.map(opt => {
            if (!opt.size || !opt.price || opt.stock === undefined) {
              throw new Error('Size options must have size, price, and stock');
            }
            return {
              size: opt.size.trim(),
              price: parseFloat(opt.price) || 0,
              discountPrice: opt.discountPrice ? parseFloat(opt.discountPrice) : undefined,
              stock: parseInt(opt.stock) || 0,
              sku: opt.sku?.trim() || undefined
            };
          });
        }

        return processed;
      }) || [];

      // Safely handle base product color
      let baseColorValue = '';
      if (typeof formData.color === 'string') {
        baseColorValue = formData.color.trim();
      } else if (formData.color && typeof formData.color.name === 'string') {
        baseColorValue = formData.color.name.trim();
      }

      const submissionData = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : undefined,
        discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : undefined,
        shippingCost: parseFloat(formData.shippingCost) || 0,
        stock: formData.stock ? parseInt(formData.stock) : undefined,
        color: baseColorValue ? { name: baseColorValue } : undefined,
        images: formData.images || [],
        videos: formData.videos || [],
        specifications: formData.specifications || [],
        features: formData.features || [],
        variants: processedVariants,
        sku: formData.sku?.trim() || undefined,
        removeBaseImages: formData.removeBaseImages || false,
        variantImagesToDelete: formData.variantImagesToDelete || []
      };

      if (!submissionData.color) {
        delete submissionData.color;
      }

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

      setCurrentStage('Updating product...');
      const updatedProduct = await updateProduct(id, submissionData, media, config);

      toastSuccess('Product updated successfully');
      navigate('/admin/inventory');
      return updatedProduct;
    } catch (err) {
      console.error('Update failed:', err);
      const errorMessage = err.response?.data?.errors
        ? err.response.data.errors.map(e => e.message || e.msg).join(', ')
        : err.response?.data?.message || err.message || 'Failed to update product';
      setError(errorMessage);
      toastError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
      setCurrentStage('');
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

          {currentStage && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">{currentStage}</p>
              <UploadProgressBar progress={uploadProgress} />
            </div>
          )}

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
                skuOptional={true}
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