// productAPI.js
import { openDB } from 'idb';

const STORAGE_KEY = 'ecommerce_products';
let products = [];

// Initialize IndexedDB
const dbPromise = openDB('ecommerce-store', 1, {
  upgrade(db) {
    db.createObjectStore('images', { keyPath: 'id' });
    db.createObjectStore('products', { keyPath: 'id' });
  },
});

const simulateNetworkDelay = () => new Promise(resolve => setTimeout(resolve, 1000));

const initializeProducts = async () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  products = stored ? JSON.parse(stored) : [];
};

const saveProducts = (updatedProducts) => {
  const dataString = JSON.stringify(updatedProducts);
  const sizeInMB = (dataString.length * 2) / (1024 * 1024);
  console.log(`Saving products to localStorage, size: ${sizeInMB.toFixed(2)} MB`);
  localStorage.setItem(STORAGE_KEY, dataString);
};

const getStoredProducts = () => {
  initializeProducts();
  return [...products];
};

// Store image in IndexedDB and return a reference
const uploadImage = async (file) => {
  const fileId = Date.now().toString() + '-' + file.name;
  const db = await dbPromise;
  await db.put('images', { id: fileId, file });
  return `/images/${fileId}`;
};

// Retrieve image from IndexedDB and return a blob URL
const getImage = async (imageRef) => {
  console.log("getImage called with imageRef:", imageRef);
  const fileId = imageRef.split('/').pop();
  const db = await dbPromise;
  const imageData = await db.get('images', fileId);
  if (imageData && imageData.file) {
    const blobUrl = URL.createObjectURL(imageData.file);
    console.log("Found file in IndexedDB, returning blob URL:", blobUrl);
    return blobUrl;
  }
  console.log("File not found in IndexedDB, returning placeholder");
  return '/placeholder-product.png';
};

export const createProduct = async (productData) => {
  await simulateNetworkDelay();
  initializeProducts();
  const products = getStoredProducts();

  const imageRefs = await Promise.all(
    productData.images.map(async (image) => {
      if (image instanceof File) {
        return await uploadImage(image);
      }
      return image;
    })
  );

  const normalizedCategories = Array.isArray(productData.categories)
    ? productData.categories.map(cat => (typeof cat === 'object' ? cat.name : cat))
    : [];

  const newProduct = {
    ...productData,
    id: Date.now().toString(),
    price: Number(productData.price) || 0,
    categories: normalizedCategories,
    images: imageRefs,
    createdAt: new Date().toISOString(),
  };

  console.log("Created product:", newProduct);

  const updatedProducts = [newProduct, ...products];
  saveProducts(updatedProducts);
  return newProduct;
};

export const updateProduct = async (id, productData) => {
  await simulateNetworkDelay();
  initializeProducts();
  let products = getStoredProducts();

  const imageRefs = await Promise.all(
    productData.images.map(async (image) => {
      if (image instanceof File) {
        return await uploadImage(image);
      }
      return image;
    })
  );

  const normalizedCategories = Array.isArray(productData.categories)
    ? productData.categories.map(cat => (typeof cat === 'object' ? cat.name : cat))
    : [];

  const updatedProduct = {
    ...productData,
    price: Number(productData.price) || 0,
    categories: normalizedCategories,
    images: imageRefs,
  };

  products = products.map(product =>
    product.id === id ? { ...product, ...updatedProduct } : product
  );

  saveProducts(products);
  return updatedProduct;
};

export const deleteProduct = async (id) => {
  await simulateNetworkDelay();
  initializeProducts();
  let products = getStoredProducts();

  // Clean up images from IndexedDB
  const product = products.find(p => p.id === id);
  if (product && product.images) {
    const db = await dbPromise;
    for (const imageRef of product.images) {
      const fileId = imageRef.split('/').pop();
      await db.delete('images', fileId);
    }
  }

  products = products.filter(product => product.id !== id);
  saveProducts(products);
};

export const getProducts = async ({ page = 1, limit = 10, search = '', category = '' }) => {
  await simulateNetworkDelay();
  initializeProducts();
  let products = getStoredProducts();

  products = await Promise.all(
    products.map(async product => ({
      ...product,
      price: Number(product.price) || 0,
      categories: Array.isArray(product.categories)
        ? product.categories.map(cat => (typeof cat === 'object' ? cat.name : cat))
        : [],
      images: Array.isArray(product.images)
        ? await Promise.all(product.images.map(ref => getImage(ref)))
        : [],
    }))
  );

  if (search) {
    const searchLower = search.toLowerCase();
    products = products.filter(
      product =>
        product.title.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower) ||
        product.categories?.some(cat => cat.toLowerCase().includes(searchLower))
    );
  }

  if (category) {
    products = products.filter(product =>
      product.categories.includes(category)
    );
  }

  const startIndex = (page - 1) * limit;
  const paginatedProducts = products.slice(startIndex, startIndex + limit);

  return {
    data: paginatedProducts,
    total: products.length,
    page,
    limit,
    totalPages: Math.ceil(products.length / limit),
  };
};

export const getProductById = async (id) => {
  await simulateNetworkDelay();
  initializeProducts();
  const product = getStoredProducts().find(p => p.id === id);
  if (!product) {
    throw new Error('Product not found');
  }

  return {
    ...product,
    price: Number(product.price) || 0,
    categories: Array.isArray(product.categories)
      ? product.categories.map(cat => (typeof cat === 'object' ? cat.name : cat))
      : [],
    images: Array.isArray(product.images)
      ? await Promise.all(product.images.map(ref => getImage(ref)))
      : [],
  };
};

export const getCategories = async () => {
  await simulateNetworkDelay();
  initializeProducts();
  const products = getStoredProducts();
  const categories = new Set();
  products.forEach(product => {
    product.categories.forEach(category => categories.add(category));
  });
  return ["All", ...Array.from(categories)];
};