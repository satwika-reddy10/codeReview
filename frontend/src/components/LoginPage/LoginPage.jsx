import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formState, setFormState] = useState({
    username: '',
    password: '',
  });
  const [isLogin, setIsLogin] = useState(true);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formState.username) {
      alert('Please enter a valid email address');
      return;
    }
    if (!formState.password) {
      alert('Please enter a password');
      return;
    }
    if (formState.password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }
    try {
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formState.username, password: formState.password }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }
      const data = await response.json();
      console.log('Login successful:', data);
      navigate('/submit');
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!formState.username) {
      alert('Please enter a valid email address');
      return;
    }
    if (!formState.password) {
      alert('Please enter a password');
      return;
    }
    if (formState.password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }
    try {
      const response = await fetch('http://localhost:8000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formState.username, password: formState.password }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Signup failed');
      }
      const data = await response.json();
      alert('Signup successful! Please login.');
      setIsLogin(true);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleToggleForm = () => {
    setIsLogin(!isLogin);
    setFormState({ username: '', password: '' });
  };

  return (
    <div className="login-page">
      <div className="star-container">
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
      </div>
      <nav className="navbar">
        <div className="logo">CodeReview.</div>
        <ul className="nav-links">
          <li><Link to="/">HOME</Link></li>
        </ul>
      </nav>
      <div className="login-container">
        <div className="login-box">
          <h2>{isLogin ? 'Log in' : 'Sign up'}</h2>
          <form onSubmit={isLogin ? handleLogin : handleSignup}>
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="email"
                name="username"
                placeholder="example@gmail.com"
                value={formState.username}
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="At least 8 characters"
                value={formState.password}
                onChange={handleChange}
              />
              {isLogin && <a href="#forgot" className="forgot-password">Forgot Password?</a>}
            </div>
            <button type="submit" className="login-btn">
              {isLogin ? 'Log in' : 'Sign up'}
            </button>
            <p className="signup-link">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span onClick={handleToggleForm} style={{ cursor: 'pointer', color: '#00FFFF' }}>
                {isLogin ? 'Sign up' : 'Log in'}
              </span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;