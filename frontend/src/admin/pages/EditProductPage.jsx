import React, { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet";
import { useParams, useNavigate } from "react-router-dom";
import ProductForm from "./ProductForm";
import { updateProduct, getProductById } from "../../services/productService";
import LoadingSpinner from "../../components/core/LoadingSpinner";

const EditProductPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialData, setInitialData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitError, setSubmitError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  const fetchProduct = useCallback(async () => {
    setIsLoading(true);
    setSubmitError(null);
    try {
      const product = await getProductById();
      setInitialData(product);
    } catch (err) {
      console.error("Failed to load product:", err);
      setSubmitError(err.message || "Failed to load product");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleSubmit = useCallback(
    async (productData) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const response = await updateProduct(productData);
        console.log("Product updated:", response);
        navigate("/admin/inventory");
      } catch (err) {
        console.error("Submission failed:", err);
        setSubmitError(err.message || "Failed to update product");
      } finally {
        setIsSubmitting(false);
      }
    },
    [id, navigate]
  );

  if (isLoading) {
    return (
      <section aria-label="Loading Product">
        <div className="container mx-auto px-4 py-6 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  if (submitError && !initialData) {
    return (
      <section aria-label="Error Loading Product">
        <div className="container mx-auto px-4 py-6">
          <div className="p-3 bg-light-red text-red rounded border border-red">
            {submitError}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Edit Product">
      <Helmet>
        <title>Edit Product | Your Store</title>
        <meta name="description" content="Edit an existing product in your store" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
        {submitError && (
          <div className="p-3 bg-light-red text-red rounded border border-red mb-6">
            {submitError}
          </div>
        )}
        <ProductForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </section>
  );
};

export default EditProductPage;