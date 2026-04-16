import React, { Suspense, useState } from 'react';

const Register = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email, username, password }),
    });

    if (response.ok) {
      // Handle successful registration
    } else {
      // Handle errors
    }
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <form onSubmit={handleSubmit}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
        <button type="submit">Register</button>
      </form>
    </Suspense>
  );
};

export default Register;