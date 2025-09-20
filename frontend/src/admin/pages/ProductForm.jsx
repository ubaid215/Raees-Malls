import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { getCategories } from "../../services/categoryService";
import Button from "../../components/core/Button";
import Input from "../../components/core/Input";
import Textarea from "../../components/core/TextArea";
import Select from "../../components/core/Select";
import LoadingSpinner from "../../components/core/LoadingSpinner";
import imageCompression from "browser-image-compression";
import {
  toastSuccess,
  toastError,
} from "../../components/core/ToastNotification";
import RichTextEditor from "./RichTextEditor";

const ProductForm = ({
  product = null,
  onSubmit,
  loading = false,
  isEditMode = false,
  skuOptional = false,
  onSuccess,
}) => {
  const defaultValues = {
    title: product?.title || "",
    description: product?.description || "",
    price: product?.price || "",
    discountPrice: product?.discountPrice || "",
    shippingCost: product?.shippingCost || 0,
    categoryId: product?.categoryId?._id || product?.categoryId || "",
    brand: product?.brand || "",
    stock: product?.stock || "",
    sku: product?.sku || "",
    color:
      typeof product?.color === "string"
        ? product.color
        : product?.color?.name || "",
    seo: {
      title: product?.seo?.title || "",
      description: product?.seo?.description || "",
    },
    specifications: product?.specifications || [],
    features: product?.features || [],
    variants: product?.variants || [],
    isFeatured: product?.isFeatured || false,
    removeBaseImages: false,
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues,
  });

  const [existingImages, setExistingImages] = useState(product?.images || []);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [existingVideos, setExistingVideos] = useState(product?.videos || []);
  const [newVideoFiles, setNewVideoFiles] = useState([]);
   const [showBulkSpecs, setShowBulkSpecs] = useState(false);
  const [bulkSpecsText, setBulkSpecsText] = useState("");
  const [showBulkFeatures, setShowBulkFeatures] = useState(false);
  const [bulkFeaturesText, setBulkFeaturesText] = useState("");
  const [specifications, setSpecifications] = useState(
    product?.specifications || []
  );
  const [features, setFeatures] = useState(product?.features || []);
  const [variants, setVariants] = useState(
    product?.variants?.map((v) => ({
      ...v,
      newImageFiles: [],
      newVideoFiles: [],
      price: v.price?.toString() || "",
      discountPrice: v.discountPrice?.toString() || "",
      stock: v.stock?.toString() || "",
      sku: v.sku || "",
      storageOptions: Array.isArray(v.storageOptions)
        ? v.storageOptions.map((opt) => ({
            ...opt,
            price: opt.price?.toString() || "",
            discountPrice: opt.discountPrice?.toString() || "",
            stock: opt.stock?.toString() || "",
            sku: opt.sku || "",
          }))
        : [],
      sizeOptions: Array.isArray(v.sizeOptions)
        ? v.sizeOptions.map((opt) => ({
            ...opt,
            price: opt.price?.toString() || "",
            discountPrice: opt.discountPrice?.toString() || "",
            stock: opt.stock?.toString() || "",
            sku: opt.sku || "",
          }))
        : [],
      color: typeof v.color === "string" ? v.color : v.color?.name || "",
      images: v.images || [],
      videos: v.videos || [],
    })) || []
  );
  const [variantImagesToDelete, setVariantImagesToDelete] = useState(
    product?.variants?.map(() => []) || []
  );
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [currentStage, setCurrentStage] = useState("");

  const formStorageKey = `productFormData_${product?._id || "new"}`;
  const autoSaveTimeoutRef = useRef(null);
  const objectUrlsRef = useRef(new Set()); // Track object URLs for cleanup

  const skuValidation = skuOptional
    ? {
        pattern: {
          value: /^[A-Z0-9-]*$/i,
          message: "SKU can only contain letters, numbers, and hyphens",
        },
        maxLength: { value: 20, message: "SKU cannot exceed 20 characters" },
      }
    : {
        required: "SKU is required",
        pattern: {
          value: /^[A-Z0-9-]+$/i,
          message: "SKU can only contain letters, numbers, and hyphens",
        },
        minLength: { value: 5, message: "SKU must be at least 5 characters" },
        maxLength: { value: 20, message: "SKU cannot exceed 20 characters" },
      };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
      objectUrlsRef.current.clear();
    };
  }, []);

  // Helper function to create and track object URLs
  const createObjectURL = useCallback((file) => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.add(url);
    return url;
  }, []);

  // Helper function to revoke object URL
  const revokeObjectURL = useCallback((url) => {
    if (objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  }, []);

  // Debounced auto-save function
  const debouncedSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (!isEditMode) {
        try {
          const currentFormData = watch();
          const saveData = {
            ...currentFormData,
            specifications,
            features,
            variants: variants.map(v => ({
              ...v,
              // Don't save file objects, only the metadata
              newImageFiles: [],
              newVideoFiles: []
            }))
          };
          sessionStorage.setItem(formStorageKey, JSON.stringify(saveData));
          console.log("Form data auto-saved");
        } catch (error) {
          console.error("Error auto-saving form data:", error);
        }
      }
    }, 1000); // Save after 1 second of inactivity
  }, [watch, specifications, features, variants, isEditMode, formStorageKey]);

  // Load saved form data on mount
  useEffect(() => {
    const savedFormData = sessionStorage.getItem(formStorageKey);
    if (savedFormData && !isEditMode) {
      try {
        const parsedData = JSON.parse(savedFormData);
        reset(parsedData);
        if (parsedData.specifications) setSpecifications(parsedData.specifications);
        if (parsedData.features) setFeatures(parsedData.features);
        if (parsedData.variants) {
          setVariants(parsedData.variants.map(v => ({
            ...v,
            newImageFiles: [],
            newVideoFiles: []
          })));
        }
        console.log("Restored form data from session storage");
      } catch (error) {
        console.error("Error parsing saved form data:", error);
        sessionStorage.removeItem(formStorageKey);
      }
    }
  }, [formStorageKey, reset, isEditMode]);

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      reset(defaultValues);
      setExistingImages(product.images || []);
      setExistingVideos(product.videos || []);
      setSpecifications(product.specifications || []);
      setFeatures(product.features || []);
      setVariants(
        product.variants?.map((v) => ({
          ...v,
          newImageFiles: [],
          newVideoFiles: [],
          price: v.price?.toString() || "",
          discountPrice: v.discountPrice?.toString() || "",
          stock: v.stock?.toString() || "",
          sku: v.sku || "",
          storageOptions: Array.isArray(v.storageOptions)
            ? v.storageOptions.map((opt) => ({
                ...opt,
                price: opt.price?.toString() || "",
                discountPrice: opt.discountPrice?.toString() || "",
                stock: opt.stock?.toString() || "",
                sku: opt.sku || "",
              }))
            : [],
          sizeOptions: Array.isArray(v.sizeOptions)
            ? v.sizeOptions.map((opt) => ({
                ...opt,
                price: opt.price?.toString() || "",
                discountPrice: opt.discountPrice?.toString() || "",
                stock: opt.stock?.toString() || "",
                sku: opt.sku || "",
              }))
            : [],
          color: typeof v.color === "string" ? v.color : v.color?.name || "",
          images: v.images || [],
          videos: v.videos || [],
        })) || []
      );
      setVariantImagesToDelete(product.variants?.map(() => []) || []);
    }
  }, [product, reset]);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const categories = await getCategories();
        setCategories(categories);
      } catch (error) {
        toastError("Failed to load categories");
        console.error("Error loading categories:", error);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  const handleBulkSpecsSubmit = () => {
    if (!bulkSpecsText.trim()) {
      toastError("Please enter specifications");
      return;
    }

    const lines = bulkSpecsText.split('\n').filter(line => line.trim());
    const newSpecs = [];

    for (const line of lines) {
      // Try different parsing patterns
      let key, value;
      
      // Pattern 1: Key: Value
      if (line.includes(':')) {
        const parts = line.split(':');
        key = parts[0].trim();
        value = parts.slice(1).join(':').trim();
      } 
      // Pattern 2: Key - Value
      else if (line.includes('-')) {
        const parts = line.split('-');
        key = parts[0].trim();
        value = parts.slice(1).join('-').trim();
      }
      // Pattern 3: Key = Value
      else if (line.includes('=')) {
        const parts = line.split('=');
        key = parts[0].trim();
        value = parts.slice(1).join('=').trim();
      }
      // Default: Use the whole line as value with a generic key
      else {
        key = "Feature";
        value = line.trim();
      }

      if (key && value) {
        newSpecs.push({ key, value });
      }
    }

    if (newSpecs.length === 0) {
      toastError("No valid specifications found. Use format: 'Key: Value'");
      return;
    }

    setSpecifications([...specifications, ...newSpecs]);
    setBulkSpecsText("");
    setShowBulkSpecs(false);
    toastSuccess(`Added ${newSpecs.length} specifications`);
    debouncedSave();
  };

  const handleBulkFeaturesSubmit = () => {
  if (!bulkFeaturesText.trim()) {
    toastError("Please enter features");
    return;
  }

  const lines = bulkFeaturesText.split("\n").filter((line) => line.trim());
  const newFeatures = lines.map((line) => line.trim()).filter((line) => line);

  if (newFeatures.length === 0) {
    toastError("No valid features found");
    return;
  }

  if (features.length + newFeatures.length > 30) {
    toastError(
      `Maximum 10 features allowed. You have ${features.length} already.`
    );
    return;
  }

  // Update the features state
  setFeatures((prevFeatures) => [...prevFeatures, ...newFeatures]);
  
  // Clear the bulk text and hide the bulk input
  setBulkFeaturesText("");
  setShowBulkFeatures(false);
  
  // Show success message
  toastSuccess(`Added ${newFeatures.length} features`);
  
  // Trigger auto-save
  debouncedSave();
};


  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    setCurrentStage("Compressing images...");

    for (const file of files) {
      try {
        if (!file.type.startsWith("image/")) {
          toastError(
            `Invalid file type: ${file.name}. Only JPEG and PNG allowed.`
          );
          continue;
        }

        const compressedFile = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
          fileType: file.type,
        });

        if (compressedFile.size > 5 * 1024 * 1024) {
          toastError(`File still too large after compression: ${file.name}`);
          setCurrentStage("");
          continue;
        }

        const fileExtension = file.name.split(".").pop().toLowerCase();
        const mimeType = fileExtension === "png" ? "image/png" : "image/jpeg";
        const fileName = `${file.name.split(".")[0]}-compressed.${fileExtension}`;
        const correctedFile = new File([compressedFile], fileName, {
          type: mimeType,
        });

        validFiles.push(correctedFile);
      } catch (error) {
        console.error("Image compression error:", error);
        toastError(`Failed to process file: ${file.name}`);
      }
    }

    if (existingImages.length + newImageFiles.length + validFiles.length > 10) {
      toastError("Maximum 10 images allowed");
      setCurrentStage("");
      return;
    }

    setNewImageFiles((prev) => [...prev, ...validFiles]);
    setCurrentStage("");
    debouncedSave();
  };

  const handleVideoChange = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];

    for (const file of files) {
      if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
        toastError(`Invalid file type: ${file.name}. Use MP4, WebM, or MOV.`);
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        toastError(`File too large: ${file.name}. Max 50MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (existingVideos.length + newVideoFiles.length + validFiles.length > 3) {
      toastError("Maximum 3 videos allowed");
      return;
    }

    setNewVideoFiles((prev) => [...prev, ...validFiles]);
    debouncedSave();
  };

  const handleVariantImageChange = async (variantIndex, e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    setCurrentStage("Compressing variant images...");

    for (const file of files) {
      try {
        if (!file.type.startsWith("image/")) {
          toastError(
            `Invalid file type: ${file.name}. Only JPEG and PNG allowed.`
          );
          continue;
        }

        const compressedFile = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
          fileType: file.type,
        });

        if (compressedFile.size > 5 * 1024 * 1024) {
          toastError(`File still too large after compression: ${file.name}`);
          continue;
        }

        const fileExtension = file.name.split(".").pop().toLowerCase();
        const mimeType = fileExtension === "png" ? "image/png" : "image/jpeg";
        const fileName = `${file.name.split(".")[0]}-compressed.${fileExtension}`;
        const correctedFile = new File([compressedFile], fileName, {
          type: mimeType,
        });

        validFiles.push(correctedFile);
      } catch (error) {
        console.error("Variant image compression error:", error);
        toastError(`Failed to process file: ${file.name}`);
      }
    }

    const maxImages = variantIndex < 2 ? 15 : 5;
    const currentImages = variants[variantIndex].images?.length || 0;
    const currentNewImages = variants[variantIndex].newImageFiles?.length || 0;

    if (currentImages + currentNewImages + validFiles.length > maxImages) {
      toastError(`Maximum ${maxImages} images allowed for this variant`);
      setCurrentStage("");
      return;
    }

    setVariants((prev) =>
      prev.map((v, i) =>
        i === variantIndex
          ? { ...v, newImageFiles: [...(v.newImageFiles || []), ...validFiles] }
          : v
      )
    );
    setCurrentStage("");
    debouncedSave();
  };

  const handleVariantVideoChange = async (variantIndex, e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];

    for (const file of files) {
      if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
        toastError(`Invalid file type: ${file.name}. Use MP4, WebM, or MOV.`);
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        toastError(`File too large: ${file.name}. Max 50MB.`);
        continue;
      }
      validFiles.push(file);
    }

    const maxVideos = 3;
    const currentVideos = variants[variantIndex].videos?.length || 0;
    const currentNewVideos = variants[variantIndex].newVideoFiles?.length || 0;

    if (currentVideos + currentNewVideos + validFiles.length > maxVideos) {
      toastError(`Maximum ${maxVideos} videos allowed for this variant`);
      return;
    }

    setVariants((prev) =>
      prev.map((v, i) =>
        i === variantIndex
          ? { ...v, newVideoFiles: [...(v.newVideoFiles || []), ...validFiles] }
          : v
      )
    );
    debouncedSave();
  };

  const handleRemoveImage = (index, isNew = false) => {
    if (isNew) {
      const fileToRemove = newImageFiles[index];
      if (fileToRemove) {
        const url = createObjectURL(fileToRemove);
        revokeObjectURL(url);
      }
      setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    } else {
      setExistingImages((prev) => prev.filter((_, i) => i !== index));
    }
    debouncedSave();
  };

  const handleRemoveVideo = (index, isNew = false) => {
    if (isNew) {
      const fileToRemove = newVideoFiles[index];
      if (fileToRemove) {
        const url = createObjectURL(fileToRemove);
        revokeObjectURL(url);
      }
      setNewVideoFiles((prev) => prev.filter((_, i) => i !== index));
    } else {
      setExistingVideos((prev) => prev.filter((_, i) => i !== index));
    }
    debouncedSave();
  };

  const handleRemoveVariantImage = (variantIndex, imageIndex, isNew = false) => {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== variantIndex) return v;
        if (isNew) {
          const fileToRemove = v.newImageFiles[imageIndex];
          if (fileToRemove) {
            const url = createObjectURL(fileToRemove);
            revokeObjectURL(url);
          }
          return {
            ...v,
            newImageFiles: v.newImageFiles.filter((_, idx) => idx !== imageIndex),
          };
        }
        const imageId = v.images[imageIndex]?._id;
        if (imageId) {
          setVariantImagesToDelete((prev) =>
            prev.map((ids, idx) =>
              idx === variantIndex ? [...ids, imageId.toString()] : ids
            )
          );
        }
        return {
          ...v,
          images: v.images.filter((_, idx) => idx !== imageIndex),
        };
      })
    );
    debouncedSave();
  };

  const handleRemoveVariantVideo = (variantIndex, videoIndex, isNew = false) => {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== variantIndex) return v;
        if (isNew) {
          const fileToRemove = v.newVideoFiles[videoIndex];
          if (fileToRemove) {
            const url = createObjectURL(fileToRemove);
            revokeObjectURL(url);
          }
          return {
            ...v,
            newVideoFiles: v.newVideoFiles.filter((_, idx) => idx !== videoIndex),
          };
        }
        return {
          ...v,
          videos: v.videos.filter((_, idx) => idx !== videoIndex),
        };
      })
    );
    debouncedSave();
  };

  const handleAddSpecification = () => {
    setSpecifications((prev) => [...prev, { key: "", value: "" }]);
    debouncedSave();
  };

  const handleSpecificationChange = (index, field, value) => {
    setSpecifications((prev) =>
      prev.map((spec, i) => (i === index ? { ...spec, [field]: value } : spec))
    );
    debouncedSave();
  };

  const handleRemoveSpecification = (index) => {
    setSpecifications((prev) => prev.filter((_, i) => i !== index));
    debouncedSave();
  };

  const handleAddFeature = () => {
    if (features.length >= 10) {
      toastError("Maximum 10 features allowed");
      return;
    }
    setFeatures((prev) => [...prev, ""]);
    debouncedSave();
  };

  const handleFeatureChange = (index, value) => {
    setFeatures((prev) => prev.map((f, i) => (i === index ? value : f)));
    debouncedSave();
  };

  const handleRemoveFeature = (index) => {
    setFeatures((prev) => prev.filter((_, i) => i !== index));
    debouncedSave();
  };

  const handleAddVariant = () => {
    if (variants.length >= 6) {
      toastError("Maximum 6 variants allowed");
      return;
    }
    setVariants((prev) => [
      ...prev,
      {
        color: "",
        price: "",
        discountPrice: "",
        stock: "",
        sku: "",
        storageOptions: [],
        sizeOptions: [],
        images: [],
        videos: [],
        newImageFiles: [],
        newVideoFiles: [],
      },
    ]);
    setVariantImagesToDelete((prev) => [...prev, []]);
    // Clear base price, discountPrice, and stock fields
    setValue("price", "");
    setValue("discountPrice", "");
    setValue("stock", "");
    debouncedSave();
  };

  const handleVariantChange = (index, field, value) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
    debouncedSave();
  };

  const handleAddStorageOption = (variantIndex) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === variantIndex
          ? {
              ...v,
              storageOptions: [
                ...(v.storageOptions || []),
                {
                  capacity: "",
                  price: "",
                  discountPrice: "",
                  stock: "",
                  sku: "",
                },
              ],
            }
          : v
      )
    );
    debouncedSave();
  };

  const handleStorageOptionChange = (variantIndex, optionIndex, field, value) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === variantIndex
          ? {
              ...v,
              storageOptions: v.storageOptions.map((opt, idx) =>
                idx === optionIndex ? { ...opt, [field]: value } : opt
              ),
            }
          : v
      )
    );
    debouncedSave();
  };

  const handleRemoveStorageOption = (variantIndex, optionIndex) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === variantIndex
          ? {
              ...v,
              storageOptions: v.storageOptions.filter(
                (_, idx) => idx !== optionIndex
              ),
            }
          : v
      )
    );
    debouncedSave();
  };

  const handleAddSizeOption = (variantIndex) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === variantIndex
          ? {
              ...v,
              sizeOptions: [
                ...(v.sizeOptions || []),
                { size: "", price: "", discountPrice: "", stock: "", sku: "" },
              ],
            }
          : v
      )
    );
    debouncedSave();
  };

  const handleSizeOptionChange = (variantIndex, optionIndex, field, value) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === variantIndex
          ? {
              ...v,
              sizeOptions: v.sizeOptions.map((opt, idx) =>
                idx === optionIndex ? { ...opt, [field]: value } : opt
              ),
            }
          : v
      )
    );
    debouncedSave();
  };

  const handleRemoveSizeOption = (variantIndex, optionIndex) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === variantIndex
          ? {
              ...v,
              sizeOptions: v.sizeOptions.filter(
                (_, idx) => idx !== optionIndex
              ),
            }
          : v
      )
    );
    debouncedSave();
  };

  const handleRemoveVariant = (index) => {
    // Clean up object URLs for this variant
    const variant = variants[index];
    if (variant?.newImageFiles) {
      variant.newImageFiles.forEach(file => {
        const url = createObjectURL(file);
        revokeObjectURL(url);
      });
    }
    if (variant?.newVideoFiles) {
      variant.newVideoFiles.forEach(file => {
        const url = createObjectURL(file);
        revokeObjectURL(url);
      });
    }

    setVariants((prev) => prev.filter((_, i) => i !== index));
    setVariantImagesToDelete((prev) => prev.filter((_, i) => i !== index));
    debouncedSave();
  };

  const onSubmitHandler = async (data) => {
    if (
      data.removeBaseImages &&
      !window.confirm(
        "Are you sure you want to remove all base images? This cannot be undone."
      )
    ) {
      return;
    }

    const variantsHaveImages = variants.some(
      (v) =>
        (v.images && v.images.length > 0) ||
        (v.newImageFiles && v.newImageFiles.length > 0)
    );

    if (
      !data.removeBaseImages &&
      !variantsHaveImages &&
      !newImageFiles.length &&
      !existingImages.length
    ) {
      toastError(
        "At least one product image is required when variants have no images"
      );
      return;
    }

    if (data.color && data.color.length > 50) {
      toastError("Base product color name cannot exceed 50 characters");
      return;
    }

    for (let i = 0; i < features.length; i++) {
      const feature = features[i].trim();
      if (feature && (feature.length < 1 || feature.length > 200)) {
        toastError(`Feature ${i + 1}: Must be between 1 and 200 characters`);
        return;
      }
    }

    for (let i = 0; i < specifications.length; i++) {
      const spec = specifications[i];
      if (spec.key.trim() && !spec.value.trim()) {
        toastError(
          `Specification ${i + 1}: Value is required when key is provided`
        );
        return;
      }
      if (!spec.key.trim() && spec.value.trim()) {
        toastError(
          `Specification ${i + 1}: Key is required when value is provided`
        );
        return;
      }
    }

    const processedVariants = variants.map((v) => {
      const variantData = {
        color: v.color && v.color.trim() ? { name: v.color.trim() } : undefined,
        images: v.images || [],
        videos: v.videos || [],
      };

      if (v.price !== undefined && v.stock !== undefined) {
        variantData.price = parseFloat(v.price) || 0;
        variantData.discountPrice = v.discountPrice
          ? parseFloat(v.discountPrice)
          : undefined;
        variantData.stock = parseInt(v.stock) || 0;
        variantData.sku = v.sku?.trim() || undefined;
      }

      if (v.storageOptions?.length > 0) {
        variantData.storageOptions = v.storageOptions
          .filter(
            (o) =>
              o.capacity.trim() &&
              parseFloat(o.price) > 0 &&
              parseInt(o.stock) >= 0
          )
          .map((o) => ({
            capacity: o.capacity.trim(),
            price: parseFloat(o.price) || 0,
            discountPrice: o.discountPrice
              ? parseFloat(o.discountPrice)
              : undefined,
            stock: parseInt(o.stock) || 0,
            sku: o.sku?.trim() || undefined,
          }));
      }

      if (v.sizeOptions?.length > 0) {
        variantData.sizeOptions = v.sizeOptions
          .filter(
            (o) =>
              o.size.trim() && parseFloat(o.price) > 0 && parseInt(o.stock) >= 0
          )
          .map((o) => ({
            size: o.size.trim(),
            price: parseFloat(o.price) || 0,
            discountPrice: o.discountPrice
              ? parseFloat(o.discountPrice)
              : undefined,
            stock: parseInt(o.stock) || 0,
            sku: o.sku?.trim() || undefined,
          }));
      }

      return variantData;
    });

    const filteredVariants = processedVariants.filter(
      (v) =>
        (v.price !== undefined && v.stock !== undefined) ||
        (v.storageOptions && v.storageOptions.length > 0) ||
        (v.sizeOptions && v.sizeOptions.length > 0)
    );

    // Check if there are valid variants with pricing/stock information
    const hasValidVariants = filteredVariants.some(
      (v) =>
        (v.price !== undefined && v.stock !== undefined) ||
        (v.storageOptions && v.storageOptions.length > 0) ||
        (v.sizeOptions && v.sizeOptions.length > 0)
    );

    const productData = {
      ...data,
      price: hasValidVariants ? undefined : (data.price ? parseFloat(data.price) : undefined),
      discountPrice: hasValidVariants ? undefined : (data.discountPrice ? parseFloat(data.discountPrice) : undefined),
      shippingCost: parseFloat(data.shippingCost) || 0,
      stock: hasValidVariants ? undefined : (data.stock ? parseInt(data.stock) : undefined),
      color:
        data.color && data.color.trim()
          ? { name: data.color.trim() }
          : undefined,
      specifications: specifications
        .filter((s) => s.key.trim() && s.value.trim())
        .map((s) => ({ key: s.key.trim(), value: s.value.trim() })),
      features: features.filter((f) => f.trim()),
      variants: filteredVariants,
      sku: data.sku?.trim() || undefined,
      removeBaseImages: data.removeBaseImages,
      variantImagesToDelete,
    };

    const media = {
      baseImages: newImageFiles,
      baseVideos: newVideoFiles,
      variantImages: variants.map((v) => v.newImageFiles || []),
      variantVideos: variants.map((v) => v.newVideoFiles || []),
    };

    try {
      const response = await onSubmit(productData, media);
      
      // Only clear data on successful submission
      sessionStorage.removeItem(formStorageKey);
      
      // Clean up object URLs
      objectUrlsRef.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
      objectUrlsRef.current.clear();
      
      // Reset form state only on success
      setExistingImages([]);
      setNewImageFiles([]);
      setExistingVideos([]);
      setNewVideoFiles([]);
      setSpecifications([]);
      setFeatures([]);
      setVariants([]);
      setVariantImagesToDelete([]);
      reset();
      
      onSuccess?.();
      toastSuccess(
        isEditMode
          ? "Product updated successfully!"
          : "Product created successfully!"
      );
      return response;
    } catch (error) {
      console.error("ProductForm: Submission error:", error);
      const errorMessage = error.response?.data?.errors
        ? error.response.data.errors.map((e) => e.message || e.msg).join(", ")
        : error.response?.data?.message ||
          error.message ||
          "Failed to submit product";
      toastError(errorMessage);
      
      // Don't reset form data on error - keep everything as is
      // This preserves variant data and other form inputs
      throw error;
    }
  };

  if (categoriesLoading) {
    return <LoadingSpinner />;
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmitHandler)}
      className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Input
            label="Product Title"
            {...register("title", {
              required: "Title is required",
              minLength: { value: 3, message: "Minimum 3 characters" },
              maxLength: { value: 100, message: "Maximum 100 characters" },
            })}
            error={errors.title?.message}
            onChange={(e) => {
              debouncedSave();
            }}
            className="w-full"
          />
          <Input
            label="SKU"
            {...register("sku", skuValidation)}
            error={errors.sku?.message}
            placeholder={skuOptional ? "Leave blank to auto-generate" : ""}
            onChange={(e) => {
              debouncedSave();
            }}
            className="w-full"
          />
          <Input
            label="Price"
            type="number"
            step="0.01"
            min="0"
            {...register("price", {
              validate: {
                positive: (v) =>
                  !v || parseFloat(v) >= 0 || "Must be non-negative",
                requiredIfNoVariants: (v) =>
                  variants.length === 0 && (!v || parseFloat(v) <= 0)
                    ? "Price is required if no variants are provided"
                    : true,
              },
            })}
            error={errors.price?.message}
            onChange={(e) => {
              debouncedSave();
            }}
            placeholder={variants.length > 0 ? "Ignored when variants are used" : ""}
            className="w-full"
          />
          <Input
            label="Discount Price"
            type="number"
            step="0.01"
            min="0"
            {...register("discountPrice", {
              validate: (value) =>
                !value ||
                parseFloat(value) < parseFloat(watch("price")) ||
                "Discount must be less than price",
            })}
            error={errors.discountPrice?.message}
            onChange={(e) => {
              debouncedSave();
            }}
            placeholder={variants.length > 0 ? "Ignored when variants are used" : ""}
            className="w-full"
          />
          <Input
            label="Shipping Cost"
            type="number"
            step="0.01"
            min="0"
            {...register("shippingCost", {
              required: "Shipping cost is required",
              min: { value: 0, message: "Must be non-negative" },
            })}
            error={errors.shippingCost?.message}
            onChange={(e) => {
              debouncedSave();
            }}
            className="w-full"
          />
          <Select
            label="Category"
            {...register("categoryId", { required: "Category is required" })}
            options={categories.map((c) => ({ value: c._id, label: c.name }))}
            error={errors.categoryId?.message}
            onChange={(e) => {
              debouncedSave();
            }}
            className="w-full"
          />
          <Input
            label="Brand"
            {...register("brand", {
              maxLength: { value: 50, message: "Maximum 50 characters" },
            })}
            error={errors.brand?.message}
            onChange={(e) => {
              debouncedSave();
            }}
            className="w-full"
          />
          <Input
            label="Stock Quantity"
            type="number"
            min="0"
            {...register("stock", {
              validate: {
                positive: (v) =>
                  !v || parseInt(v) >= 0 || "Must be non-negative",
                requiredIfNoVariants: (v) =>
                  variants.length === 0 && (!v || parseInt(v) < 0)
                    ? "Stock is required if no variants are provided"
                    : true,
              },
            })}
            error={errors.stock?.message}
            onChange={(e) => {
              debouncedSave();
            }}
            placeholder={variants.length > 0 ? "Ignored when variants are used" : ""}
            className="w-full"
          />
          <Input
            label="Color"
            {...register("color", {
              maxLength: {
                value: 50,
                message: "Color name cannot exceed 50 characters",
              },
            })}
            error={errors.color?.message}
            placeholder={
              isEditMode
                ? "Enter color name (leave blank to keep existing)"
                : "Enter color name (optional)"
            }
            onChange={(e) => {
              debouncedSave();
            }}
            className="w-full"
          />
          <div className="flex items-center mt-6">
            <input
              type="checkbox"
              id="isFeatured"
              {...register("isFeatured")}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              onChange={(e) => {
                debouncedSave();
              }}
            />
            <label
              htmlFor="isFeatured"
              className="ml-2 block text-sm text-gray-900"
            >
              Featured Product
            </label>
          </div>
          {isEditMode && (
            <div className="flex items-center mt-6">
              <input
                type="checkbox"
                id="removeBaseImages"
                {...register("removeBaseImages")}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                onChange={(e) => {
                  debouncedSave();
                }}
              />
              <label
                htmlFor="removeBaseImages"
                className="ml-2 block text-sm text-gray-900"
              >
                Remove All Base Images
              </label>
            </div>
          )}
        </div>
        <div className="mt-6">
          <RichTextEditor
            value={watch("description")}
            onChange={(value) => {
              setValue("description", value);
              debouncedSave();
            }}
            label="Product Description"
            error={errors.description?.message}
            required={false}
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Media</h2>
        {currentStage && (
          <div className="mb-4 text-sm text-gray-600">{currentStage}</div>
        )}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Main Product Images (Max 10, At least 1 required)
          </label>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png"
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-1 text-sm text-gray-500">
            JPEG or PNG, max 5MB each
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
          {existingImages.map((img, index) => (
            <div key={`existing-img-${index}`} className="relative group">
              <img
                src={img.url}
                alt={`Product ${index + 1}`}
                className="w-full h-32 object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          {newImageFiles.map((file, index) => (
            <div key={`new-img-${index}`} className="relative group">
              <img
                src={createObjectURL(file)}
                alt={`New image ${index + 1}`}
                className="w-full h-32 object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index, true)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Main Product Videos (Max 3, Optional)
          </label>
          <input
            type="file"
            multiple
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleVideoChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-1 text-sm text-gray-500">
            MP4, WebM, or MOV, max 50MB each
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {existingVideos.map((vid, index) => (
            <div key={`existing-vid-${index}`} className="relative group">
              <video
                src={vid.url}
                controls
                className="w-full h-32 object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => handleRemoveVideo(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          {newVideoFiles.map((file, index) => (
            <div key={`new-vid-${index}`} className="relative group">
              <video
                src={createObjectURL(file)}
                controls
                className="w-full h-32 object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => handleRemoveVideo(index, true)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">SEO Settings</h2>
        <div className="grid grid-cols-1 gap-6">
          <Input
            label="SEO Title"
            {...register("seo.title", {
              maxLength: { value: 300, message: "Maximum 300 characters" },
            })}
            error={errors.seo?.title?.message}
            onChange={(e) => {
              debouncedSave();
            }}
            className="w-full"
          />
          <Textarea
            label="SEO Description"
            rows={2}
            {...register("seo.description", {
              maxLength: { value: 30000, message: "Maximum 30000 characters" },
            })}
            error={errors.seo?.description?.message}
            onChange={(e) => {
              debouncedSave();
            }}
            className="w-full"
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Specifications</h2>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setShowBulkSpecs(!showBulkSpecs)}
              variant="outline"
              size="sm"
            >
              {showBulkSpecs ? "Hide Bulk Input" : "Bulk Add"}
            </Button>
            <Button
              type="button"
              onClick={handleAddSpecification}
              variant="outline"
              size="sm"
            >
              Add Specification
            </Button>
          </div>
        </div>

        {showBulkSpecs && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-md font-medium mb-2">Bulk Add Specifications</h3>
            <p className="text-sm text-gray-600 mb-3">
              Enter one specification per line. Use formats like: <br />
              "Key: Value", "Key - Value", or "Key = Value"
            </p>
            <Textarea
              value={bulkSpecsText}
              onChange={(e) => setBulkSpecsText(e.target.value)}
              rows={5}
              placeholder="Material: Cotton
Size: Large
Weight: 500g
Color: Blue"
              className="w-full mb-3"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleBulkSpecsSubmit}
                variant="primary"
                size="sm"
              >
                Add Specifications
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowBulkSpecs(false);
                  setBulkSpecsText("");
                }}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {specifications.length === 0 ? (
          <p className="text-gray-500 text-sm">No specifications added</p>
        ) : (
          <div className="space-y-4">
            {specifications.map((spec, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row items-start sm:items-end gap-4"
              >
                <Input
                  label="Key"
                  value={spec.key}
                  onChange={(e) =>
                    handleSpecificationChange(index, "key", e.target.value)
                  }
                  className="flex-1 w-full"
                />
                <Input
                  label="Value"
                  value={spec.value}
                  onChange={(e) =>
                    handleSpecificationChange(index, "value", e.target.value)
                  }
                  className="flex-1 w-full"
                />
                <Button
                  type="button"
                  onClick={() => handleRemoveSpecification(index)}
                  variant="danger"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>


       <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Features</h2>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setShowBulkFeatures(!showBulkFeatures)}
              variant="outline"
              size="sm"
            >
              {showBulkFeatures ? "Hide Bulk Input" : "Bulk Add"}
            </Button>
            <Button
              type="button"
              onClick={handleAddFeature}
              variant="outline"
              size="sm"
              disabled={features.length >= 10}
            >
              Add Feature
            </Button>
          </div>
        </div>

        {showBulkFeatures && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-md font-medium mb-2">Bulk Add Features</h3>
            <p className="text-sm text-gray-600 mb-3">
              Enter one feature per line. Each feature should be 1-200 characters.
            </p>
            <Textarea
              value={bulkFeaturesText}
              onChange={(e) => setBulkFeaturesText(e.target.value)}
              rows={5}
              placeholder="Water resistant
Long battery life
Easy to use interface
Includes charging cable"
              className="w-full mb-3"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleBulkFeaturesSubmit}
                variant="primary"
                size="sm"
              >
                Add Features
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowBulkFeatures(false);
                  setBulkFeaturesText("");
                }}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {features.length === 0 ? (
          <p className="text-gray-500 text-sm">No features added</p>
        ) : (
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row items-start sm:items-end gap-4"
              >
                <Input
                  label={`Feature ${index + 1}`}
                  value={feature}
                  onChange={(e) => handleFeatureChange(index, e.target.value)}
                  className="flex-1 w-full"
                />
                <Button
                  type="button"
                  onClick={() => handleRemoveFeature(index)}
                  variant="danger"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Variants</h2>
          <Button
            type="button"
            onClick={handleAddVariant}
            variant="outline"
            size="sm"
            disabled={variants.length >= 6}
            title={variants.length >= 6 ? "Maximum 6 variants allowed" : ""}
          >
            Add Variant
          </Button>
        </div>
        {variants.length === 0 ? (
          <p className="text-gray-500 text-sm">No variants added</p>
        ) : (
          <div className="space-y-6">
            {variants.map((variant, vIndex) => (
              <div key={vIndex} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Variant {vIndex + 1}</h3>
                  <Button
                    type="button"
                    onClick={() => handleRemoveVariant(vIndex)}
                    variant="danger"
                    size="sm"
                  >
                    Remove Variant
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                  <Input
                    label="Color"
                    value={variant.color}
                    onChange={(e) =>
                      handleVariantChange(vIndex, "color", e.target.value)
                    }
                    placeholder="Enter variant color"
                    className="w-full"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <Input
                    label="Price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={variant.price}
                    onChange={(e) =>
                      handleVariantChange(vIndex, "price", e.target.value)
                    }
                    placeholder="Enter price"
                    className="w-full"
                  />
                  <Input
                    label="Discount Price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={variant.discountPrice}
                    onChange={(e) =>
                      handleVariantChange(
                        vIndex,
                        "discountPrice",
                        e.target.value
                      )
                    }
                    placeholder="Enter discount price"
                    className="w-full"
                  />
                  <Input
                    label="Stock"
                    type="number"
                    min="0"
                    value={variant.stock}
                    onChange={(e) =>
                      handleVariantChange(vIndex, "stock", e.target.value)
                    }
                    placeholder="Enter stock quantity"
                    className="w-full"
                  />
                  <Input
                    label="SKU"
                    value={variant.sku}
                    onChange={(e) =>
                      handleVariantChange(vIndex, "sku", e.target.value)
                    }
                    placeholder="Leave blank to auto-generate"
                    className="w-full"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variant Images (Max {vIndex < 2 ? 15 : 5})
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png"
                    onChange={(e) => handleVariantImageChange(vIndex, e)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    JPEG or PNG, max 5MB each
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                  {variant.images?.map((img, imgIndex) => (
                    <div
                      key={`variant-img-${imgIndex}`}
                      className="relative group"
                    >
                      <img
                        src={img.url}
                        alt={`Variant ${vIndex + 1} image ${imgIndex + 1}`}
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveVariantImage(vIndex, imgIndex)
                        }
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {variant.newImageFiles?.map((file, imgIndex) => (
                    <div
                      key={`variant-new-img-${imgIndex}`}
                      className="relative group"
                    >
                      <img
                        src={createObjectURL(file)}
                        alt={`New variant ${vIndex + 1} image ${imgIndex + 1}`}
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveVariantImage(vIndex, imgIndex, true)
                        }
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variant Videos (Max 3)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(e) => handleVariantVideoChange(vIndex, e)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    MP4, WebM, or MOV, max 50MB each
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                  {variant.videos?.map((vid, vidIndex) => (
                    <div
                      key={`variant-vid-${vidIndex}`}
                      className="relative group"
                    >
                      <video
                        src={vid.url}
                        controls
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveVariantVideo(vIndex, vidIndex)
                        }
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {variant.newVideoFiles?.map((file, vidIndex) => (
                    <div
                      key={`variant-new-vid-${vidIndex}`}
                      className="relative group"
                    >
                      <video
                        src={createObjectURL(file)}
                        controls
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveVariantVideo(vIndex, vidIndex, true)
                        }
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">Storage Options</h4>
                    <Button
                      type="button"
                      onClick={() => handleAddStorageOption(vIndex)}
                      variant="outline"
                      size="sm"
                    >
                      Add Storage Option
                    </Button>
                  </div>
                  {variant.storageOptions.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      No storage options added
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {variant.storageOptions.map((opt, optIndex) => (
                        <div
                          key={optIndex}
                          className="flex flex-col sm:flex-row items-start sm:items-end gap-4"
                        >
                          <Input
                            label="Capacity"
                            value={opt.capacity}
                            onChange={(e) =>
                              handleStorageOptionChange(
                                vIndex,
                                optIndex,
                                "capacity",
                                e.target.value
                              )
                            }
                            className="flex-1 w-full"
                          />
                          <Input
                            label="Price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={opt.price}
                            onChange={(e) =>
                              handleStorageOptionChange(
                                vIndex,
                                optIndex,
                                "price",
                                e.target.value
                              )
                            }
                            className="flex-1 w-full"
                          />
                          <Input
                            label="Discount Price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={opt.discountPrice || ""}
                            onChange={(e) =>
                              handleStorageOptionChange(
                                vIndex,
                                optIndex,
                                "discountPrice",
                                e.target.value
                              )
                            }
                            className="flex-1 w-full"
                          />
                          <Input
                            label="Stock"
                            type="number"
                            min="0"
                            value={opt.stock}
                            onChange={(e) =>
                              handleStorageOptionChange(
                                vIndex,
                                optIndex,
                                "stock",
                                e.target.value
                              )
                            }
                            className="flex-1 w-full"
                          />
                          <Input
                            label="SKU"
                            value={opt.sku}
                            onChange={(e) =>
                              handleStorageOptionChange(
                                vIndex,
                                optIndex,
                                "sku",
                                e.target.value
                              )
                            }
                            placeholder="Leave blank to auto-generate"
                            className="flex-1 w-full"
                          />
                          <Button
                            type="button"
                            onClick={() =>
                              handleRemoveStorageOption(vIndex, optIndex)
                            }
                            variant="danger"
                            size="sm"
                            className="w-full sm:w-auto"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">Size Options</h4>
                    <Button
                      type="button"
                      onClick={() => handleAddSizeOption(vIndex)}
                      variant="outline"
                      size="sm"
                    >
                      Add Size Option
                    </Button>
                  </div>
                  {variant.sizeOptions.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      No size options added
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {variant.sizeOptions.map((opt, optIndex) => (
                        <div
                          key={optIndex}
                          className="flex flex-col sm:flex-row items-start sm:items-end gap-4"
                        >
                          <Input
                            label="Size"
                            value={opt.size}
                            onChange={(e) =>
                              handleSizeOptionChange(
                                vIndex,
                                optIndex,
                                "size",
                                e.target.value
                              )
                            }
                            className="flex-1 w-full"
                          />
                          <Input
                            label="Price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={opt.price}
                            onChange={(e) =>
                              handleSizeOptionChange(
                                vIndex,
                                optIndex,
                                "price",
                                e.target.value
                              )
                            }
                            className="flex-1 w-full"
                          />
                          <Input
                            label="Discount Price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={opt.discountPrice || ""}
                            onChange={(e) =>
                              handleSizeOptionChange(
                                vIndex,
                                optIndex,
                                "discountPrice",
                                e.target.value
                              )
                            }
                            className="flex-1 w-full"
                          />
                          <Input
                            label="Stock"
                            type="number"
                            min="0"
                            value={opt.stock}
                            onChange={(e) =>
                              handleSizeOptionChange(
                                vIndex,
                                optIndex,
                                "stock",
                                e.target.value
                              )
                            }
                            className="flex-1 w-full"
                          />
                          <Input
                            label="SKU"
                            value={opt.sku}
                            onChange={(e) =>
                              handleSizeOptionChange(
                                vIndex,
                                optIndex,
                                "sku",
                                e.target.value
                              )
                            }
                            placeholder="Leave blank to auto-generate"
                            className="flex-1 w-full"
                          />
                          <Button
                            type="button"
                            onClick={() =>
                              handleRemoveSizeOption(vIndex, optIndex)
                            }
                            variant="danger"
                            size="sm"
                            className="w-full sm:w-auto"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          loading={loading}
          className="min-w-[200px]"
          onClick={() => console.log("Submit button clicked")}
        >
          {isEditMode ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;