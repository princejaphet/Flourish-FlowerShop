import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, getDocs, where } from 'firebase/firestore';
import {
  Search,
  User,
  Mail,
  Phone,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Users,
  TrendingUp,
  Calendar,
  Star,
  Filter,
  Download,
  Eye,
  MoreHorizontal,
  UserCheck,
  UserPlus,
  Activity,
  Clock,
  MapPin,
  CreditCard,
  X,
  Package,
  DollarSign,
  History,
  MessageCircle,
  Edit,
  Trash2
} from 'lucide-react';

// Enhanced Stats Card Component
const StatsCard = ({ title, value, icon, trend = null, color = "red" }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-xl bg-${color}-100 text-${color}-600 group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  </div>
);

// Enhanced Filter Bar Component
const FilterBar = ({ searchQuery, setSearchQuery, sortBy, setSortBy, filterBy, setFilterBy }) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
    <div className="flex flex-col md:flex-row gap-4 items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search customers by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>
      <div className="flex gap-3">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
        >
          <option value="name">Sort by Name</option>
          <option value="orders">Sort by Orders</option>
          <option value="recent">Sort by Recent</option>
        </select>
        <select
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
        >
          <option value="all">All Customers</option>
          <option value="active">Active (5+ Orders)</option>
          <option value="new">New (1-2 Orders)</option>
        </select>
        <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors duration-200">
          <Download size={16} />
          Export
        </button>
      </div>
    </div>
  </div>
);

// Enhanced Customer Card Component
const CustomerCard = ({ customer, onViewDetails }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleMenuAction = (action) => {
    setShowDropdown(false);
    switch (action) {
      case 'view':
        onViewDetails(customer);
        break;
      case 'edit':
        console.log('Edit customer:', customer);
        break;
      case 'delete':
        console.log('Delete customer:', customer);
        break;
      case 'message':
        console.log('Message customer:', customer);
        break;
      default:
        break;
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              <span className="text-red-600 text-sm font-semibold">
                {customer.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-900 text-lg truncate" title={customer.name}>
              {customer.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1 min-w-0">
              <Mail size={14} className="flex-shrink-0" />
              <span className="truncate" title={customer.email}>{customer.email}</span>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 ml-2 relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-200"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-10">
              <button
                onClick={() => handleMenuAction('view')}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Eye size={16} />
                View Details
              </button>
              <button
                onClick={() => handleMenuAction('message')}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <MessageCircle size={16} />
                Send Message
              </button>
              <button
                onClick={() => handleMenuAction('edit')}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Edit size={16} />
                Edit Customer
              </button>
              <hr className="my-1 border-slate-200" />
              <button
                onClick={() => handleMenuAction('delete')}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete Customer
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-slate-600 mb-1">
            <ShoppingBag size={14} />
            <span className="text-xs font-medium">Total Orders</span>
          </div>
          <p className="text-lg font-bold text-slate-800">{customer.totalOrders}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-slate-600 mb-1">
            <Calendar size={14} />
            <span className="text-xs font-medium">Last Order</span>
          </div>
          <p className="text-sm font-medium text-slate-700">{customer.lastOrder}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone size={14} className="text-slate-400" />
          <span className="text-sm text-slate-600">{customer.phone}</span>
        </div>
        <button
          onClick={() => onViewDetails(customer)}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
          title="View customer details"
        >
          <Eye size={16} />
        </button>
      </div>
    </div>
  );
};

// Customer Details Modal Component
const CustomerDetailsModal = ({ customer, isOpen, onClose, orders = [] }) => {
  if (!isOpen || !customer) return null;

  const customerStats = {
    totalSpent: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
    averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0) / orders.length : 0,
    firstOrder: orders.length > 0 ? new Date(Math.min(...orders.map(o => o.timestamp?.toDate() || new Date()))).toLocaleDateString() : 'N/A',
    lastOrder: customer.lastOrder
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-red-50 to-pink-50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center">
              <span className="text-red-600 text-xl font-bold">
                {customer.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{customer.name}</h2>
              <p className="text-slate-600 flex items-center gap-2 mt-1">
                <Mail size={16} />
                {customer.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors duration-200"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-blue-900">Total Orders</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{customer.totalOrders}</p>
            </div>

            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm font-medium text-green-900">Total Spent</span>
              </div>
              <p className="text-2xl font-bold text-green-900">₱{customerStats.totalSpent.toFixed(2)}</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-purple-900">Avg Order</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">₱{customerStats.averageOrderValue.toFixed(2)}</p>
            </div>

            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-sm font-medium text-orange-900">Customer Since</span>
              </div>
              <p className="text-sm font-bold text-orange-900">{customerStats.firstOrder}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-50 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Contact Information
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-200 rounded-lg">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Full Name</p>
                    <p className="font-medium text-slate-900">{customer.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-200 rounded-lg">
                    <Mail className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Email Address</p>
                    <p className="font-medium text-slate-900">{customer.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-200 rounded-lg">
                    <Phone className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Phone Number</p>
                    <p className="font-medium text-slate-900">{customer.phone}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                Order History
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-200 rounded-lg">
                    <Package className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Orders</p>
                    <p className="font-medium text-slate-900">{customer.totalOrders} orders</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-200 rounded-lg">
                    <Calendar className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Last Order</p>
                    <p className="font-medium text-slate-900">{customer.lastOrder}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-200 rounded-lg">
                    <Clock className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">First Order</p>
                    <p className="font-medium text-slate-900">{customerStats.firstOrder}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Recent Orders
            </h3>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-700">Order ID</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-700">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map((order, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">#{order.id.substring(0,8) || `ORD-${index + 1}`}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {order.timestamp?.toDate?.().toLocaleDateString() || 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800`}>
                              {order.status || 'Completed'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">
                            ₱{(order.totalAmount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p>No order details available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors duration-200"
          >
            Close
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200">
            <MessageCircle size={16} />
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Customer Page Component
function CustomerPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterBy, setFilterBy] = useState('all');
  const [viewMode, setViewMode] = useState('cards');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerOrders, setCustomerOrders] = useState([]);
  
  // --- PAGINATION LOGIC: SETS ITEMS PER PAGE ---
  const customersPerPage = 8;

  // --- START: CORRECTED DATA FETCHING LOGIC ---
  useEffect(() => {
    // Corrected path to the top-level 'orders' collection
    const ordersCollectionRef = collection(db, 'orders');
    const q = query(ordersCollectionRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const customerData = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const email = data.customerEmail;

        if (email) {
          if (!customerData[email]) {
            customerData[email] = {
              name: data.customerName,
              email: email,
              phone: data.customerPhone || 'N/A',
              totalOrders: 0,
              lastOrder: data.timestamp?.toDate().toLocaleDateString() || 'N/A',
              lastOrderDate: data.timestamp?.toDate() || new Date(),
              userId: data.userId, // Store userId for fetching details
            };
          }
          customerData[email].totalOrders += 1;
        }
      });

      const sortedCustomers = Object.values(customerData);
      setCustomers(sortedCustomers);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching customer data:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  // --- END: CORRECTED DATA FETCHING LOGIC ---

  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = customers.filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           customer.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = filterBy === 'all' ||
                           (filterBy === 'active' && customer.totalOrders >= 5) ||
                           (filterBy === 'new' && customer.totalOrders <= 2);

      return matchesSearch && matchesFilter;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'orders':
          return b.totalOrders - a.totalOrders;
        case 'recent':
          return new Date(b.lastOrderDate) - new Date(a.lastOrderDate);
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [customers, searchQuery, sortBy, filterBy]);

  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.totalOrders >= 5).length;
    const newCustomers = customers.filter(c => c.totalOrders <= 2).length;
    const totalOrders = customers.reduce((sum, c) => sum + c.totalOrders, 0);

    return { totalCustomers, activeCustomers, newCustomers, totalOrders };
  }, [customers]);

  // --- PAGINATION LOGIC: CALCULATES WHICH CUSTOMERS TO SHOW ---
  const indexOfLastCustomer = currentPage * customersPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - customersPerPage;
  const currentCustomers = filteredAndSortedCustomers.slice(indexOfFirstCustomer, indexOfLastCustomer);
  const totalPages = Math.ceil(filteredAndSortedCustomers.length / customersPerPage);

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

  // --- START: CORRECTED ORDER FETCHING FOR MODAL ---
  const handleViewDetails = async (customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);

    try {
      // Corrected path to fetch orders for a specific user
      const ordersCollectionRef = collection(db, `orders`);
      const q = query(ordersCollectionRef, where("userId", "==", customer.userId), orderBy('timestamp', 'desc'));

      const querySnapshot = await getDocs(q);
      const customerOrdersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
      }));

      setCustomerOrders(customerOrdersData);
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      setCustomerOrders([]);
    }
  };
  // --- END: CORRECTED ORDER FETCHING FOR MODAL ---

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCustomer(null);
    setCustomerOrders([]);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Customer Management</h1>
            <p className="text-slate-500 mt-1">Manage and analyze your customer relationships.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Activity className="w-4 h-4" />
              <span>Live data</span>
            </div>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            title="Total Customers"
            value={loading ? '...' : stats.totalCustomers}
            icon={<Users size={20} />}
            color="blue"
          />
          <StatsCard
            title="Active Customers"
            value={loading ? '...' : stats.activeCustomers}
            icon={<UserCheck size={20} />}
            color="green"
          />
          <StatsCard
            title="New Customers"
            value={loading ? '...' : stats.newCustomers}
            icon={<UserPlus size={20} />}
            color="purple"
          />
          <StatsCard
            title="Total Orders"
            value={loading ? '...' : stats.totalOrders}
            icon={<ShoppingBag size={20} />}
            color="red"
          />
        </div>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            {filteredAndSortedCustomers.length} {filteredAndSortedCustomers.length === 1 ? 'Customer' : 'Customers'}
          </h2>
        </div>

        <FilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          filterBy={filterBy}
          setFilterBy={setFilterBy}
        />

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading customers...</p>
          </div>
        ) : filteredAndSortedCustomers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-xl font-medium mb-2 text-slate-600">No customers found</p>
            <p className="text-sm text-slate-500">
              {searchQuery || filterBy !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'No customers have placed orders yet.'}
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentCustomers.map((customer) => (
                  <CustomerCard
                    key={customer.email}
                    customer={customer}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th scope="col" className="px-6 py-4">Customer</th>
                        <th scope="col" className="px-6 py-4">Contact</th>
                        <th scope="col" className="px-6 py-4 text-center">Orders</th>
                        <th scope="col" className="px-6 py-4">Last Order</th>
                        <th scope="col" className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentCustomers.map((customer) => (
                        <tr key={customer.email} className="bg-white border-b border-slate-200 hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-red-600 text-sm font-semibold">
                                  {customer.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{customer.name}</p>
                                <p className="text-xs text-slate-500">Customer</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-slate-600">
                                <Mail size={14} />
                                <span className="text-sm">{customer.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-500">
                                <Phone size={14} />
                                <span className="text-sm">{customer.phone}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                              <ShoppingBag size={12} />
                              {customer.totalOrders}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Calendar size={14} />
                              <span className="text-sm">{customer.lastOrder}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleViewDetails(customer)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="View customer details"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- PAGINATION LOGIC: DISPLAYS THE CONTROLS --- */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-sm text-slate-600">
                  Showing {indexOfFirstCustomer + 1} to {Math.min(indexOfLastCustomer, filteredAndSortedCustomers.length)} of {filteredAndSortedCustomers.length} customers
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

      <CustomerDetailsModal
        customer={selectedCustomer}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        orders={customerOrders}
      />
    </div>
  );
}

export default CustomerPage;