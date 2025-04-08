// admin/pages/EditProductPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductForm from "./ProductForm";
import { getProductById, updateProduct } from "../../services/productAPI";

const EditProductPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialData, setInitialData] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const product = await getProductById(id);
        setInitialData(product);
      } catch (err) {
        console.error("Failed to load product:", err);
      }
    };
    fetchProduct();
  }, [id]);

  const handleSubmit = async (productData) => {
    setIsSubmitting(true);
    try {
      await updateProduct(id, productData);
      navigate("/admin/inventory");
    } catch (err) {
      console.error("Submission failed:", err);
      throw err; // Let ProductForm handle the error display
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!initialData) return <div>Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
      <ProductForm
        initialData={initialData}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default EditProductPage;