import React, {
  lazy,
  memo,
  useState,
  useEffect,
  Suspense,
  useCallback,
  useMemo,
} from "react";
import { Helmet } from "react-helmet";
import { FiUpload, FiTrash2, FiPlus, FiMinus } from "react-icons/fi";
import PropTypes from "prop-types";
import Button from "../../components/core/Button";
import Input from "../../components/core/Input";
import LoadingSpinner from "../../components/core/LoadingSpinner";
import LoadingSkeleton from "../../components/shared/LoadingSkelaton";
import { productService, categoryService } from "../../services/productAPI";

const ImageUploader = lazy(() => import("./ImageUploader"));
const CategorySelector = lazy(() => import("./CategorySelector"));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Component Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-3 bg-light-red text-red rounded border border-red">
          Component failed to load: {this.state.error?.toString() || "Unknown error"}
        </div>
      );
    }
    return this.props.children;
  }
}

const ProductForm = memo(
  ({
    initialData = null,
    onSubmit = () => Promise.resolve(),
    isSubmitting = false,
  }) => {
    const [product, setProduct] = useState({
      title: "",
      description: "",
      shortDescription: "",
      price: 0,
      originalPrice: 0,
      stock: 0,
      images: [],
      variants: [],
      isFeatured: false,
      categories: [],
      seo: { title: "", description: "" },
    });

    const [categories, setCategories] = useState([]);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [imagePreviews, setImagePreviews] = useState({});

    // Fetch categories and initialize form data
    useEffect(() => {
      const fetchCategories = async () => {
        try {
          const fetchedCategories = await categoryService.getAllCategories();
          setCategories(fetchedCategories);
        } catch (error) {
          console.error("Error fetching categories:", error);
          setErrors({ categories: "Failed to load categories" });
        }
      };

      fetchCategories();

      if (initialData) {
        try {
          const validatedData = {
            title: initialData.title || "",
            description: initialData.description || "",
            shortDescription: initialData.shortDescription || "",
            price: Number(initialData.price) || 0,
            originalPrice: Number(initialData.originalPrice) || 0,
            stock: Number(initialData.stock) || 0,
            images: Array.isArray(initialData.images) ? initialData.images : [],
            variants: Array.isArray(initialData.variants)
              ? initialData.variants.map((v) => ({
                  size: v.size || "",
                  color: v.color || "",
                  stock: Number(v.stock) || 0,
                }))
              : [],
            isFeatured: initialData.isFeatured || false,
            categories: Array.isArray(initialData.categories)
              ? initialData.categories
              : [],
            seo: {
              title: initialData.seo?.title || "",
              description: initialData.seo?.description || "",
            },
          };

          const initialImagePreviews = {};
          validatedData.images.forEach((img, index) => {
            initialImagePreviews[index] = img;
          });
          setImagePreviews(initialImagePreviews);
          setProduct(validatedData);
        } catch (error) {
          console.error("Error parsing initial data:", error);
        }
      }
      setIsLoading(false);
    }, [initialData]);

    // Cleanup blob URLs
    useEffect(() => {
      return () => {
        Object.values(imagePreviews).forEach((url) => {
          if (url && url.startsWith("blob:")) {
            URL.revokeObjectURL(url);
          }
        });
      };
    }, [imagePreviews]);

    const getImagePreview = useCallback((image, index) => {
      if (!image) return "/placeholder-product.png";
      if (typeof image === "string") {
        return image.startsWith("/uploads/") || image.startsWith("http")
          ? image
          : "/placeholder-product.png";
      }
      if (image instanceof File) {
        return imagePreviews[index] || URL.createObjectURL(image);
      }
      return "/placeholder-product.png";
    }, [imagePreviews]);

    const handleChange = useCallback((e) => {
      const { name, value } = e.target;
      if (name.startsWith("seo.")) {
        const seoField = name.split(".")[1];
        setProduct((prev) => ({
          ...prev,
          seo: { ...prev.seo, [seoField]: value },
        }));
      } else {
        setProduct((prev) => ({ ...prev, [name]: value }));
      }
    }, []);

    const handleCategoryChange = useCallback((selectedCategories) => {
      setProduct((prev) => ({ ...prev, categories: selectedCategories }));
    }, []);

    const handleImageUpload = useCallback((files) => {
      const newImages = [...product.images, ...files].slice(0, 5);
      setProduct((prev) => ({ ...prev, images: newImages }));
      const newPreviews = {};
      files.forEach((file, i) => {
        newPreviews[product.images.length + i] = URL.createObjectURL(file);
      });
      setImagePreviews((prev) => ({ ...prev, ...newPreviews }));
    }, [product.images]);

    const handleRemoveImage = useCallback((index) => {
      setProduct((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
      setImagePreviews((prev) => {
        const newPreviews = { ...prev };
        if (newPreviews[index]?.startsWith("blob:")) {
          URL.revokeObjectURL(newPreviews[index]);
        }
        delete newPreviews[index];
        return newPreviews;
      });
    }, []);

    const handleVariantChange = useCallback((index, field, value) => {
      setProduct((prev) => {
        const variants = [...prev.variants];
        variants[index] = { ...variants[index], [field]: value };
        return { ...prev, variants };
      });
    }, []);

    const addVariant = useCallback(() => {
      setProduct((prev) => ({
        ...prev,
        variants: [...prev.variants, { size: "", color: "", stock: 0 }],
      }));
    }, []);

    const removeVariant = useCallback((index) => {
      setProduct((prev) => ({
        ...prev,
        variants: prev.variants.filter((_, i) => i !== index),
      }));
    }, []);

    const handleFeaturedChange = useCallback((e) => {
      setProduct((prev) => ({
        ...prev,
        isFeatured: e.target.checked,
      }));
    }, []);

    const validate = useCallback(() => {
      const newErrors = {};
      if (!product.title.trim()) newErrors.title = "Title is required";
      if (!product.description.trim()) newErrors.description = "Description is required";
      if (!product.shortDescription.trim()) newErrors.shortDescription = "Short description is required";
      if (!product.price || product.price <= 0) newErrors.price = "Valid price is required";
      if (product.stock === undefined || product.stock < 0) newErrors.stock = "Valid stock quantity is required";
      if (product.images.length === 0) newErrors.images = "At least one image is required";
      if (product.categories.length === 0) newErrors.categories = "At least one category is required";
      if (!product.seo.title.trim()) newErrors.seoTitle = "SEO title is required";
      if (!product.seo.description.trim()) newErrors.seoDescription = "SEO description is required";

      product.variants.forEach((variant, index) => {
        if (!variant.size?.trim() && !variant.color?.trim()) {
          newErrors[`variants.${index}`] = "Size or color is required";
        }
      });

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }, [product]);

    const handleSubmit = useCallback(
      async (e) => {
        e.preventDefault();
        if (!validate()) return;

        const productData = {
          title: product.title,
          description: product.description,
          shortDescription: product.shortDescription,
          price: parseFloat(product.price) || 0,
          originalPrice: parseFloat(product.originalPrice) || 0,
          stock: parseInt(product.stock) || 0,
          isFeatured: product.isFeatured,
          variants: product.variants,
          categories: product.categories.map((cat) => cat._id).filter(Boolean),
          images: product.images,
          seo: {
            title: product.seo.title,
            description: product.seo.description,
          },
        };

        try {
          let response;
          if (initialData?._id) {
            response = await productService.updateProduct(initialData._id, productData);
          } else {
            response = await productService.createProduct(productData);
          }

          await onSubmit(response.data);
          setProduct({
            title: "",
            description: "",
            shortDescription: "",
            price: 0,
            originalPrice: 0,
            stock: 0,
            images: [],
            variants: [],
            isFeatured: false,
            categories: [],
            seo: { title: "", description: "" },
          });
          setImagePreviews({});
          setErrors({});
        } catch (error) {
          console.error("API error:", error);
          setErrors({
            submit: error.message || "Failed to submit product",
          });
        }
      },
      [product, initialData, onSubmit, validate]
    );

    const memoizedImagePreviews = useMemo(() => imagePreviews, [imagePreviews]);

    if (isLoading) {
      return (
        <section aria-label="Product Form Loading">
          <div className="space-y-6">
            <LoadingSkeleton type="card" count={2} />
            <LoadingSkeleton type="image" count={5} width="100px" height="100px" />
            <LoadingSkeleton type="text" count={3} />
          </div>
        </section>
      );
    }

    return (
      <section aria-label="Product Form">
        <Helmet>
          <title>{initialData ? "Edit Product" : "Create Product"} | Your Store</title>
          <meta
            name="description"
            content={initialData ? "Edit an existing product in your store" : "Create a new product for your store"}
          />
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <article>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.submit && (
              <div className="p-3 bg-light-red text-red rounded border border-red">
                {errors.submit}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h2>Product Information</h2>

                <Input
                  label="Product Title"
                  name="title"
                  value={product.title}
                  onChange={handleChange}
                  error={errors.title}
                  required
                />

                <Input
                  label="Short Description"
                  name="shortDescription"
                  value={product.shortDescription}
                  onChange={handleChange}
                  error={errors.shortDescription}
                  required
                />

                <Input
                  label="Description"
                  name="description"
                  value={product.description}
                  onChange={handleChange}
                  as="textarea"
                  rows={4}
                  error={errors.description}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Price (PKR)"
                    name="price"
                    type="number"
                    value={product.price}
                    onChange={handleChange}
                    error={errors.price}
                    min="0"
                    step="0.01"
                    required
                  />

                  <Input
                    label="Original Price (PKR)"
                    name="originalPrice"
                    type="number"
                    value={product.originalPrice}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                  />
                </div>

                <Input
                  label="Stock Quantity"
                  name="stock"
                  type="number"
                  value={product.stock}
                  onChange={handleChange}
                  error={errors.stock}
                  min="0"
                  required
                />

                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">SEO Settings</h2>
                  <Input
                    label="SEO Title"
                    name="seo.title"
                    value={product.seo.title}
                    onChange={handleChange}
                    error={errors.seoTitle}
                    required
                  />
                  <Input
                    label="SEO Description"
                    name="seo.description"
                    value={product.seo.description}
                    onChange={handleChange}
                    as="textarea"
                    rows={3}
                    error={errors.seoDescription}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">Display Settings</h2>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={product.isFeatured}
                      onChange={handleFeaturedChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Feature this product</span>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h2>Product Images</h2>
                {errors.images && (
                  <p className="text-red text-sm">{errors.images}</p>
                )}

                <Suspense
                  fallback={<LoadingSkeleton type="image" count={1} height="150px" />}
                >
                  <ErrorBoundary>
                    <ImageUploader
                      onUpload={handleImageUpload}
                      maxFiles={5}
                      accept="image/jpeg,image/jpg,image/png"
                    />
                  </ErrorBoundary>
                </Suspense>

                <div className="grid grid-cols-3 gap-2">
                  {product.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="h-24 w-full bg-gray-100 rounded border border-soft-gray flex items-center justify-center overflow-hidden">
                        <img
                          src={getImagePreview(image, index)}
                          alt={`Product preview ${index + 1}`}
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            e.target.src = "/placeholder-product.png";
                          }}
                          loading="lazy"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-white text-red rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2>Product Variants</h2>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  <FiPlus className="mr-1" /> Add Variant
                </Button>
              </div>

              {product.variants.map((variant, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-soft-gray rounded-lg"
                >
                  <Input
                    label="Size"
                    value={variant.size}
                    onChange={(e) => handleVariantChange(index, "size", e.target.value)}
                    error={errors[`variants.${index}`]}
                  />
                  <Input
                    label="Color"
                    value={variant.color}
                    onChange={(e) => handleVariantChange(index, "color", e.target.value)}
                  />
                  <div className="flex items-end gap-2">
                    <Input
                      label="Stock"
                      type="number"
                      min="0"
                      value={variant.stock}
                      onChange={(e) =>
                        handleVariantChange(index, "stock", parseInt(e.target.value))
                      }
                    />
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeVariant(index)}
                      aria-label={`Remove variant ${index + 1}`}
                    >
                      <FiMinus />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h2>Product Categories</h2>
              {errors.categories && (
                <p className="text-red text-sm">{errors.categories}</p>
              )}
              <Suspense fallback={<LoadingSkeleton type="text" count={1} />}>
                <ErrorBoundary>
                  <CategorySelector
                    selected={product.categories}
                    onChange={handleCategoryChange}
                    categories={categories}
                    maxSelections={5}
                  />
                </ErrorBoundary>
              </Suspense>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-soft-gray">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" color="white" className="mr-2" />
                    {initialData ? "Updating..." : "Creating..."}
                  </>
                ) : initialData ? (
                  "Update Product"
                ) : (
                  "Create Product"
                )}
              </Button>
            </div>
          </form>
        </article>
      </section>
    );
  }
);

ProductForm.propTypes = {
  initialData: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    shortDescription: PropTypes.string,
    price: PropTypes.number,
    originalPrice: PropTypes.number,
    stock: PropTypes.number,
    images: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.object])),
    variants: PropTypes.arrayOf(
      PropTypes.shape({
        size: PropTypes.string,
        color: PropTypes.string,
        stock: PropTypes.number,
      })
    ),
    isFeatured: PropTypes.bool,
    categories: PropTypes.arrayOf(
      PropTypes.shape({
        _id: PropTypes.string,
        name: PropTypes.string,
      })
    ),
    seo: PropTypes.shape({
      title: PropTypes.string,
      description: PropTypes.string,
    }),
  }),
  onSubmit: PropTypes.func,
  isSubmitting: PropTypes.bool,
};

export default ProductForm;