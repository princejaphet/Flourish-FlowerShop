import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DarkModeProvider } from '/src/contexts/DarkModeContext.jsx';
import { NotificationProvider } from '/src/contexts/NotificationContext.jsx'; // Import NotificationProvider

// Import your pages and layout
import AdminLogin from '/src/pages/AdminLogin.jsx';
import DashboardPage from '/src/pages/DashboardPage.jsx';
import OrderAndStatusPage from '/src/pages/OrderAndStatusPage.jsx';
import ProductAndInventoryPage from '/src/pages/ProductAndInventoryPage.jsx';
import MessagePage from '/src/pages/MessagePage.jsx';
import FeedbackPage from '/src/pages/FeedbackPage.jsx';
import CustomerPage from '/src/pages/CustomerPage.jsx';
import SettingsPage from '/src/pages/SettingsPage.jsx';
import DashboardLayout from '/src/layouts/DashboardLayout.jsx';

export default function App() {
  return (
    <DarkModeProvider>
      {/* Wrap the entire application with NotificationProvider */}
      <NotificationProvider>
        <Router>
          <Routes>
            <Route path="/" element={<AdminLogin />} />

            {/* Nested route for dashboard and its sub-pages */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="order-status" element={<OrderAndStatusPage />} />
              <Route path="customer" element={<CustomerPage />} />
              <Route path="product-inventory" element={<ProductAndInventoryPage />} />
              <Route path="message" element={<MessagePage />} />
              <Route path="feedback" element={<FeedbackPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

          </Routes>
        </Router>
      </NotificationProvider>
    </DarkModeProvider>
  );
}

