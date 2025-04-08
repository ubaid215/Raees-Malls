// admin/pages/AddProductPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductForm from "./ProductForm";
import { createProduct } from "../../services/productAPI";

const AddProductPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (productData) => {
    setIsSubmitting(true);
    try {
      await createProduct(productData); // productAPI handles ID generation
      navigate("/admin/inventory");
    } catch (err) {
      console.error("Submission failed:", err);
      throw err; // Let ProductForm handle the error display
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
      />
    </div>
  );
};

export default AddProductPage;