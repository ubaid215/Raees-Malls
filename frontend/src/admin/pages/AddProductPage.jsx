import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductForm from "./ProductForm";
import { createProduct } from "../../services/productAPI";

const AddProductPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (productData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Basic validation (optional, prefer ProductForm's validate)
      if (!productData.title || !productData.price) {
        throw new Error("Title and price are required");
      }
      if (!productData.seo?.slug || !productData.seo?.title) {
        throw new Error("SEO slug and title are required");
      }

      const cleanData = { ...productData };
      delete cleanData._id; // Prevent duplicate _id issues
      const response = await createProduct(cleanData);
      console.log("Product created:", response); // Debug success
      navigate("/admin/inventory");
    } catch (err) {
      console.error("Submission failed:", err);
      setSubmitError(err.response?.data?.error || err.message || "Failed to add product");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Add New Product</h1>
      <ProductForm
        initialData={null}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />
    </div>
  );
};

export default AddProductPage;