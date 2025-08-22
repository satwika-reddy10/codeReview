import './App.css';
import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import LandingPage from './components/LandingPage/LandingPage';
import LoginPage from './components/LoginPage/LoginPage';
import SubmitPage from './components/SubmitPage/SubmitPage';
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
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;