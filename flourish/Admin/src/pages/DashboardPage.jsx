import React, { useState, useEffect, useMemo, useRef } from "react";
import { collection, query, onSnapshot, orderBy, doc, setDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { db } from '/src/firebase.js';
import { useOutletContext } from "react-router-dom";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  DollarSign,
  Package,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';


// Enhanced Stats Card Component
const StatsCard = ({ title, value, icon, trend = null, color = "red", percentage = null }) => (
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
      {(trend !== null || percentage !== null) && (
        <div className="text-right">
          {percentage && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              trend > 0 ? 'bg-green-100 text-green-700' : 
              trend < 0 ? 'bg-red-100 text-red-700' : 
              'bg-slate-100 text-slate-600'
            }`}>
              {trend > 0 ? <ArrowUpRight size={12} /> : trend < 0 ? <ArrowDownRight size={12} /> : null}
              {Math.abs(percentage)}%
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);

// Best Selling Flowers Component
const BestSellingFlowers = ({ topFlowers }) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" />
        All-Time Best Sellers
      </h3>
      <div className="space-y-4">
        {topFlowers.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No flower sales data available yet</p>
          </div>
        ) : (
          topFlowers.map((flower, index) => (
            <div key={flower.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors duration-200">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center">
                  <span className="text-red-600 text-xs font-bold">#{index + 1}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate" title={flower.name}>
                  {flower.name}
                </p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-slate-500">
                    {flower.totalSold} sold
                  </span>
                  <span className="text-xs font-medium text-green-600">
                    ₱{flower.revenue.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className={`w-3 h-3 rounded-full ${
                  index === 0 ? 'bg-yellow-400' : 
                  index === 1 ? 'bg-slate-400' : 
                  index === 2 ? 'bg-amber-600' : 'bg-slate-300'
                }`}></div>
              </div>
            </div>
          ))
        )}
      </div>
      {topFlowers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <button className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200">
            <Eye size={16} />
            View All Products
          </button>
        </div>
      )}
    </div>
  );
};

// Recent Activity Component
const RecentActivity = ({ orders }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
      <Clock className="w-5 h-5" />
      Recent Activity
    </h3>
    <div className="space-y-3">
      {orders.slice(0, 5).map((order) => (
        <div key={order.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center flex-shrink-0">
            <span className="text-red-600 text-xs font-semibold">
              {order.customerName?.charAt(0)?.toUpperCase() || 'N'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {order.customerName || 'Unknown Customer'}
            </p>
            <p className="text-xs text-slate-500">
              Order #{order.id?.substring(0, 8)} • {order.status}
            </p>
          </div>
          <div className="text-xs text-slate-400">
            {order.timestamp?.toDate?.()?.toLocaleDateString() || 'N/A'}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// The main Dashboard Page component
export default function DashboardPage() {
  const [allOrders, setAllOrders] = useState([]); 
  const [allCustomers, setAllCustomers] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]); 
  const [currentPage, setCurrentPage] = useState(1);
  const ORDERS_PER_PAGE = 5;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  
  const { startDate, endDate } = useOutletContext();


  // Auth logic
  useEffect(() => {
    const authInstance = getAuth();
    const unsubscribeAuth = onAuthStateChanged(authInstance, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        signInAnonymously(authInstance).catch(authError => {
          console.error("Dashboard: Error signing in anonymously:", authError);
          setError("Authentication failed.");
        });
      }
    });
    return () => unsubscribeAuth();
  }, []);

  
  // Data fetching logic for orders and customers
  useEffect(() => {
    if (!userId) return;

    const ordersCollectionRef = collection(db, 'orders');
    const qOrders = query(ordersCollectionRef, orderBy("timestamp", "desc"));
    
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllOrders(fetchedOrders);
      setLoading(false);
    }, (err) => {
      console.error("Dashboard: Error fetching orders: ", err);
      setError(`Failed to load order data. Error: ${err.message}`);
      setLoading(false);
    });

    const customersCollectionRef = collection(db, 'signup_users');
    const unsubscribeCustomers = onSnapshot(customersCollectionRef, (snapshot) => {
      const fetchedCustomers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllCustomers(fetchedCustomers);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeCustomers();
    };
  }, [userId]);


  // Filter orders based on the selected date range
  const filteredOrders = useMemo(() => {
    if (!startDate || !endDate) return [];
    return allOrders.filter(order => {
      if (!order.timestamp || typeof order.timestamp.toDate !== 'function') return false;
      const orderDate = order.timestamp.toDate();
      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [allOrders, startDate, endDate]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate]);
  
  // Paginate filtered orders
  useEffect(() => {
    const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
    const endIndex = startIndex + ORDERS_PER_PAGE;
    setRecentOrders(filteredOrders.slice(startIndex, endIndex));
  }, [filteredOrders, currentPage]);

  // Calculate top flowers from ALL orders
  const topFlowers = useMemo(() => {
    const flowerSales = {};
    allOrders.forEach(order => {
      const productsInOrder = [];
      if (order.product && typeof order.product === 'object') productsInOrder.push(order.product);
      if (Array.isArray(order.products)) productsInOrder.push(...order.products);
      productsInOrder.forEach(product => {
        if (product && product.name) {
          const flowerName = product.name;
          if (!flowerSales[flowerName]) {
            flowerSales[flowerName] = { name: flowerName, totalSold: 0, revenue: 0 };
          }
          flowerSales[flowerName].totalSold += (product.quantity || 1);
          flowerSales[flowerName].revenue += product.price ? (product.price * (product.quantity || 1)) : (order.totalAmount || 0);
        }
      });
    });
    return Object.values(flowerSales).sort((a, b) => b.totalSold - a.totalSold).slice(0, 5);
  }, [allOrders]);

  // Automatically update the bestsellers list in Firestore
  useEffect(() => {
    if (topFlowers.length > 0) {
      const updateBestSellers = async () => {
        try {
          const bestSellersRef = doc(db, 'artifacts/flourish-admin-app/public/data/bestsellers/top5');
          const productNames = topFlowers.map(flower => flower.name);
          await setDoc(bestSellersRef, { productNames: productNames });
          console.log("Successfully updated the bestsellers list for the homepage.");
        } catch (e) {
          console.error("Error updating bestsellers list in Firestore:", e);
        }
      };
      updateBestSellers();
    }
  }, [topFlowers]);


  // Calculate other derived data
  const chartData = useMemo(() => {
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({ name: `${i}:00`, Sales: 0, Orders: 0 }));
      filteredOrders.forEach(order => {
          if (order.timestamp) {
              const hour = order.timestamp.toDate().getHours();
              hourlyData[hour].Sales += order.totalAmount || 0;
              hourlyData[hour].Orders += 1;
          }
      });
      return hourlyData;
  }, [filteredOrders]);
  
  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  
  const pieChartData = useMemo(() => [
    { name: 'New Orders', value: filteredOrders.filter(o => o.status === 'Pending').length },
    { name: 'Processing', value: filteredOrders.filter(o => o.status === 'Processing').length },
    { name: 'Completed', value: filteredOrders.filter(o => o.status === 'Delivered').length },
    { name: 'Cancelled', value: filteredOrders.filter(o => o.status === 'Cancelled').length },
  ].filter(item => item.value > 0), [filteredOrders]);

  const PIE_CHART_COLORS = { 'New Orders': '#EF4444', 'Processing': '#F97316', 'Completed': '#10B981', 'Cancelled': '#6B7280' };
  
  const totalRevenue = useMemo(() => filteredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0), [filteredOrders]);
  
  const totalCustomers = allCustomers.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading dashboard...</p>
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
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Dashboard</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Dashboard Overview</h1>
            <p className="text-slate-500 mt-1"></p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard title="Total Orders" value={filteredOrders.length} icon={<ShoppingBag size={20}/>} color="blue"/>
          <StatsCard title="Total Revenue" value={`₱${totalRevenue.toLocaleString()}`} icon={<DollarSign size={20}/>} color="green"/>
          <StatsCard title="Total Customers" value={totalCustomers} icon={<Users size={20}/>} color="purple"/>
          <StatsCard title="Pending Orders" value={pieChartData.find(p => p.name === 'New Orders')?.value || 0} icon={<Clock size={20}/>} color="orange"/>
        </div>
      </div>
      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Today's Sales Overview</h2>
              <p className="text-slate-600">Hourly sales performance and order trends</p>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}/>
                  <Area type="monotone" dataKey="Orders" stroke="#EF4444" strokeWidth={3} fill="url(#ordersGradient)" />
                  <Area type="monotone" dataKey="Sales" stroke="#10B981" strokeWidth={3} fill="url(#salesGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Order Status</h2>
              <p className="text-slate-600">Distribution for the selected day</p>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieChartData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name">
                    {pieChartData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={PIE_CHART_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <BestSellingFlowers topFlowers={topFlowers} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Recent Orders</h2>
              <p className="text-slate-600">Orders from the selected day</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-6 py-4">Order ID</th>
                    <th scope="col" className="px-6 py-4">Customer</th>
                    <th scope="col" className="px-6 py-4">Total</th>
                    <th scope="col" className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center">
                        <div className="text-slate-400">
                          <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">No recent orders for this day</p>
                          <p className="text-sm">When orders are placed on this date, they will appear here.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.id} className="bg-white border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-4"><span className="text-sm font-mono text-slate-700 bg-slate-100 px-3 py-1 rounded-full">#{order.id?.substring(0, 8)}</span></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-red-600 text-xs font-semibold">{order.customerName?.charAt(0)?.toUpperCase() || 'N'}</span>
                            </div>
                            <span className="font-medium text-slate-900">{order.customerName || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4"><span className="font-semibold text-slate-900">₱{order.totalAmount?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : order.status === 'Processing' ? 'bg-blue-100 text-blue-800' : order.status === 'Delivered' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{order.status}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-200">
                <div className="text-sm text-slate-600">Showing {((currentPage - 1) * ORDERS_PER_PAGE) + 1} to {Math.min(currentPage * ORDERS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} orders</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                  <span className="px-3 py-2 text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
                  <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                </div>
              </div>
            )}
          </div>
          <RecentActivity orders={filteredOrders} />
        </div>
      </div>
    </div>
  );
}

