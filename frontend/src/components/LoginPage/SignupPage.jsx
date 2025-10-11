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
      <form onSubmit={handleSubmit} style={{ maxWidth: '300px', margin: '20px auto', padding: '20px', background: '#1a1a2e', borderRadius: '10px', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
        <div className="input-group" style={{ marginBottom: '15px' }}>
          <label htmlFor="username">EMAIL</label>
          <input
            id="username"
            type="email"
            name="username"
            placeholder="example@gmail.com"
            value={formState.username}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div className="input-group" style={{ marginBottom: '15px' }}>
          <label htmlFor="password">PASSWORD</label>
          <input
            id="password"
            type="password"
            name="password"
            placeholder="At least 8 characters"
            value={formState.password}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div className="input-group" style={{ marginBottom: '15px' }}>
          <label htmlFor="dob">DATE OF BIRTH</label>
          <input
            id="dob"
            type="date"
            name="dob"
            value={formState.dob}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <button type="submit" className="login-btn" style={{ marginTop: '10px', backgroundColor: '#f6f6f7', color: '#111', width: '100%', padding: '10px', border: 'none', borderRadius: '5px' }}>Sign up</button>
      </form>
    </>
  );
};

export default SignupPage;