// src/App.tsx
import React from 'react';
import AppRouter from './router/AppRouter';
import './App.css'; // Global styles if any

/**
 * @function App
 * @description The root component of the application.
 * @returns {JSX.Element} The main application structure.
 */
function App() {
  return (
    <AppRouter />
  );
}

export default App;