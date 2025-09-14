import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  MessageSquareText,
  Star,
  LogOut,
  Users,
  Loader2,
  Activity,
  Settings,
  ChevronRight,
  User // Added for default icon
} from 'lucide-react';
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
// Corrected the import path to point to the firebase.js file in the parent 'src' directory
import { auth, db } from "../firebase"; 

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, description: 'Overview & Analytics' },
  { name: 'Orders', path: '/dashboard/order-status', icon: ClipboardList, description: 'Manage Orders' },
  { name: 'Customers', path: '/dashboard/customer', icon: Users, description: 'Customer Management' },
  { name: 'Products', path: '/dashboard/product-inventory', icon: Package, description: 'Inventory & Catalog' },
  { name: 'Messages', path: '/dashboard/message', icon: MessageSquareText, description: 'Customer Support' },
  { name: 'Feedback', path: '/dashboard/feedback', icon: Star, description: 'Reviews & Ratings' },
  { name: 'Settings', path: '/dashboard/settings', icon: Settings, description: 'System Configuration' },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [userName, setUserName] = useState('Flourish'); // Default fallback name

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data();
            
            // Set profile image
            if (userData.profileImageUrl) {
              setProfileImageUrl(userData.profileImageUrl);
            } else {
              setProfileImageUrl('');
            }
            
            // Set user name - try different fields in order of preference
            let displayName = 'Flourish'; // Default fallback
            
            if (userData.businessName) {
              displayName = userData.businessName;
            } else if (userData.firstName && userData.lastName) {
              displayName = `${userData.firstName} ${userData.lastName}`;
            } else if (userData.firstName) {
              displayName = userData.firstName;
            } else if (userData.fullName) {
              displayName = userData.fullName;
            } else if (user.displayName) {
              displayName = user.displayName;
            }
            
            setUserName(displayName);
          } else {
            setProfileImageUrl('');
            setUserName('Flourish');
          }
        });
        return () => unsubscribeSnapshot(); // Cleanup snapshot listener when user changes
      } else {
        setProfileImageUrl(''); // User is logged out
        setUserName('Flourish'); // Reset to default
      }
    });

    return () => unsubscribeAuth(); // Cleanup auth listener on component unmount
  }, []);

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      navigate('/');
      setIsLoggingOut(false);
    }, 1500);
  };

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col h-screen">
      {/* Header Section */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center overflow-hidden">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={24} className="text-white" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{userName}</h1>
            <p className="text-xs text-slate-500 font-medium tracking-wider">ADMIN PANEL</p>
          </div>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 p-4 space-y-1">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
          Main Menu
        </div>
        {navItems.map((item) => (
          <NavItem
            key={item.name}
            to={item.path}
            isActive={location.pathname === item.path}
            icon={item.icon}
            description={item.description}
          >
            {item.name}
          </NavItem>
        ))}
      </nav>

      {/* Footer Section */}
      <div className="p-4 border-t border-slate-200">
        {isLoggingOut ? (
          <div className="flex items-center justify-center p-3 bg-slate-100 rounded-xl">
            <Loader2 className="w-4 h-4 animate-spin mr-2 text-red-500" />
            <span className="text-sm text-slate-600">Logging out...</span>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-200 group"
          >
            <LogOut size={16} />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
};

const NavItem = ({ to, isActive, icon: Icon, children, description }) => {
  return (
    <Link
      to={to}
      className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
        isActive
          ? 'bg-red-50 text-red-700 border border-red-200'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg transition-colors duration-200 ${
          isActive 
            ? 'bg-red-100 text-red-600' 
            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
        }`}>
          <Icon size={16} />
        </div>
        <div>
          <p className={`font-medium text-sm transition-colors duration-200 ${
            isActive ? 'text-red-700' : 'text-slate-700'
          }`}>
            {children}
          </p>
          <p className="text-xs text-slate-500 group-hover:text-slate-600 transition-colors duration-200">
            {description}
          </p>
        </div>
      </div>
      <ChevronRight 
        size={14} 
        className={`transition-all duration-200 ${
          isActive 
            ? 'text-red-500 transform translate-x-1' 
            : 'text-slate-400 group-hover:text-slate-600 group-hover:transform group-hover:translate-x-1'
        }`} 
      />
    </Link>
  );
};

export default Sidebar;