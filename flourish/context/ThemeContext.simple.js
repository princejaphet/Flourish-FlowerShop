// context/ThemeContext.simple.js - Minimal version for testing

import React, { createContext, useState, useContext } from 'react';

const ThemeContext = createContext();

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Theme colors object
  const theme = {
    isDarkMode,
    colors: {
      // Background colors
      background: isDarkMode ? '#0f172a' : '#ffffff',
      surface: isDarkMode ? '#1e293b' : '#f8fafc',
      card: isDarkMode ? '#334155' : '#ffffff',
      
      // Text colors
      text: isDarkMode ? '#f1f5f9' : '#1e293b',
      textSecondary: isDarkMode ? '#94a3b8' : '#64748b',
      textMuted: isDarkMode ? '#64748b' : '#94a3b8',
      
      // Primary colors (keeping your red theme)
      primary: '#ef4444',
      primaryLight: isDarkMode ? '#fca5a5' : '#fecaca',
      primaryDark: '#dc2626',
      
      // Border and divider colors
      border: isDarkMode ? '#475569' : '#e2e8f0',
      divider: isDarkMode ? '#374151' : '#f1f5f9',
      
      // Status colors
      success: isDarkMode ? '#22c55e' : '#16a34a',
      warning: isDarkMode ? '#f59e0b' : '#d97706',
      error: isDarkMode ? '#ef4444' : '#dc2626',
      info: isDarkMode ? '#3b82f6' : '#2563eb',
      
      // Input colors
      inputBackground: isDarkMode ? '#374151' : '#f9fafb',
      inputBorder: isDarkMode ? '#6b7280' : '#d1d5db',
      inputText: isDarkMode ? '#f9fafb' : '#111827',
      placeholder: isDarkMode ? '#9ca3af' : '#6b7280',
      
      // Button colors
      buttonBackground: isDarkMode ? '#374151' : '#f3f4f6',
      buttonText: isDarkMode ? '#f9fafb' : '#374151',
      
      // Shadow colors
      shadow: isDarkMode ? '#000000' : '#000000',
      shadowLight: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
    }
  };

  const value = {
    isDarkMode,
    isLoading: false,
    theme,
    toggleTheme,
    resetToSystemTheme: toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;