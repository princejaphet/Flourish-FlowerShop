import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  TrendingUp,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  BarChart3,
  ShoppingCart,
  DollarSign,
  Boxes,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : {
      apiKey: "AIzaSyDTZKJpdPKCunl7dFpjEUPXY-eboXkPrhk", 
      authDomain: "flourish-adf09.firebaseapp.com",
      projectId: "flourish-adf09",
      storageBucket: "flourish-adf09.firebasestorage.app",
      messagingSenderId: "853529980918",
      appId: "1:853529980918:web:some_other_id",
      measurementId: "G-XXXXXXXXXX"
    };

const canvasAppId = typeof __app_id !== 'undefined' ? __app_id : 'flourish-admin-app';

let app;
let db;
let auth;

const CLOUDINARY_CLOUD_NAME = 'djhtu0rzz'; 
const CLOUDINARY_UPLOAD_PRESET = 'my_app_preset'; 

export default function ProductAndInventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [showAddProduct, setShowAddProduct] = useState(false);
  
  const initialNewProductState = {
    name: '',
    description: '',
    category: '',
    sku: '',
    variations: [{ name: '', price: '' }],
    stock: '',
    minStock: '',
    imageUrl: '', 
    imageUrls: [], 
  };
  const [newProduct, setNewProduct] = useState(initialNewProductState);

  const [products, setProducts] = useState([]);
  const [imageFiles, setImageFiles] = useState([]); 
  const [uploadingImage, setUploadingImage] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCategory, setExportCategory] = useState('all');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const formatCurrency = (value) => {
    const number = Number(value);
    if (isNaN(number)) {
      return '₱0.00';
    }
    return `₱${number.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // --- NEW: Helper function to format the price range ---
  const formatPriceRange = (min, max) => {
    if (min === max || max === undefined) {
      return formatCurrency(min);
    }
    return `${formatCurrency(min)} - ${formatCurrency(max)}`;
  };


  useEffect(() => {
    try {
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApp();
      }
      db = getFirestore(app);
      auth = getAuth(app);
      const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

      const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
          console.log("Firebase Auth State Changed: User is signed in.", user.uid);
          setUserId(user.uid);
        } else {
          console.log("Firebase Auth State Changed: No user signed in. Attempting sign-in.");
          setUserId(crypto.randomUUID()); 
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(auth, initialAuthToken);
              console.log("Signed in with custom token.");
            } else {
              await signInAnonymously(auth);
              console.log("Signed in anonymously.");
            }
          } catch (error) {
             console.error("Error signing in:", error);
             await signInAnonymously(auth);
             console.log("Signed in anonymously due to a previous error.");
          }
        }
      });
      return () => unsubscribeAuth();
    } catch (err) {
      console.error("Firebase initialization error:", err);
      setError("Failed to initialize Firebase. Check console for details.");
      setLoadingProducts(false);
    }
  }, []);
  
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  const fetchProducts = () => {
    if (!db) return;
    const productsCollectionRef = collection(db, `artifacts/${canvasAppId}/public/data/products`);
    
    setLoadingProducts(true);
    const unsubscribe = onSnapshot(productsCollectionRef, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      productsData.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(productsData);
      setLoadingProducts(false);
    }, (err) => {
      console.error("Error fetching products:", err);
      setError("Failed to load products.");
      setLoadingProducts(false);
    });
    return unsubscribe;
  };

  useEffect(() => {
    if (db && userId) {
      const unsubscribe = fetchProducts();
      return () => unsubscribe && unsubscribe();
    }
  }, [db, userId]);

  const categories = ['all', 'Beverages', 'Food', 'Confectionery', 'Flowers', 'Bouquets', 'Artificial Flowers', 'popular bouquet', 'Fresh and New'];

  // --- UPDATED: Filtering logic to check against price range ---
  const filteredProducts = products.filter(product => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(searchTermLower) ||
      product.sku.toLowerCase().includes(searchTermLower) ||
      (product.description && product.description.toLowerCase().includes(searchTermLower)) ||
      (product.minPrice?.toString().startsWith(searchTerm)) ||
      (product.maxPrice?.toString().startsWith(searchTerm)) ||
      (product.price?.toString().startsWith(searchTerm));

    const matchesCategory = selectedCategory === 'all' || product.category.toLowerCase() === selectedCategory.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  const stats = [
    { 
      label: 'Total Products', 
      value: products.length, 
      icon: Package, 
      color: 'bg-pink-500', 
      change: '+12%' 
    },
    { 
      label: 'Low Stock Items', 
      value: products.filter(p => p.stock < p.minStock).length, 
      icon: AlertTriangle, 
      color: 'bg-yellow-500', 
      change: '-8%' 
    },
    { 
      // --- UPDATED: Total Value calculation now uses the minimum price of each product ---
      label: 'Total Value', 
      value: formatCurrency(filteredProducts.reduce((sum, p) => sum + (p.minPrice || p.price || 0), 0)),
      icon: DollarSign, 
      color: 'bg-green-500', 
      change: '+24%' 
    },
    { 
      label: 'Out of Stock', 
      value: products.filter(p => p.stock === 0).length, 
      icon: ShoppingCart, 
      color: 'bg-red-500', 
      change: '+18%' 
    }
  ];

  const getStatusColor = (stock, minStock) => {
    if (stock === 0) return 'bg-red-100 text-red-800';
    if (stock < minStock) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };
  
  const handleImageChange = (e) => {
    if (e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const totalImages = newProduct.imageUrls.length + imageFiles.length + files.length;
      if (totalImages > 3) {
        alert('You can only have a maximum of 3 images per product.');
        const allowedFiles = files.slice(0, 3 - (newProduct.imageUrls.length + imageFiles.length));
        setImageFiles(prev => [...prev, ...allowedFiles]);
      } else {
        setImageFiles(prev => [...prev, ...files]);
      }
    }
  };
  
  const removeStagedImage = (index) => {
      setImageFiles(files => files.filter((_, i) => i !== index));
  };
  
  const removeImageUrl = (index) => {
      setNewProduct(prev => ({
          ...prev,
          imageUrls: prev.imageUrls.filter((_, i) => i !== index)
      }));
  };

  const uploadImagesToCloudinary = async (files) => {
    if (!files || files.length === 0) return [];
    setUploadingImage(true);

    const uploadPromises = files.map(file => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      return fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      }).then(response => {
        if (!response.ok) throw new Error('Image upload failed');
        return response.json();
      });
    });

    try {
      const results = await Promise.all(uploadPromises);
      setUploadingImage(false);
      return results.map(data => data.secure_url); 
    } catch (error) {
      console.error("Error uploading images to Cloudinary:", error);
      setError("Image upload failed. Check Cloudinary config and network.");
      setUploadingImage(false);
      return [];
    }
  };

  const handleVariationChange = (index, field, value) => {
    const updatedVariations = [...newProduct.variations];
    updatedVariations[index][field] = value;
    setNewProduct({ ...newProduct, variations: updatedVariations });
  };

  const addVariation = () => {
    setNewProduct({
      ...newProduct,
      variations: [...newProduct.variations, { name: '', price: '' }]
    });
  };

  const removeVariation = (index) => {
    if (newProduct.variations.length > 1) {
      const updatedVariations = newProduct.variations.filter((_, i) => i !== index);
      setNewProduct({ ...newProduct, variations: updatedVariations });
    }
  };

  const handleSaveProduct = async () => {
    const hasInvalidVariation = newProduct.variations.some(v => !v.name || !v.price);
    if (!newProduct.name || !newProduct.category || hasInvalidVariation) {
      alert("Please fill in Name, Category, and ensure all variations have a name and price.");
      return;
    }
    setAddingProduct(true);
    setError(null);
    
    let uploadedUrls = [];
    if (imageFiles.length > 0) {
      uploadedUrls = await uploadImagesToCloudinary(imageFiles);
      if (uploadedUrls.length === 0 && imageFiles.length > 0) {
        setAddingProduct(false);
        return; 
      }
    }

    const finalImageUrls = [...newProduct.imageUrls, ...uploadedUrls];
    const primaryImageUrl = finalImageUrls[0] || 'https://placehold.co/200x200/cccccc/ffffff?text=No+Image';

    // --- NEW: Calculate min and max price from variations ---
    const prices = newProduct.variations
      .map(v => parseFloat(v.price))
      .filter(p => !isNaN(p) && p >= 0);

    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    try {
      const productToSave = {
        ...newProduct,
        minPrice: minPrice, // <-- ADDED
        maxPrice: maxPrice, // <-- ADDED
        variations: newProduct.variations.map(v => ({
            name: v.name,
            price: parseFloat(v.price) || 0,
        })),
        stock: parseInt(newProduct.stock) || 0,
        minStock: parseInt(newProduct.minStock) || 10,
        imageUrl: primaryImageUrl,
        imageUrls: finalImageUrls,
        status: parseInt(newProduct.stock) === 0 ? 'Out of Stock' : parseInt(newProduct.stock) < (parseInt(newProduct.minStock) || 10) ? 'Low Stock' : 'In Stock',
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      
      // --- REMOVED: Redundant 'price' field is no longer needed ---
      delete productToSave.price; 

      if (editingProduct) {
        const productRef = doc(db, `artifacts/${canvasAppId}/public/data/products`, editingProduct.id);
        const { id, ...dataToUpdate } = productToSave;
        await updateDoc(productRef, dataToUpdate);
        setSuccessMessage('Product updated successfully!');
      } else {
        const productsCollectionRef = collection(db, `artifacts/${canvasAppId}/public/data/products`);
        await addDoc(productsCollectionRef, productToSave);
        setSuccessMessage('Product added successfully!');
      }

      setShowSuccessModal(true);
      closeAddEditModal();
    } catch (e) {
      console.error("Error saving document: ", e);
      setError("Failed to save product. Please try again.");
    } finally {
      setAddingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!db) {
      setError("Firestore not initialized.");
      return;
    }
    try {
      await deleteDoc(doc(db, `artifacts/${canvasAppId}/public/data/products`, productId));
      setSuccessMessage('Product deleted successfully!');
      setShowSuccessModal(true);
    } catch (e) {
      console.error("Error removing document: ", e);
      setError("Failed to delete product. Please try again.");
    } finally {
      setShowConfirmDeleteModal(false);
      setProductToDelete(null);
    }
  };

  const confirmDelete = (product) => {
    setProductToDelete(product);
    setShowConfirmDeleteModal(true);
  };

  const handleEditProduct = (productData) => {
    const variations = (productData.variations && productData.variations.length > 0)
      ? productData.variations
      : [{ name: 'Default', price: productData.price || productData.minPrice || '' }];
      
    const productWithImagesAndVariations = {
      ...productData,
      variations,
      imageUrls: Array.isArray(productData.imageUrls) ? productData.imageUrls : (productData.imageUrl ? [productData.imageUrl] : [])
    };
    setNewProduct(productWithImagesAndVariations);
    setEditingProduct(productWithImagesAndVariations);
    setShowAddProduct(true);
  };

  const handleExport = () => {
    const productsToExport = products.filter(product => {
        const categoryMatch = exportCategory === 'all' || product.category === exportCategory;
        
        if (!exportStartDate && !exportEndDate) {
          return categoryMatch;
        }

        if (!product.lastUpdated) {
          return false;
        }

        let dateMatch = true;
        const productDate = new Date(product.lastUpdated);

        if (exportStartDate) {
            dateMatch = dateMatch && (productDate >= new Date(exportStartDate));
        }
        if (exportEndDate) {
            const inclusiveEndDate = new Date(exportEndDate);
            inclusiveEndDate.setHours(23, 59, 59, 999);
            dateMatch = dateMatch && (productDate <= inclusiveEndDate);
        }

        return categoryMatch && dateMatch;
    });

    if (productsToExport.length === 0) {
        alert("No products found for the selected criteria.");
        return;
    }

    const headers = ['ID', 'Name', 'Description', 'Category', 'SKU', 'MinPrice', 'MaxPrice', 'Stock', 'Min Stock', 'Status', 'Last Updated', 'Image URL', 'Additional Image URLs'];
    const csvRows = [headers.join(',')];

    productsToExport.forEach(product => {
        const formatField = (field) => {
            const fieldStr = String(field ?? '');
            if (fieldStr.includes(',')) return `"${fieldStr.replace(/"/g, '""')}"`;
            return fieldStr;
        };
        const row = [
            product.id, product.name, product.description, product.category, product.sku,
            product.minPrice ?? product.price, product.maxPrice ?? product.price, product.stock, product.minStock, product.status,
            product.lastUpdated, product.imageUrl, `"${(product.imageUrls || []).join(', ')}"`,
        ].map(formatField);
        csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const fileName = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    setShowExportModal(false);
    setSuccessMessage('Products exported successfully!');
    setShowSuccessModal(true);
  };

  const closeAddEditModal = () => {
    setShowAddProduct(false);
    setNewProduct(initialNewProductState);
    setImageFiles([]);
    setEditingProduct(null);
  };

  if (loadingProducts) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <style>
        {`
          @keyframes fade-in-down {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in-down {
            animation: fade-in-down 0.3s ease-out forwards;
          }
        `}
      </style>

      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Product & Inventory</h1>
            <p className="text-slate-500 mt-1"></p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Package className="w-4 h-4" />
              <span>Live inventory</span>
            </div>
            <button 
              onClick={() => {
                setEditingProduct(null);
                closeAddEditModal();
                setShowAddProduct(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                <Package size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Products</p>
                <p className="text-2xl font-bold text-slate-800">{products.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-yellow-100 text-yellow-600 group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Low Stock</p>
                <p className="text-2xl font-bold text-slate-800">{products.filter(p => p.stock < p.minStock).length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100 text-green-600 group-hover:scale-110 transition-transform duration-300">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Value</p>
                {/* --- UPDATED: Uses the new Total Value from stats constant --- */}
                <p className="text-2xl font-bold text-slate-800">{stats[2].value}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-100 text-red-600 group-hover:scale-110 transition-transform duration-300">
                <ShoppingCart size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Out of Stock</p>
                <p className="text-2xl font-bold text-slate-800">{products.filter(p => p.stock === 0).length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search products by name, SKU, or price..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category === 'all' ? 'All Categories' : category}</option>
                ))}
              </select>
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  List
                </button>
              </div>
              <button 
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors duration-200"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </div>

      {/* Products Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'}
            </h2>
            <p className="text-slate-600">Manage your product inventory and pricing</p>
          </div>
          
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-xl font-medium mb-2 text-slate-600">No products found</p>
              <p className="text-sm text-slate-500">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your filters to see more results.' 
                  : 'Start by adding your first product to the inventory.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 group">
                    <div className="relative w-full h-48 overflow-hidden">
                      <img
                        src={product.imageUrl || `https://placehold.co/400x400/cccccc/ffffff?text=${product.name.substring(0,2)}`}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                        onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/400x400/cccccc/ffffff?text=No+Image"; }}
                      />
                      <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(product.stock, product.minStock)}`}>
                        {product.status}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg text-slate-900 mb-1 truncate">{product.name}</h3>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{product.description || 'No description available'}</p>
                      <div className="flex justify-between items-center text-sm text-slate-500 mb-3">
                        <span>SKU: {product.sku || 'N/A'}</span>
                        <span>Stock: <span className="font-medium text-slate-700">{product.stock}</span></span>
                      </div>
                      <div className="flex justify-between items-center">
                        {/* --- UPDATED: Displays price range --- */}
                        <span className="text-xl font-bold text-red-600">
                          {formatPriceRange(product.minPrice ?? product.price, product.maxPrice ?? product.price)}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Edit product"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => confirmDelete(product)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Delete product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-6 py-4">Product</th>
                    <th scope="col" className="px-6 py-4 hidden md:table-cell">Category</th>
                    <th scope="col" className="px-6 py-4 hidden lg:table-cell">SKU</th>
                    <th scope="col" className="px-6 py-4">Price</th>
                    <th scope="col" className="px-6 py-4">Stock</th>
                    <th scope="col" className="px-6 py-4 hidden lg:table-cell">Min Stock</th>
                    <th scope="col" className="px-6 py-4">Status</th>
                    <th scope="col" className="px-6 py-4 hidden md:table-cell">Last Updated</th>
                    <th scope="col" className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="bg-white border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                            <img 
                              className="w-full h-full object-cover" 
                              src={product.imageUrl || `https://placehold.co/40x40/cccccc/ffffff?text=${product.name.substring(0,2)}`} 
                              alt={product.name}
                              onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/40x40/cccccc/ffffff?text=NI"; }}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{product.name}</p>
                            <p className="text-xs text-slate-500 truncate max-w-xs">{product.description || 'No description'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-slate-900">{product.category}</span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <span className="text-slate-900 font-mono text-xs">{product.sku || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        {/* --- UPDATED: Displays price range --- */}
                        <span className="font-semibold text-slate-900">
                           {formatPriceRange(product.minPrice ?? product.price, product.maxPrice ?? product.price)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-900">{product.stock}</span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <span className="text-slate-600">{product.minStock || 10}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(product.stock, product.minStock)}`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-slate-500">{product.lastUpdated || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEditProduct(product)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Edit product"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => confirmDelete(product)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Delete product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-red-50 to-pink-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center">
                  <Package className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h2>
                  <p className="text-slate-600 mt-1">
                    {editingProduct ? 'Update product information' : 'Create a new product for your inventory'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeAddEditModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors duration-200"
                disabled={addingProduct || uploadingImage}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Basic Information */}
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Basic Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Product Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                          placeholder="Enter product name..."
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={newProduct.category}
                          onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                        >
                          <option value="">Select a category</option>
                          {categories.filter(c => c !== 'all').map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                        <textarea
                          value={newProduct.description}
                          onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                          placeholder="Brief description of the product..."
                          rows="4"
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Pricing & Inventory */}
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Pricing & Variations
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Product Variations <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-3">
                          {newProduct.variations.map((variation, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={variation.name}
                                onChange={(e) => handleVariationChange(index, 'name', e.target.value)}
                                placeholder="e.g., Small"
                                className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg"
                              />
                              <div className="relative w-1/2">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">₱</span>
                                <input
                                  type="number"
                                  value={variation.price}
                                  onChange={(e) => handleVariationChange(index, 'price', e.target.value)}
                                  placeholder="0.00"
                                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg"
                                />
                              </div>
                              <button
                                onClick={() => removeVariation(index)}
                                className="p-2 text-slate-400 hover:text-red-600 disabled:opacity-50"
                                disabled={newProduct.variations.length <= 1}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={addVariation}
                          className="mt-3 text-sm text-red-600 font-semibold flex items-center gap-1"
                        >
                          <Plus size={14} /> Add another variation
                        </button>
                      </div>
                      <div className="border-t border-slate-200 my-4"></div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">SKU</label>
                        <input
                          type="text"
                          value={newProduct.sku}
                          onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                          placeholder="Enter SKU..."
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Stock Quantity</label>
                          <input
                            type="number"
                            value={newProduct.stock}
                            onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                            placeholder="0"
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Minimum Stock Alert</label>
                          <input
                            type="number"
                            value={newProduct.minStock}
                            onChange={(e) => setNewProduct({ ...newProduct, minStock: e.target.value })}
                            placeholder="10"
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                          />
                        </div>
                      </div>
                       {parseInt(newProduct.stock) < parseInt(newProduct.minStock) && newProduct.stock !== '' && newProduct.minStock !== '' && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-yellow-600">
                                <AlertTriangle size={16} />
                                <span>Warning: Stock is below the minimum alert level.</span>
                            </div>
                        )}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Product Images (Max 3)
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3 min-h-[6rem]">
                            {newProduct.imageUrls.map((url, index) => (
                                <div key={`url-${index}`} className="relative group">
                                    <img src={url} alt={`Product image ${index + 1}`} className="w-full h-24 object-cover rounded-lg border border-slate-300"/>
                                    <button onClick={() => removeImageUrl(index)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 leading-none shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X size={14}/>
                                    </button>
                                </div>
                            ))}
                            {imageFiles.map((file, index) => (
                                <div key={`file-${index}`} className="relative group">
                                    <img src={URL.createObjectURL(file)} alt={`Staged image ${index + 1}`} className="w-full h-24 object-cover rounded-lg border border-slate-300"/>
                                    <button onClick={() => removeStagedImage(index)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 leading-none shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X size={14}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                      
                      {newProduct.imageUrls.length + imageFiles.length < 3 && (
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-red-400 transition-colors duration-200">
                          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                            id="image-upload"
                            multiple
                          />
                          <label
                            htmlFor="image-upload"
                            className="cursor-pointer text-sm text-slate-600 hover:text-red-600 transition-colors duration-200"
                          >
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </label>
                          <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
              <div className="text-sm text-slate-500">
                <span className="text-red-500">*</span> Required fields
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={closeAddEditModal}
                  className="px-6 py-3 text-slate-600 hover:text-slate-800 font-medium transition-colors duration-200"
                  disabled={addingProduct || uploadingImage}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProduct}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={addingProduct || uploadingImage}
                >
                  {addingProduct ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : uploadingImage ? (
                    <>
                      <Upload className="w-4 h-4" />
                      Uploading...
                    </>
                  ) : editingProduct ? (
                    <>
                      <Edit className="w-4 h-4" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Product
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Success Toast Notification */}
      {showSuccessModal && (
        <div className="fixed top-5 right-5 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-down z-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{successMessage}</span>
          <button onClick={() => setShowSuccessModal(false)} className="text-green-100 hover:text-white transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
             </svg>
          </button>
        </div>
      )}

      {/* Export Products Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Export Products</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                <select
                  value={exportCategory}
                  onChange={(e) => setExportCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">All Categories</option>
                  {categories.filter(c => c !== 'all').map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Filter is based on 'Last Updated' date. Leave dates blank to export all products in the selected category.
              </p>
            </div>
            <div className="flex items-center justify-end p-6 border-t border-slate-200 bg-slate-50 gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-6 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Confirmation Delete Modal */}
      {showConfirmDeleteModal && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm transform transition-all scale-100">
            <div className="p-6 text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-3">Confirm Deletion</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <span className="font-semibold">{productToDelete?.name}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowConfirmDeleteModal(false)}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteProduct(productToDelete.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}