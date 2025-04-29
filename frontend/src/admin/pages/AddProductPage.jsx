import React, { useState, useCallback } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import ProductForm from "./ProductForm";
import { createProduct } from "../../services/productService";
import  socketService  from "../../services/socketService";

const AddProductPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = useCallback(async (productData, images) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await createProduct(productData, images);
      console.log("Product created:", response);
      socketService.emit('productAdded', response);
      navigate("/admin/inventory");
    } catch (err) {
      console.error("Submission failed:", err);
      setSubmitError(err.message || "Failed to add product");
    } finally {
      setIsSubmitting(false);
    }
  }, [navigate]);

  return (
    <section aria-label="Add New Product">
      <Helmet>
        <title>Add New Product | Your Store</title>
        <meta name="description" content="Create a new product for your store" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Add New Product</h1>
        {submitError && (
          <div className="p-3 bg-light-red text-red rounded border border-red mb-6">
            {submitError}
          </div>
        )}
        <ProductForm
          product={null}
          onSubmit={handleSubmit}
        />
      </div>
    </section>
  );
};

export default AddProductPage;