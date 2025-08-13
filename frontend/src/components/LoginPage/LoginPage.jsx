import React, { useState } from 'react';
import './LoginPage.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Login attempted with:', { username, password });
  };

  return (
    <div className="login-page">
      <nav className="navbar">
        <div className="logo">Borcelle.</div>
        <ul className="nav-links">
          <li><a href="#home">HOME</a></li>
          <li><a href="#about">ABOUT US</a></li>
          <li><a href="#contact">CONTACT</a></li>
          <li><a href="#login" className="login-nav">LOG IN</a></li>
        </ul>
      </nav>
      <div className="login-container">
        <div className="login-box">
          <h2>Log in</h2>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="input-group">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <a href="#forgot" className="forgot-password">Forgot Password?</a>
            </div>
            <div className="checkbox-group">
              <input type="checkbox" id="rememberMe" />
              <label htmlFor="rememberMe">Remember Me</label>
            </div>
            <button type="submit" className="login-btn">Log in</button>
            <p className="signup-link">or <a href="#signup">Sign up</a></p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;