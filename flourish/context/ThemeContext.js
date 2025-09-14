// context/ThemeContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';
import { Appearance } from 'react-native';

const ThemeContext = createContext();

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Backward compatibility - export the context directly too
export { ThemeContext };

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize with system theme
    try {
      return Appearance.getColorScheme() === 'dark';
    } catch (error) {
      return false;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load saved theme preference on app start
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    try {
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        // Only auto-switch if user hasn't manually set a preference
        loadStoredPreference().then((hasStoredPreference) => {
          if (!hasStoredPreference) {
            setIsDarkMode(colorScheme === 'dark');
          }
        }).catch(() => {
          // Fallback to just setting the theme
          setIsDarkMode(colorScheme === 'dark');
        });
      });

      return () => {
        try {
          subscription?.remove();
        } catch (error) {
          console.log('Error removing appearance listener:', error);
        }
      };
    } catch (error) {
      console.log('Error setting up appearance listener:', error);
    }
  }, []);

  const loadStoredPreference = async () => {
    try {
      // Try to import AsyncStorage dynamically
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const savedTheme = await AsyncStorage.default.getItem('userThemePreference');
      return savedTheme !== null;
    } catch (error) {
      console.log('AsyncStorage not available, using system theme');
      return false;
    }
  };

  const loadThemePreference = async () => {
    try {
      // Try to import AsyncStorage dynamically
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const savedTheme = await AsyncStorage.default.getItem('userThemePreference');
      if (savedTheme !== null) {
        setIsDarkMode(JSON.parse(savedTheme));
      } else {
        // If no saved preference, use system theme
        const systemTheme = Appearance.getColorScheme();
        setIsDarkMode(systemTheme === 'dark');
      }
    } catch (error) {
      console.log('Error loading theme preference, using system theme:', error);
      const systemTheme = Appearance.getColorScheme();
      setIsDarkMode(systemTheme === 'dark');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      
      // Try to save preference
      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.default.setItem('userThemePreference', JSON.stringify(newTheme));
      } catch (storageError) {
        console.log('Could not save theme preference:', storageError);
      }
    } catch (error) {
      console.error('Error toggling theme:', error);
    }
  };

  const resetToSystemTheme = async () => {
    try {
      const systemTheme = Appearance.getColorScheme();
      setIsDarkMode(systemTheme === 'dark');
      
      // Try to remove stored preference
      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.default.removeItem('userThemePreference');
      } catch (storageError) {
        console.log('Could not remove theme preference:', storageError);
      }
    } catch (error) {
      console.error('Error resetting theme preference:', error);
    }
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
    isLoading,
    theme,
    toggleTheme,
    resetToSystemTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;