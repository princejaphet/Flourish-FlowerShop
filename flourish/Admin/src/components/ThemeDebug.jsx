// components/ThemeDebug.jsx - Temporary debug component

import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';

const ThemeDebug = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const clearStorage = () => {
    localStorage.removeItem('darkMode');
    window.location.reload();
  };

  const forceLight = () => {
    localStorage.setItem('darkMode', 'false');
    window.location.reload();
  };

  const forceDark = () => {
    localStorage.setItem('darkMode', 'true');
    window.location.reload();
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'white',
      border: '2px solid red',
      padding: '10px',
      borderRadius: '8px',
      zIndex: 9999,
      fontSize: '12px'
    }}>
      <div><strong>Theme Debug</strong></div>
      <div>Current: {isDarkMode ? 'DARK' : 'LIGHT'}</div>
      <div>Storage: {localStorage.getItem('darkMode')}</div>
      <div>HTML Class: {document.documentElement.classList.contains('dark') ? 'dark' : 'light'}</div>
      <div style={{ marginTop: '10px' }}>
        <button onClick={toggleDarkMode} style={{ margin: '2px', padding: '4px 8px' }}>
          Toggle
        </button>
        <button onClick={clearStorage} style={{ margin: '2px', padding: '4px 8px' }}>
          Clear Storage
        </button>
        <button onClick={forceLight} style={{ margin: '2px', padding: '4px 8px' }}>
          Force Light
        </button>
        <button onClick={forceDark} style={{ margin: '2px', padding: '4px 8px' }}>
          Force Dark
        </button>
      </div>
    </div>
  );
};

export default ThemeDebug;