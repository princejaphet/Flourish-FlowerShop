import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, where, orderBy } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db } from '../firebase';
import {
  Search,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Check,
  Truck,
  X,
  Trash2,
  Package,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Activity,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download
} from 'lucide-react';

export default function OrderAndStatusPage() {
  // --- State Management ---
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [currentFilter, setCurrentFilter] = useState('pending'); // Default filter changed to 'pending'
  const [searchTerm, setSearchTerm] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState(null);
  
  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // Show 5 orders per page

  // --- Functions for Component Logic ---

  // Auth Effect: Handles user authentication
  useEffect(() => {
    const authInstance = getAuth();
    const unsubscribeAuth = onAuthStateChanged(authInstance, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        try {
          const anonymousUser = await signInAnonymously(authInstance);
          setUserId(anonymousUser.user.uid);
        } catch (authError) {
          console.error("Error signing in anonymously:", authError);
          setError("Authentication failed. Please check Firebase setup.");
          setLoading(false);
        }
      }
    });

    if (!db) {
      setError("Firestore database not initialized.");
      setLoading(false);
      return;
    }

    return () => unsubscribeAuth();
  }, []);

  // Data Fetching Effect: fetches orders based on filters
  useEffect(() => {
    if (!userId) {
      return;
    }

    setLoading(true);
    // Corrected path to point directly to the top-level 'orders' collection
    const ordersCollectionRef = collection(db, 'orders');
    let q;

    const baseQuery = (status) => query(
      ordersCollectionRef, 
      where("status", "==", status), 
      orderBy("timestamp", "desc")
    );

    switch (currentFilter) {
      case 'pending':
        q = baseQuery('Pending');
        break;
      case 'processing':
        q = baseQuery('Processing');
        break;
      case 'delivered':
        q = baseQuery('Delivered');
        break;
      case 'cancelled':
        q = baseQuery('Cancelled');
        break;
      default: // 'all'
        q = query(ordersCollectionRef, orderBy("timestamp", "desc"));
        break;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersList);
      setLoading(false);
    }, (err) => {
      console.error(`Error fetching ${currentFilter} orders: `, err);
      setError(`Failed to fetch orders. Error: ${err.message}. Check Firebase rules and indexes.`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, currentFilter]);
  
  // --- EFFECT TO RESET PAGE ON FILTER/SEARCH CHANGE ---
  useEffect(() => {
    setCurrentPage(1);
  }, [currentFilter, searchTerm]);


  // Event Handlers
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      // Corrected path for updating a document in the 'orders' collection
      const orderDocRef = doc(db, 'orders', orderId);
      await updateDoc(orderDocRef, { status: newStatus });
      
      const order = orders.find(o => o.id === orderId);
      if (['Processing', 'Delivered'].includes(newStatus) && order?.customerEmail) {
        // eslint-disable-next-line no-undef
        const serverBaseUrl = process.env.NODE_ENV === 'production' ? 'YOUR_DEPLOYED_SERVER_URL' : 'http://localhost:3000';
        const payload = { customerEmail: order.customerEmail, customerName: order.customerName, orderId, status: newStatus, productName: order.product?.name || 'Product' };

        const response = await fetch(`${serverBaseUrl}/send-order-email`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
        
        if (response.ok) {
          console.log(`Order ${orderId.substring(0, 8)}... status updated to ${newStatus} and email sent!`);
        } else {
          const errorText = await response.text();
          console.error(`Order ${orderId.substring(0, 8)}... status updated, but email failed: ${errorText}`);
        }
      } else {
        console.log(`Order ${orderId.substring(0, 8)}... status updated to ${newStatus}!`);
      }
    } catch (error) {
      console.error(`Failed to update order ${orderId.substring(0, 8)}...: ${error.message}`);
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      // Corrected path for deleting a document in the 'orders' collection
      const orderDocRef = doc(db, 'orders', orderId);
      await deleteDoc(orderDocRef);
      console.log(`Order ${orderId.substring(0, 8)}... has been deleted!`);
    } catch (error) {
      console.error(`Failed to delete order ${orderId.substring(0, 8)}...: ${error.message}`);
    }
  };

  const openReviewModal = (order) => {
    setSelectedOrderForReview(order);
    setIsReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setIsReviewModalOpen(false);
    setSelectedOrderForReview(null);
  };

  // Filter and Search Logic
  const filteredOrders = orders.filter(order => {
    const statusMatch = currentFilter === 'all' || order.status?.toLowerCase() === currentFilter;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const searchMatch = !searchTerm ||
      order.customerName?.toLowerCase().includes(lowerCaseSearchTerm) ||
      order.product?.name?.toLowerCase().includes(lowerCaseSearchTerm) ||
      order.deliveryAddress?.phone?.includes(lowerCaseSearchTerm) ||
      order.notes?.toLowerCase().includes(lowerCaseSearchTerm) ||
      order.id?.toLowerCase().includes(lowerCaseSearchTerm) ||
      (order.timestamp?.toDate && new Date(order.timestamp.toDate()).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).toLowerCase().includes(lowerCaseSearchTerm));
    return statusMatch && searchMatch;
  });
  
  // --- PAGINATION LOGIC ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // JSX Helper Functions
  const statusColorClass = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Processing': return 'bg-blue-100 text-blue-800';
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // A helper component for displaying key-value pairs in the modal
  const DetailItem = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800 text-right">{value}</p>
    </div>
  );

  // --- Render Logic ---

  // Calculate order statistics
  const orderStats = {
    total: orders.length,
    pending: orders.filter(order => order.status === 'Pending').length,
    processing: orders.filter(order => order.status === 'Processing').length,
    delivered: orders.filter(order => order.status === 'Delivered').length,
    cancelled: orders.filter(order => order.status === 'Cancelled').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Orders</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Order Management</h1>
            <p className="text-slate-500 mt-1">Track and manage all customer orders in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Activity className="w-4 h-4" />
              <span>Live data</span>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors duration-200">
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-slate-800">{orderStats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-yellow-100 text-yellow-600 group-hover:scale-110 transition-transform duration-300">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Pending</p>
                <p className="text-2xl font-bold text-slate-800">{orderStats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                <Package size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Processing</p>
                <p className="text-2xl font-bold text-slate-800">{orderStats.processing}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100 text-green-600 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Delivered</p>
                <p className="text-2xl font-bold text-slate-800">{orderStats.delivered}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-100 text-red-600 group-hover:scale-110 transition-transform duration-300">
                <XCircle size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Cancelled</p>
                <p className="text-2xl font-bold text-slate-800">{orderStats.cancelled}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search orders by customer, product, date, or order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setCurrentFilter('pending')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    currentFilter === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setCurrentFilter('processing')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    currentFilter === 'processing' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Processing
                </button>
                <button
                  onClick={() => setCurrentFilter('delivered')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    currentFilter === 'delivered' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Delivered
                </button>
                <button
                  onClick={() => setCurrentFilter('cancelled')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    currentFilter === 'cancelled' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Cancelled
                </button>
                <button
                  onClick={() => setCurrentFilter('all')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    currentFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  All
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
            </h2>
            <p className="text-slate-600">Manage your customer orders and update their status</p>
          </div>
          
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-xl font-medium mb-2 text-slate-600">No orders found</p>
              <p className="text-sm text-slate-500">
                {searchTerm || currentFilter !== 'all' 
                  ? 'Try adjusting your filters to see more results.' 
                  : 'Orders will appear here once customers start placing them.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-6 py-4">Customer</th>
                      <th scope="col" className="px-6 py-4">Product</th>
                      <th scope="col" className="px-6 py-4">Total</th>
                      <th scope="col" className="px-6 py-4">Status</th>
                      <th scope="col" className="px-6 py-4">Date</th>
                      <th scope="col" className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentOrders.map((order) => (
                      <tr key={order.id} className="bg-white border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-red-600 text-sm font-semibold">
                                {order.customerName?.charAt(0)?.toUpperCase() || 'N'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{order.customerName}</p>
                              <p className="text-xs text-slate-500">{order.customerEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-900">{order.product?.name || 'N/A'}</p>
                            {order.product?.addons?.length > 0 && (
                              <p className="text-xs text-slate-500">+{order.product.addons.length} addons</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-900">
                            ₱{order.totalAmount?.toFixed(2) || '0.00'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar size={14} />
                            <span className="text-sm">
                              {order.timestamp?.toDate ? new Date(order.timestamp.toDate()).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => openReviewModal(order)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                              title="View order details"
                            >
                              <Eye size={16} />
                            </button>
                            {order.status === 'Pending' && (
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'Processing')}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                title="Accept order"
                              >
                                <Check size={16} />
                              </button>
                            )}
                            {order.status === 'Processing' && (
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'Delivered')}
                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                                title="Mark as delivered"
                              >
                                <Truck size={16} />
                              </button>
                            )}
                            {order.status !== 'Cancelled' && (
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'Cancelled')}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                title="Cancel order"
                              >
                                <X size={16} />
                              </button>
                            )}
                            <button 
                              onClick={() => deleteOrder(order.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="Delete order"
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-200">
                  <div className="text-sm text-slate-600">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredOrders.length)} of {filteredOrders.length} orders
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>
                    <span className="px-3 py-2 text-sm text-slate-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* --- Review Order Modal --- */}
      {isReviewModalOpen && selectedOrderForReview && (
        <div className="fixed inset-0  bg-black/50 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl transform transition-all duration-300 animate-scale-in flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center space-x-4">
                <div className="bg-pink-100 p-3 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Order Details</h3>
                  <p className="text-sm text-gray-500 truncate">ID: {selectedOrderForReview.id}</p>
                </div>
              </div>
              <button onClick={closeReviewModal} className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto bg-gray-50 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-3 space-y-6">
                  {/* Product Summary Card */}
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Product Summary</h4>
                    <DetailItem label="Product Name" value={selectedOrderForReview.product.name} />
                    <DetailItem label="Base Price" value={`₱${selectedOrderForReview.product.price?.toFixed(2) || '0.00'}`} />
                    <DetailItem label="Quantity" value={selectedOrderForReview.product.quantity || 1} />
                    {selectedOrderForReview.product?.addons?.length > 0 && (
                      <div className="pt-3 mt-3 border-t border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-600 mb-2">Selected Add-ons:</h5>
                        <ul className="space-y-1">
                          {selectedOrderForReview.product.addons.map((addon, index) => (
                            <li key={index} className="flex justify-between text-sm text-gray-700">
                              <span>{addon.name}</span>
                              <span className="font-mono">₱{addon.price?.toFixed(2) || '0.00'}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                   {/* Customer Notes Card */}
                   <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">Notes from Customer</h4>
                      <p className="text-sm text-gray-600 italic">
                        {selectedOrderForReview.notes || 'No special instructions provided.'}
                      </p>
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Order Summary Card */}
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Order Status</h4>
                     <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <p className="text-sm text-gray-500">Current Status</p>
                        <span className={`px-3 py-1 text-sm leading-5 font-semibold rounded-full ${statusColorClass(selectedOrderForReview.status)}`}>
                            {selectedOrderForReview.status}
                        </span>
                    </div>
                    <DetailItem label="Order Date" value={selectedOrderForReview.timestamp?.toDate ? new Date(selectedOrderForReview.timestamp.toDate()).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}/>
                    <DetailItem label="Payment Method" value={selectedOrderForReview.paymentDetails?.method || 'N/A'} />
                     <div className="flex justify-between items-center pt-4 mt-4 border-t-2 border-dashed border-gray-300">
                        <p className="text-base font-bold text-gray-800">Total Amount</p>
                        <p className="text-xl font-bold text-pink-600">₱{selectedOrderForReview.totalAmount?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>

                  {/* Customer & Delivery Card */}
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Recipient Details</h4>
                    <DetailItem label="Customer Name" value={selectedOrderForReview.customerName} />
                    <DetailItem label="Customer Email" value={selectedOrderForReview.customerEmail} />
                    <DetailItem label="Recipient Name" value={selectedOrderForReview.deliveryAddress?.name || 'N/A'} />
                    <DetailItem label="Recipient Phone" value={selectedOrderForReview.deliveryAddress?.phone || 'N/A'} />
                    <div className="pt-2 mt-2 border-t border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Delivery Address</p>
                        <p className="text-sm font-medium text-gray-800">
                            {selectedOrderForReview.deliveryAddress?.address || 'No address provided.'}
                        </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-gray-200 flex justify-end flex-shrink-0">
              <button onClick={closeReviewModal} className="px-6 py-2 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all duration-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}