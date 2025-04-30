import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ProductForm from "./ProductForm";
import { createProduct } from "../../services/productService";
import  socketService  from "../../services/socketService";

// Component: AddProductPage
// Description: Page for adding a new product
const AddProductPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (productData, images) => {
    setLoading(true);
    try {
      const product = await createProduct(productData, images);
      console.log('Product created in AddProductPage:', { id: product._id, title: product.title });
      
      // Emit Socket.IO event
      socketService.emit("productAdded", product);
      
      toast.success("Product created successfully");
      navigate("/admin/inventory");
    } catch (err) {
      console.error('AddProductPage submit error:', { message: err.message });
      toast.error(err.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-[#E63946] mb-6">Add New Product</h1>
      <ProductForm onSubmit={handleSubmit} loading={loading} />
    </section>
  );
};

export default AddProductPage;