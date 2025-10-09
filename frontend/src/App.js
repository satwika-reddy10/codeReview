import './App.css';
import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import LandingPage from './components/LandingPage/LandingPage';
import LoginPage from './components/LoginPage/LoginPage';
import SubmitPage from './components/SubmitPage/SubmitPage';
import Analytics from './components/AnalyticsPage/Analytics';
import AdminDashboard from './components/AnalyticsPage/AdminDashboard';

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
    path: '/analytics',
    element: <Analytics />,
  },
  {
    path: '/admin-dashboard',
    element: <AdminDashboard />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;