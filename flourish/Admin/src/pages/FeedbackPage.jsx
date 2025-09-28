import React, { useState, useEffect, useMemo } from 'react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { db } from '../firebase';
// Make sure to import all necessary firestore functions
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import {
  Star,
  MessageCircleQuestion,
  Trash2,
  Send,
  X,
  Image as ImageIcon,
  BarChart2,
  StarHalf,
  ChevronDown,
  Filter,
  Search,
  TrendingUp,
  Users,
  Calendar,
  Eye,
  Reply,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  ClipboardList,
} from 'lucide-react';

// Enhanced StatCard component with gradient backgrounds and better visual hierarchy
const StatCard = ({ title, value, icon, children, gradient = false, trend = null }) => (
  <div className={`${gradient ? 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200' : 'bg-white border-slate-200'} p-6 rounded-xl border shadow-sm transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-[1.02] cursor-pointer group`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`${gradient ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${gradient ? 'text-red-700' : 'text-slate-800'}`}>{value}</p>
    </div>
    {children && <div className="mt-4">{children}</div>}
  </div>
);

// Enhanced Filter and Search Component
const FilterBar = ({ searchTerm, setSearchTerm, ratingFilter, setRatingFilter, statusFilter, setStatusFilter, activeView }) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
    <div className="flex flex-col md:flex-row gap-4 items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search by customer name or message..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>
      <div className="flex gap-3">
        {activeView === 'feedback' && (
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        )}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
        >
          <option value="">All Status</option>
          <option value="replied">Replied</option>
          <option value="new">Pending Reply</option>
        </select>
      </div>
    </div>
  </div>
);

// The Date Picker Component for the Header
const MonthYearPicker = ({ selectedDate, setSelectedDate }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-medium text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-200 hover:bg-red-100"
      >
        {selectedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-200 z-10">
          <DatePicker
            selected={selectedDate}
            onChange={(date) => {
              setSelectedDate(date);
              setIsOpen(false);
            }}
            inline
            showMonthYearPicker
            dateFormat="MMMM yyyy"
          />
        </div>
      )}
    </div>
  );
};


export default function FeedbackPage() {
  const [orderFeedbackList, setOrderFeedbackList] = useState([]);
  const [generalFeedbackList, setGeneralFeedbackList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [combinedFeedbackList, setCombinedFeedbackList] = useState([]);

  const [orderLoading, setOrderLoading] = useState(true);
  const [generalLoading, setGeneralLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);

  const [activeView, setActiveView] = useState('feedback'); // 'feedback' or 'reports'

  const [selectedDate, setSelectedDate] = useState(new Date());

  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isReplyModalVisible, setReplyModalVisible] = useState(false);
  const [currentReply, setCurrentReply] = useState('');

  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  const [isGeneralFeedbackModalVisible, setGeneralFeedbackModalVisible] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  const collectionMap = {
    order: 'feedback',
    general: 'generalFeedback',
    report: 'reports',
  };

  // Data fetching for Order Feedback
  useEffect(() => {
    const feedbackCollectionRef = collection(db, 'feedback');
    let q = query(feedbackCollectionRef, orderBy("createdAt", "desc"));
    if (statusFilter) {
      q = query(feedbackCollectionRef, where("status", "==", statusFilter), orderBy("createdAt", "desc"));
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const feedbacks = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const feedbackDate = data.createdAt?.toDate() || new Date();
        return {
          id: doc.id,
          type: 'order',
          name: data.customerName,
          email: data.customerEmail,
          subject: data.productName || 'Order Feedback',
          message: data.text || 'No feedback message provided.',
          rating: data.rating,
          date: feedbackDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          rawDate: feedbackDate,
          adminReply: data.adminReply || null,
          feedbackImageUrl: data.imageUrl || null,
          status: data.status || (data.adminReply ? 'replied' : 'new'),
          orderId: data.orderId || null,
          productId: data.productId || null, // Assuming productId is stored with feedback
        };
      });
      setOrderFeedbackList(feedbacks);
      setOrderLoading(false);
    }, (error) => {
      console.error("Firestore Error (Order Feedback):", error);
      setOrderLoading(false);
    });
    return () => unsubscribe();
  }, [statusFilter]);

  // Data fetching for General Feedback
  useEffect(() => {
    const generalFeedbackCollectionRef = collection(db, 'generalFeedback');
    let q = query(generalFeedbackCollectionRef, orderBy("createdAt", "desc"));
    if (statusFilter) {
      q = query(generalFeedbackCollectionRef, where("status", "==", statusFilter), orderBy("createdAt", "desc"));
    }
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const feedbacks = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const feedbackDate = data.createdAt?.toDate() || new Date();
        return {
          id: doc.id,
          type: 'general',
          name: data.customerName || 'Anonymous User',
          email: data.customerEmail || 'N/A',
          subject: 'General Feedback',
          message: data.text || 'No feedback message provided.',
          rating: 0,
          date: feedbackDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          rawDate: feedbackDate,
          adminReply: data.adminReply || null,
          feedbackImageUrl: data.imageUrl || null,
          status: data.status || (data.adminReply ? 'replied' : 'new'),
        };
      });
      setGeneralFeedbackList(feedbacks);
      setGeneralLoading(false);
    }, (error) => {
      console.error("Firestore Error (General Feedback):", error);
      setGeneralLoading(false);
    });
    return () => unsubscribe();
  }, [statusFilter]);

  // Data fetching for Reports
  useEffect(() => {
    const reportsCollectionRef = collection(db, 'reports');
    let q = query(reportsCollectionRef, orderBy("createdAt", "desc"));
    if (statusFilter) {
      q = query(reportsCollectionRef, where("status", "==", statusFilter), orderBy("createdAt", "desc"));
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const reports = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const reportDate = data.createdAt?.toDate() || new Date();
        return {
          id: doc.id,
          type: 'report',
          name: data.customerName || 'Anonymous User',
          email: data.customerEmail || 'N/A',
          subject: `Report: ${data.category}`,
          category: data.category,
          message: data.details || 'No details provided.',
          rating: 0,
          date: reportDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          rawDate: reportDate,
          adminReply: data.adminReply || null,
          feedbackImageUrl: data.imageUrl || null,
          status: data.status || (data.adminReply ? 'replied' : 'new'),
          orderId: data.orderId || null,
        };
      });
      setReportsList(reports);
      setReportsLoading(false);
    }, (error) => {
      console.error("Firestore Error (Reports):", error);
      setReportsLoading(false);
    });
    return () => unsubscribe();
  }, [statusFilter]);


  // Combine and sort all data
  useEffect(() => {
    const combined = [...orderFeedbackList, ...generalFeedbackList, ...reportsList];
    combined.sort((a, b) => b.rawDate - a.rawDate);
    setCombinedFeedbackList(combined);
  }, [orderFeedbackList, generalFeedbackList, reportsList]);


  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, searchTerm, ratingFilter, statusFilter, activeView]);

  const filteredFeedbackList = useMemo(() => {
    let baseList;
    if (activeView === 'reports') {
      baseList = combinedFeedbackList.filter(fb => fb.type === 'report');
    } else {
      baseList = combinedFeedbackList.filter(fb => fb.type === 'order' || fb.type === 'general');
    }

    let filtered = baseList.filter(fb =>
        fb.rawDate.getFullYear() === selectedDate.getFullYear() &&
        fb.rawDate.getMonth() === selectedDate.getMonth()
    );

    if (searchTerm) {
      filtered = filtered.filter(fb =>
        fb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fb.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fb.subject.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (ratingFilter && activeView === 'feedback') {
      filtered = filtered.filter(fb => fb.type === 'order' && fb.rating === parseInt(ratingFilter));
    }

    return filtered;
  }, [combinedFeedbackList, selectedDate, searchTerm, ratingFilter, activeView]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentFeedback = filteredFeedbackList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredFeedbackList.length / itemsPerPage);

  const nextPage = () => { if (currentPage < totalPages) { setCurrentPage(currentPage + 1); } };
  const prevPage = () => { if (currentPage > 1) { setCurrentPage(currentPage - 1); } };

  const stats = useMemo(() => {
    const orderReviews = combinedFeedbackList.filter(fb => fb.type === 'order');
    const totalReviews = orderReviews.length;
    if (totalReviews === 0) return { totalReviews: 0, averageRating: 0, distribution: {}, percentages: {} };
    const averageRating = orderReviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews;
    const distribution = orderReviews.reduce((acc, curr) => {
        acc[curr.rating] = (acc[curr.rating] || 0) + 1;
        return acc;
    }, { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 });
    const percentages = Object.keys(distribution).reduce((acc, key) => {
        acc[key] = (distribution[key] / totalReviews) * 100;
        return acc;
    }, {});
    return { totalReviews, averageRating, distribution, percentages };
  }, [combinedFeedbackList]);

  const handleImageClick = (url) => { setSelectedImageUrl(url); setImageModalVisible(true); };

  const handleDeleteClick = (feedback) => { setSelectedFeedback(feedback); setDeleteModalVisible(true); };
  const confirmDelete = async () => {
    if (!selectedFeedback) return;
    const collectionName = collectionMap[selectedFeedback.type];
    if (!collectionName) return;

    const feedbackDocRef = doc(db, collectionName, selectedFeedback.id);
    try {
      await deleteDoc(feedbackDocRef);
    } catch (error) { console.error("Error deleting feedback: ", error); }
    finally { setDeleteModalVisible(false); setSelectedFeedback(null); }
  };

  const handleReplyClick = (feedback) => { setSelectedFeedback(feedback); setReplyModalVisible(true); };
  const handleSendReply = async () => {
    if (!selectedFeedback || !currentReply.trim()) return;
    const collectionName = collectionMap[selectedFeedback.type];
    if (!collectionName) return;

    const feedbackDocRef = doc(db, collectionName, selectedFeedback.id);
    
    try {
      // Step 1: Update the original feedback document
      await updateDoc(feedbackDocRef, {
        adminReply: currentReply,
        repliedAt: serverTimestamp(),
        status: 'replied'
      });

      // Step 2: If it's an order or report feedback, update the order document
      if ((selectedFeedback.type === 'order' || selectedFeedback.type === 'report') && selectedFeedback.orderId) {
        const orderDocRef = doc(db, 'orders', selectedFeedback.orderId);
        const orderSnap = await getDoc(orderDocRef);
        if (orderSnap.exists()) {
          const updateData = selectedFeedback.type === 'order' 
            ? { adminReply: currentReply } 
            : { 'reportInfo.adminReply': currentReply };
          await updateDoc(orderDocRef, updateData);
        } else {
          console.warn(`Order document with ID ${selectedFeedback.orderId} not found.`);
        }
      }

      // Step 3: If it's an order feedback with a productId, update the product document
      if (selectedFeedback.type === 'order' && selectedFeedback.productId) {
        const productDocRef = doc(db, 'products', selectedFeedback.productId);
        const productSnap = await getDoc(productDocRef);
        if (productSnap.exists()) {
            const productData = productSnap.data();
            const reviews = productData.reviews || [];
            
            // Find the review by its feedback ID and update it
            const reviewIndex = reviews.findIndex(review => review.feedbackId === selectedFeedback.id);
            
            if (reviewIndex > -1) {
                reviews[reviewIndex].adminReply = currentReply;
                reviews[reviewIndex].repliedAt = new Date(); // Use client time or serverTimestamp
                await updateDoc(productDocRef, { reviews });
            } else {
                console.warn(`Review with feedbackId ${selectedFeedback.id} not found in product ${selectedFeedback.productId}.`);
            }
        } else {
            console.warn(`Product document with ID ${selectedFeedback.productId} not found.`);
        }
      }

    } catch (error) { 
      console.error("Error sending reply: ", error); 
    } finally { 
      setReplyModalVisible(false); 
      setCurrentReply(''); 
      setSelectedFeedback(null); 
    }
  };

  const getStarRating = (rating) => Array(5).fill(0).map((_, i) => ( <Star key={i} className={`w-5 h-5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} /> ));
  const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase();
  const RatingBar = ({ star, count, percentage }) => ( <div className="flex items-center gap-3 text-sm"> <div className="flex items-center gap-1"> <span className="font-medium text-slate-600">{star}</span> <Star size={16} className="text-yellow-400 fill-yellow-400" /> </div> <div className="flex-1 bg-slate-200 rounded-full h-2"> <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${percentage}%` }}></div> </div> <span className="w-10 text-right font-medium text-slate-500">{count}</span> </div> );

  const loading = orderLoading || generalLoading || reportsLoading;

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-50 font-sans">
      {/* --- Modals --- */}
      {isGeneralFeedbackModalVisible && ( <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex justify-center items-center z-50 p-4"> <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all"> <div className="flex justify-between items-center p-5 border-b border-slate-200"> <div className="flex items-center gap-3"> <ClipboardList className="text-slate-600" /> <h2 className="text-xl font-bold text-slate-800">General Feedback List</h2> </div> <button onClick={() => setGeneralFeedbackModalVisible(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"> <X size={24} /> </button> </div> <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4 bg-slate-50"> {generalFeedbackList.length > 0 ? ( generalFeedbackList.map((feedback) => ( <div key={feedback.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm"> <div className="flex justify-between items-start mb-2"> <div> <p className="font-semibold text-slate-800">{feedback.name}</p> {feedback.email && feedback.email !== 'N/A' && ( <p className="text-xs text-slate-500">{feedback.email}</p> )} </div> <p className="text-xs text-slate-400 flex-shrink-0 ml-2">{feedback.date}</p> </div> <p className="text-slate-700 italic leading-relaxed mb-3">"{feedback.message}"</p> {feedback.feedbackImageUrl && ( <img src={feedback.feedbackImageUrl} alt="Feedback attachment" className="rounded-lg max-w-xs h-auto cursor-pointer transition-transform duration-300 hover:scale-105" onClick={() => { setGeneralFeedbackModalVisible(false); handleImageClick(feedback.feedbackImageUrl); }} /> )} {feedback.adminReply && ( <div className="mt-4 bg-red-50 p-3 rounded-lg border-l-4 border-red-400"> <p className="font-semibold text-sm text-red-700 mb-1">Your Reply:</p> <p className="text-sm text-slate-700 leading-relaxed">{feedback.adminReply}</p> </div> )} </div> )) ) : ( <div className="text-center py-10"> <p className="text-slate-500">No general feedback found.</p> </div> )} </div> </div> </div> )}
      {isImageModalVisible && ( <div onClick={() => setImageModalVisible(false)} className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex justify-center items-center z-50 p-4"> <img src={selectedImageUrl} alt="Feedback" className="max-w-full max-h-full rounded-lg shadow-2xl" /> <button onClick={() => setImageModalVisible(false)} className="absolute top-4 right-4 text-white hover:text-slate-300"><X size={30} /></button> </div> )}
      {isDeleteModalVisible && ( <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex justify-center items-center z-50"> <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm"> <h2 className="text-xl font-bold text-slate-800 mb-4">Confirm Deletion</h2> <p className="text-slate-600 mb-6">Are you sure you want to delete this? This action cannot be undone.</p> <div className="flex justify-end gap-4"> <button onClick={() => setDeleteModalVisible(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300">Cancel</button> <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button> </div> </div> </div> )}
      {isReplyModalVisible && ( <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex justify-center items-center z-50"> <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md"> <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-slate-800">Public Comment</h2><button onClick={() => setReplyModalVisible(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button></div> <textarea value={currentReply} onChange={(e) => setCurrentReply(e.target.value)} placeholder="Type your public comment here..." className="w-full p-3 border border-slate-300 rounded-lg h-32 resize-y focus:ring-2 focus:ring-red-500" /> <div className="flex justify-end mt-4"><button onClick={handleSendReply} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"><Send size={16} /> Send Comment</button></div> </div> </div> )}

      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Customer Feedback</h1>
          <p className="text-slate-500 mt-1"></p>
        </div>
        <MonthYearPicker selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Order Reviews" value={loading ? '...' : stats.totalReviews} icon={<MessageCircleQuestion className="text-red-500" />} />
        <StatCard title="Average Rating" value={loading ? '...' : stats.averageRating.toFixed(1)} icon={<StarHalf className="text-yellow-500" />} />
        <StatCard title="Item Reports" value={loading ? '...' : reportsList.length} icon={<AlertCircle className="text-orange-500" />}>
           <div className="mt-4 text-xs text-slate-500">
            {reportsList.filter(r => r.status === 'new').length} reports pending reply.
           </div>
        </StatCard>
        <StatCard title="General Feedback" value={loading ? '...' : generalFeedbackList.length} icon={<ClipboardList className="text-blue-500" />}>
          <button onClick={() => setGeneralFeedbackModalVisible(true)} className="mt-4 w-full text-center text-sm font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 py-2 rounded-lg transition-colors">
            View List
          </button>
        </StatCard>
      </section>

      <main>
        <div className="mb-6 flex border-b border-slate-200">
          <button onClick={() => setActiveView('feedback')} className={`px-4 py-2 text-sm font-semibold transition-colors ${activeView === 'feedback' ? 'border-b-2 border-red-600 text-red-600' : 'text-slate-500 hover:text-slate-800'}`}>
            All Feedback
          </button>
          <button onClick={() => setActiveView('reports')} className={`px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-2 ${activeView === 'reports' ? 'border-b-2 border-red-600 text-red-600' : 'text-slate-500 hover:text-slate-800'}`}>
            <AlertCircle size={14} /> Item Reports
          </button>
        </div>

        {!loading && combinedFeedbackList.length > 0 && (
          <FilterBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} ratingFilter={ratingFilter} setRatingFilter={setRatingFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} activeView={activeView} />
        )}

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div><p className="text-slate-500">Loading data...</p></div>
        ) : filteredFeedbackList.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm">
            <MessageCircleQuestion className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-xl font-medium mb-2 text-slate-600">No items found</p>
            <p className="text-sm text-slate-500">{searchTerm || ratingFilter || statusFilter ? 'Try adjusting your filters to see more results.' : `No ${activeView === 'reports' ? 'reports' : 'feedback'} were submitted for this month.`}</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {currentFeedback.map((feedback) => (
                <div key={feedback.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
                  {feedback.type === 'report' ? (
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-yellow-100 text-orange-600 flex items-center justify-center font-bold text-lg flex-shrink-0 group-hover:scale-105 transition-all duration-300"><AlertCircle size={24} /></div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${feedback.adminReply ? 'bg-green-500' : 'bg-orange-400'}`}><CheckCircle2 size={10} className="text-white m-0.5" /></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800">{feedback.name}</p>
                            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500 mt-1">
                              <div className="flex items-center gap-1"><Calendar size={12} /><span>{feedback.date}</span></div>
                              <span>•</span>
                              <span className="font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">{feedback.category}</span>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${feedback.adminReply ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{feedback.adminReply ? 'Replied' : 'Pending'}</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg mb-4">
                          <div className="flex items-start gap-2"><MessageSquare size={16} className="text-slate-400 mt-0.5 flex-shrink-0" /><p className="text-slate-700 italic leading-relaxed">"{feedback.message}"</p></div>
                          {feedback.feedbackImageUrl && (<div className="mt-3 flex items-center gap-2"><ImageIcon size={14} className="text-slate-400" /><img src={feedback.feedbackImageUrl} alt="Attachment" className="rounded-lg w-20 h-20 object-cover cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-lg" onClick={() => handleImageClick(feedback.feedbackImageUrl)} /></div>)}
                        </div>
                        {feedback.adminReply && (<div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg border-l-4 border-red-500 mb-4"><div className="flex items-center gap-2 mb-2"><Reply size={16} className="text-red-600" /><p className="font-semibold text-sm text-red-700">Your Reply</p></div><p className="text-sm text-slate-700 leading-relaxed">{feedback.adminReply}</p></div>)}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 text-xs text-slate-500">{feedback.email && feedback.email !== 'N/A' && <><Users size={12} /><span>{feedback.email}</span></>}</div>
                          <div className="flex items-center gap-2">{!feedback.adminReply && (<button onClick={() => handleReplyClick(feedback)} className="flex items-center gap-2 bg-red-600 text-white font-medium text-sm px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-300"><Reply size={14} />Reply</button>)}<button onClick={() => handleDeleteClick(feedback)} className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all duration-300" title="Delete"><Trash2 size={16} /></button></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-100 to-pink-100 text-red-600 flex items-center justify-center font-bold text-lg flex-shrink-0 group-hover:scale-105 transition-all duration-300">{feedback.type === 'order' ? getInitials(feedback.name) : <MessageCircleQuestion size={24} />}</div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${feedback.adminReply ? 'bg-green-500' : 'bg-orange-400'}`}><CheckCircle2 size={10} className="text-white m-0.5" /></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1"><div className="flex items-center gap-2 mb-1"><p className="font-semibold text-slate-800">{feedback.name}</p><span className={`px-2 py-1 text-xs font-medium rounded-full ${feedback.adminReply ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{feedback.adminReply ? 'Replied' : 'Pending'}</span></div><div className="flex items-center gap-2 text-xs text-slate-500"><Calendar size={12} /><span>{feedback.date}</span><span>•</span><span className="font-medium">{feedback.subject}</span></div></div>
                          {feedback.type === 'order' && (<div className="flex items-center gap-1 ml-4">{getStarRating(feedback.rating)}<span className="ml-1 text-sm font-medium text-slate-600">({feedback.rating})</span></div>)}
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg mb-4"><div className="flex items-start gap-2"><MessageSquare size={16} className="text-slate-400 mt-0.5 flex-shrink-0" /><p className="text-slate-700 italic leading-relaxed">"{feedback.message}"</p></div>{feedback.feedbackImageUrl && (<div className="mt-3 flex items-center gap-2"><ImageIcon size={14} className="text-slate-400" /><img src={feedback.feedbackImageUrl} alt="Attachment" className="rounded-lg w-20 h-20 object-cover cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-lg" onClick={() => handleImageClick(feedback.feedbackImageUrl)} /></div>)}</div>
                        {feedback.adminReply && (<div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg border-l-4 border-red-500 mb-4"><div className="flex items-center gap-2 mb-2"><Reply size={16} className="text-red-600" /><p className="font-semibold text-sm text-red-700">Your Reply</p></div><p className="text-sm text-slate-700 leading-relaxed">{feedback.adminReply}</p></div>)}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 text-xs text-slate-500">{feedback.email && feedback.email !== 'N/A' && <><Users size={12} /><span>{feedback.email}</span></>}</div>
                          <div className="flex items-center gap-2">
                            {!feedback.adminReply && (
                                feedback.type === 'order' ? (
                                    <>
                                        <button onClick={() => handleReplyClick(feedback)} className="flex items-center gap-2 bg-slate-600 text-white font-medium text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors duration-300">
                                            <Reply size={14} />
                                            Reply
                                        </button>
                                        <button onClick={() => handleReplyClick(feedback)} className="flex items-center gap-2 bg-red-600 text-white font-medium text-sm px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-300">
                                            <Send size={14} />
                                            Post
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => handleReplyClick(feedback)} className="flex items-center gap-2 bg-red-600 text-white font-medium text-sm px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-300">
                                        <Reply size={14} />
                                        Reply
                                    </button>
                                )
                            )}
                            <button onClick={() => handleDeleteClick(feedback)} className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all duration-300" title="Delete"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 border-t border-slate-200 pt-4">
                <button onClick={prevPage} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                <button onClick={nextPage} disabled={currentPage === totalPages} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}