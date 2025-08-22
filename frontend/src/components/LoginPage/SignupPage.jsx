// SignupPage.jsx
import React, { useState } from 'react';

const SignupPage = ({ onToggleForm }) => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    password: '',
    dob: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // In a real application, you would handle the signup logic here (e.g., API call)
    try {
      const response = await fetch('http://localhost:5000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formState.name, email: formState.email, password: formState.password }),
      });
      if (!response.ok) {
        throw new Error('Signup failed');
      }
      const data = await response.json();
      console.log('Signup successful:', data);
      onToggleForm(); // Toggle back to login after successful signup
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <>
      <h2>Create new Account</h2>
      <p style={{ fontSize: '14px', color: '#b0b0b0', marginBottom: '20px' }}>
        Already Registered? <span onClick={onToggleForm} style={{ cursor: 'pointer', color: '#4285F4', textDecoration: 'none' }}>Log in here.</span>
      </p>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="name">NAME</label>
          <input
            id="name"
            type="text"
            name="name"
            placeholder="abc"
            value={formState.name}
            onChange={handleChange}
          />
        </div>
        <div className="input-group">
          <label htmlFor="email">EMAIL</label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="example@gmail.com"
            value={formState.email}
            onChange={handleChange}
          />
        </div>
        <div className="input-group">
          <label htmlFor="password">PASSWORD</label>
          <input
            id="password"
            type="password"
            name="password"
            placeholder="*******"
            value={formState.password}
            onChange={handleChange}
          />
        </div>
        <button type="submit" className="login-btn" style={{ marginTop: '20px', backgroundColor: '#f6f6f7', color: '#111' }}>Sign up</button>
      </form>
    </>
  );
};

export default SignupPage;