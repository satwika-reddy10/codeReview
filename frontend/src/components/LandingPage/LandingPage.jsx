import React from "react";
import { Link, useNavigate } from 'react-router-dom';
import "./LandingPage.css";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
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
          <li><a href="#home">HOME</a></li>
          <li><a href="#about">ABOUT US</a></li>
          <li><a href="#features">FEATURES</a></li>
          <li><a href="#contact">CONTACT</a></li>
          <li><Link to="/login" className="login-nav">LOG IN</Link></li>
        </ul>
      </nav>

      <header className="hero-section">
        <div className="overlay"></div>
        <div className="hero-content">
          <h1>Welcome to <span>CodeReview</span></h1>
          <p>
            Simplify your code reviews with AI-powered insights.  
            Clean, secure, and efficient code at your fingertips.
          </p>
          <button className="cta-btn" onClick={() => navigate('/login')}>Get Started</button>
        </div>
      </header>

      <section className="features-section" id="features">
        <h2>Our Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI-Powered Analysis</h3>
            <p>Leverage advanced AI to detect bugs, optimize code, and ensure best practices in real-time.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Feedback</h3>
            <p>Get immediate, actionable insights on your code with detailed suggestions for improvement.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure Code Reviews</h3>
            <p>Ensure your code is safe with automated security checks and vulnerability detection.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3>Seamless Integration</h3>
            <p>Integrate with your favorite IDEs and workflows for a smooth, efficient review process.</p>
          </div>
        </div>
      </section>

      <section className="about-section" id="about">
        <h2>About Us</h2>
        <div className="about-content">
          <p>
            At CodeReview, we're passionate about empowering developers to write better code. Our team of innovators and engineers has built an AI-driven platform to streamline code reviews, making them faster, smarter, and more reliable.
          </p>
          <p>
            Founded with a mission to enhance software quality, we combine cutting-edge technology with a developer-first approach. Whether you're a solo coder or part of a large team, CodeReview is here to help you ship clean, secure, and efficient code with confidence.
          </p>
        </div>
      </section>

    <footer className="footer-section" id="contact">
        <div className="footer-content">
          <div className="footer-logo">CodeReview.</div>
          <div className="contact-details">
            <p>Email: <a href="mailto:support@codereview.com">support@codereview.com</a></p>
            <div className="social-links">
              <a href="https://x.com/codereview" target="_blank" rel="noopener noreferrer">𝕏</a>
              <a href="https://linkedin.com/company/codereview" target="_blank" rel="noopener noreferrer">🔗</a>
              <a href="https://github.com/codereview" target="_blank" rel="noopener noreferrer">🐙</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 CodeReview. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;