import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import SignupPage from './SignupPage';

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

  const handleSubmit = async (e) => {
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
      const response = await fetch('http://localhost:5000/login', {
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

  const handleToggleForm = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="login-page">
      <nav className="navbar">
        <div className="logo">CodeReview.</div>
        <ul className="nav-links">
          <li><a href="#home">HOME</a></li>
          <li><a href="#about">ABOUT US</a></li>
          <li><a href="#contact">CONTACT</a></li>
          <li><a href="#login" className="login-nav">LOG IN</a></li>
        </ul>
      </nav>
      <div className="login-container">
        <div className="login-box">
          {isLogin ? (
            <>
              <h2>Log in</h2>
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label htmlFor="username">Username (Email)</label>
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
                  <a href="#forgot" className="forgot-password">Forgot Password?</a>
                </div>
                <div className="checkbox-group">
                  <input type="checkbox" id="rememberMe" />
                  <label htmlFor="rememberMe">Remember Me</label>
                </div>
                <button type="submit" className="login-btn">Log in</button>
                <p className="signup-link">
                  or <span onClick={handleToggleForm} style={{ cursor: 'pointer', color: '#4285F4' }}>Sign up</span>
                </p>
              </form>
            </>
          ) : (
            <SignupPage onToggleForm={handleToggleForm} />
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;