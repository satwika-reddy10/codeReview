// LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import SignupPage from './SignupPage'; // Import the new SignupPage component

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
    if (isLogin) {
      // Handle login logic
      try {
        const response = await fetch('http://localhost:5000/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formState.username, password: formState.password }),
        });
        if (!response.ok) {
          throw new Error('Login failed');
        }
        const data = await response.json();
        console.log('Login successful:', data);
        navigate('/submit');
      } catch (error) {
        alert(error.message);
      }
    } else {
      // Handle signup logic
      console.log('Signup attempted with:', formState);
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
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    type="text"
                    name="username"
                    placeholder="Enter your username"
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
                    placeholder="Enter your password"
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