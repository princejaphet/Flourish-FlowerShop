import React, { useState, forwardRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "/src/components/Sidebar.jsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaChevronDown } from 'react-icons/fa';
import { useNotifications } from "/src/contexts/NotificationContext.jsx";
import { Bell, CheckCircle, Trash2 } from "lucide-react"; 

// Custom Component for the Date Picker Input
const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
  <button
    className="flex items-center justify-between w-48 cursor-pointer p-2 bg-white text-red-600 font-semibold border border-red-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
    onClick={onClick}
    ref={ref}
  >
    {value}
    <FaChevronDown className="h-4 w-4 opacity-70" />
  </button>
));
CustomDateInput.displayName = 'CustomDateInput';

// Main Dashboard Layout
const DashboardLayout = () => {
  const location = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // MODIFIED: Replaced `removeAllNotifications` with the correct `clearAllNotifications` function from your context.
  const { notifications, unreadCount, markAllAsRead, removeNotification, clearAllNotifications } = useNotifications();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const handleToggleNotifications = () => {
    setIsNotificationOpen(prev => !prev);
    if (!isNotificationOpen) {
      markAllAsRead();
    }
  };

  const startDate = new Date(selectedDate.setHours(0, 0, 0, 0));
  const endDate = new Date(selectedDate.setHours(23, 59, 59, 999));

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Global Header for all dashboard pages */}
        <div className="bg-white border-b border-slate-200 p-4 flex justify-end items-center">
          {location.pathname === '/dashboard' && (
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              dateFormat="MMMM d, yyyy"
              customInput={<CustomDateInput />}
            />
          )}

          <div className="relative ml-4">
            <button
              onClick={handleToggleNotifications}
              className="relative text-slate-500 hover:text-red-600 focus:outline-none"
              aria-label="Notifications"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                 <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white ring-2 ring-white">
                   {unreadCount}
                 </span>
              )}
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-20 animate-fade-in-down">
                <div className="p-4 flex justify-between items-center border-b border-slate-200">
                  <h3 className="font-semibold text-slate-800">Notifications</h3>
                  {notifications.length > 0 && (
                    <button
                      // MODIFIED: Updated the onClick handler to call the correct function.
                      onClick={clearAllNotifications}
                      className="text-sm font-medium text-red-500 hover:text-red-700 hover:underline focus:outline-none"
                      aria-label="Clear all notifications"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`group relative p-4 border-b border-slate-100 transition-colors duration-150 ${
                          notif.status === 'unread' ? 'bg-red-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-1">
                            {notif.icon}
                          </div>
                          <div>
                            <p className="text-sm text-slate-700">{notif.message}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {notif.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeNotification(notif.id)}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none"
                          aria-label="Remove notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      <CheckCircle className="w-8 h-8 mx-auto text-green-400 mb-2"/>
                      <p className="text-sm">You're all caught up!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
            <Outlet context={{ startDate, endDate }} />
        </div>
      </main>
      <style>{`
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default DashboardLayout;