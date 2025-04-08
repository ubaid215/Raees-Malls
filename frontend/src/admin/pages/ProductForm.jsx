import React, {
  lazy,
  memo,
  useState,
  useEffect,
  Suspense,
  useCallback,
} from "react";
import { FiUpload, FiTrash2, FiPlus, FiMinus } from "react-icons/fi";
import PropTypes from "prop-types";
import Button from "../../components/core/Button";
import Input from "../../components/core/Input";
import LoadingSpinner from "../../components/core/LoadingSpinner";
import LoadingSkeleton from "../../components/shared/LoadingSkelaton";

const ImageUploader = lazy(() => import("./ImageUploader"));
const SEOEditor = lazy(() => import("./SEOEditor"));
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
          Component failed to load:{" "}
          {this.state.error?.toString() || "Unknown error"}
        </div>
      );
    }
    return this.props.children;
  }
}

const ProductForm = memo(
  ({
    initialData = null,
    onSubmit = () =>
      Promise.reject(new Error("onSubmit function not provided")),
    isSubmitting = false,
  }) => {
    const [product, setProduct] = useState({
      title: "",
      description: "",
      price: 0,
      stock: 0,
      images: [],
      categories: [],
      variants: [],
      seo: {
        title: "",
        description: "",
        keywords: "",
        slug: "",
      },
      isFeatured: false, // Already present
    });

    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [imageUrls, setImageUrls] = useState({});

    // Initialize form with initialData
    useEffect(() => {
      if (initialData) {
        console.log("Initial data images:", initialData.images); // Debug
        try {
          const validatedData = {
            title: initialData.title || "",
            description: initialData.description || "",
            price: Number(initialData.price) || 0,
            stock: Number(initialData.stock) || 0,
            images: Array.isArray(initialData.images) ? initialData.images : [],
            categories: Array.isArray(initialData.categories)
              ? initialData.categories
              : [],
            variants: Array.isArray(initialData.variants)
              ? initialData.variants
              : [],
            isFeatured: initialData.isFeatured || false, // Already present
            seo:
              initialData.seo && typeof initialData.seo === "object"
                ? {
                    title: initialData.seo.title || "",
                    description: initialData.seo.description || "",
                    keywords: initialData.seo.keywords || "",
                    slug: initialData.seo.slug || "",
                  }
                : {
                    title: "",
                    description: "",
                    keywords: "",
                    slug: "",
                  },
          };

          const initialImageUrls = {};
          validatedData.images.forEach((img, index) => {
            if (typeof img === "string") {
              initialImageUrls[index] = img;
            } else if (img?.url) {
              initialImageUrls[index] = img.url;
            }
          });
          setImageUrls(initialImageUrls);

          setProduct(validatedData);
          console.log("Set product images:", validatedData.images); // Debug
        } catch (error) {
          console.error("Error parsing initial data:", error);
        }
      }
      setIsLoading(false);
    }, [initialData]);

    // Clean up blob URLs when component unmounts
    useEffect(() => {
      return () => {
        Object.values(imageUrls).forEach((url) => {
          try {
            if (url && url.startsWith("blob:")) {
              URL.revokeObjectURL(url);
            }
          } catch (e) {
            console.error("Error revoking URL:", e);
          }
        });
      };
    }, [imageUrls]);

    const getImageUrl = useCallback((image, index) => {
      console.log("Processing image in ProductForm:", image); // Debug
      if (!image) {
        console.log("Image is null, returning placeholder");
        return "/placeholder-product.png";
      }

      try {
        if (typeof image === "string") {
          if (
            image.startsWith("data:image/") ||
            image.startsWith("blob:") ||
            image.startsWith("http") ||
            image.startsWith("/images/")
          ) {
            console.log("Image is valid string, returning:", image);
            return image;
          } else {
            console.log("Image string is invalid:", image);
            return "/placeholder-product.png";
          }
        }

        if (image instanceof Blob || image instanceof File) {
          if (imageUrls[index]) {
            console.log("Image is Blob/File, using existing URL:", imageUrls[index]);
            return imageUrls[index];
          }

          const url = URL.createObjectURL(image);
          setImageUrls((prev) => ({ ...prev, [index]: url }));
          console.log("Image is Blob/File, created new URL:", url);
          return url;
        }

        if (image?.url && typeof image.url === "string") {
          console.log("Image has URL property:", image.url);
          return image.url;
        }
      } catch (e) {
        console.error("Error processing image URL:", e);
      }

      console.log("Falling back to placeholder");
      return "/placeholder-product.png";
    }, [imageUrls]);

    const handleChange = useCallback((e) => {
      const { name, value } = e.target;
      setProduct((prev) => ({ ...prev, [name]: value }));
    }, []);

    const handleSEOChange = useCallback((e) => {
      const { name, value } = e.target;
      setProduct((prev) => ({
        ...prev,
        seo: { ...prev.seo, [name]: value },
      }));
    }, []);

    const handleImageUpload = useCallback((files) => {
      setProduct((prev) => ({
        ...prev,
        images: [...prev.images, ...files].slice(0, 10),
      }));
    }, []);

    const handleRemoveImage = useCallback((index) => {
      setProduct((prev) => {
        const newImages = prev.images.filter((_, i) => i !== index);
        return { ...prev, images: newImages };
      });

      setImageUrls((prev) => {
        const newUrls = { ...prev };
        if (newUrls[index]?.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(newUrls[index]);
          } catch (e) {
            console.error("Error revoking URL:", e);
          }
        }
        delete newUrls[index];
        return newUrls;
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
        variants: [...prev.variants, { name: "", price: 0, stock: 0 }],
      }));
    }, []);

    const removeVariant = useCallback((index) => {
      setProduct((prev) => ({
        ...prev,
        variants: prev.variants.filter((_, i) => i !== index),
      }));
    }, []);

    const handleCategoryChange = useCallback((categories) => {
      setProduct((prev) => ({ ...prev, categories }));
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
      if (!product.price || product.price <= 0)
        newErrors.price = "Valid price is required";
      if (product.images.length === 0)
        newErrors.images = "At least one image is required";

      product.variants.forEach((variant, index) => {
        if (!variant.name.trim()) {
          newErrors[`variants.${index}.name`] = "Variant name is required";
        }
        if (!variant.price || variant.price <= 0) {
          newErrors[`variants.${index}.price`] = "Valid price is required";
        }
      });

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }, [product]);

    const handleSubmit = useCallback(
      async (e) => {
        e.preventDefault();
        if (validate()) {
          try {
            await onSubmit(product);
          } catch (error) {
            console.error("Submission error:", error);
            setErrors({
              submit: error.message || "Failed to submit product",
            });
          }
        }
      },
      [validate, onSubmit, product]
    );

    if (isLoading) {
      return (
        <div className="space-y-6">
          <LoadingSkeleton type="card" count={2} />
          <LoadingSkeleton
            type="image"
            count={5}
            width="100px"
            height="100px"
          />
          <LoadingSkeleton type="text" count={3} />
        </div>
      );
    }

    return (
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
              label="Description"
              name="description"
              value={product.description}
              onChange={handleChange}
              as="textarea"
              rows={4}
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
                label="Stock Quantity"
                name="stock"
                type="number"
                value={product.stock}
                onChange={handleChange}
                min="0"
              />
            </div>

            <Suspense fallback={<LoadingSkeleton type="text" count={3} />}>
              <ErrorBoundary>
                <CategorySelector
                  selected={product.categories}
                  onChange={handleCategoryChange}
                  categories={[
                    { _id: "1", name: "Electronics" },
                    { _id: "2", name: "Clothing" },
                    { _id: "3", name: "Home & Garden" },
                    { _id: "4", name: "Sports" },
                  ]}
                />
              </ErrorBoundary>
            </Suspense>

            {/* Added Featured Product Checkbox */}
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
                <span className="text-sm text-gray-700">
                  Feature this product in the Featured Products section
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <h2>Product Images</h2>
            {errors.images && (
              <p className="text-red text-sm">{errors.images}</p>
            )}

            <Suspense
              fallback={
                <LoadingSkeleton type="image" count={1} height="150px" />
              }
            >
              <ErrorBoundary>
                <ImageUploader
                  onUpload={handleImageUpload}
                  maxFiles={10}
                  accept="image/*"
                />
              </ErrorBoundary>
            </Suspense>

            <div className="grid grid-cols-3 gap-2">
              {product.images.map((image, index) => {
                const imageUrl = getImageUrl(image, index);
                return (
                  <div key={index} className="relative group">
                    <div className="h-24 w-full bg-gray-100 rounded border border-soft-gray flex items-center justify-center overflow-hidden">
                      <img
                        src={imageUrl}
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
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2>Product Variants</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addVariant}
            >
              <FiPlus className="mr-1" /> Add Variant
            </Button>
          </div>

          {product.variants.map((variant, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-soft-gray rounded-lg"
            >
              <Input
                label="Variant Name"
                value={variant.name}
                onChange={(e) =>
                  handleVariantChange(index, "name", e.target.value)
                }
                error={errors[`variants.${index}.name`]}
              />
              <Input
                label="Variant Price"
                type="number"
                min="0"
                step="0.01"
                value={variant.price}
                onChange={(e) =>
                  handleVariantChange(
                    index,
                    "price",
                    parseFloat(e.target.value)
                  )
                }
                error={errors[`variants.${index}.price`]}
              />
              <div className="flex items-end gap-2">
                <Input
                  label="Stock"
                  type="number"
                  min="0"
                  value={variant.stock}
                  onChange={(e) =>
                    handleVariantChange(
                      index,
                      "stock",
                      parseInt(e.target.value)
                    )
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

        <Suspense fallback={<LoadingSkeleton type="text" count={4} />}>
          <ErrorBoundary>
            <SEOEditor
              seoData={product.seo}
              onChange={handleSEOChange}
              titleSuggestions={product.title}
              descriptionSuggestions={product.description}
            />
          </ErrorBoundary>
        </Suspense>

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
    );
  }
);

ProductForm.propTypes = {
  initialData: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    price: PropTypes.number,
    stock: PropTypes.number,
    images: PropTypes.array,
    categories: PropTypes.array,
    variants: PropTypes.array,
    seo: PropTypes.shape({
      title: PropTypes.string,
      description: PropTypes.string,
      keywords: PropTypes.string,
      slug: PropTypes.string,
    }),
    isFeatured: PropTypes.bool, // Added to propTypes
  }),
  onSubmit: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
};

export default ProductForm;