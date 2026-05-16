import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from './api';

function RegisterAdmin() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', admin_code: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await API.post('/register-admin', formData);
      setSuccess(res.data.message + ' Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Admin registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-icon">🛡️</span>
          <h2>Admin Registration</h2>
          <p>Create an administrator account</p>
        </div>

        <div className="admin-code-note">
          🔒 Admin registration requires a secret authorization code. Contact your system administrator to obtain it.
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="adminuser"
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="admin@example.com"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Admin Authorization Code</label>
            <input
              type="password"
              placeholder="Enter secret admin code"
              onChange={(e) => setFormData({ ...formData, admin_code: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register as Admin'}
          </button>
        </form>

        <div className="auth-footer">
          Regular user? <Link to="/register">Register here</Link> · <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterAdmin;
