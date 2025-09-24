// Modified App.js
// Add import for Analytics and add route for /analytics

import './App.css';
import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import LandingPage from './components/LandingPage/LandingPage';
import LoginPage from './components/LoginPage/LoginPage';
import SubmitPage from './components/SubmitPage/SubmitPage';
import Analytics from './components/AnalyticsPage/Analytics';  // Add this import (adjust path if needed)

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/submit',
    element: <SubmitPage />,
  },
  {
    path: '/analytics',  // Add this route
    element: <Analytics />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;