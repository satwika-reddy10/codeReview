import React, { useState } from 'react';

const SignupPage = ({ onToggleForm }) => {
  const [formState, setFormState] = useState({
    username: '',
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
      const response = await fetch('http://localhost:5000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formState.username, password: formState.password }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Signup failed');
      }
      const data = await response.json();
      console.log('Signup successful:', data);
      onToggleForm();
    } catch (error) {
      alert(`Error: ${error.message}`);
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
          <label htmlFor="username">EMAIL</label>
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
          <label htmlFor="password">PASSWORD</label>
          <input
            id="password"
            type="password"
            name="password"
            placeholder="At least 8 characters"
            value={formState.password}
            onChange={handleChange}
          />
        </div>
        <div className="input-group">
          <label htmlFor="dob">DATE OF BIRTH</label>
          <input
            id="dob"
            type="date"
            name="dob"
            value={formState.dob}
            onChange={handleChange}
          />
        </div>
        <button type="submit" className="login-btn" style={{ marginTop: '20px', backgroundColor: '#f6f6f7', color: '#111' }}>Sign up</button>
      </form>
    </>
  );
};

export default SignupPage;