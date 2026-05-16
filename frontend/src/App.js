import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import Login from './login';
import Register from './register';
import RegisterAdmin from './RegisterAdmin';
import Dashboard from './Dashboard';
import AdminDashboard from './AdminDashboard';
import './App.css';

// Route guard: redirect to login if not authenticated
function ProtectedRoute({ children, adminOnly = false }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    if (!token) {
      navigate('/login');
    } else if (adminOnly && role !== 'admin') {
      navigate('/dashboard');
    }
  }, [token, role, adminOnly, navigate]);

  if (!token) return null;
  if (adminOnly && role !== 'admin') return null;
  return children;
}

function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const username = localStorage.getItem('username');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">⚡</span>
        <span className="brand-text">ResolvIT</span>
      </div>
      <div className="navbar-links">
        {!token && (
          <>
            <Link to="/login" className={`nav-link ${isActive('/login') ? 'active' : ''}`}>Login</Link>
            <Link to="/register" className={`nav-link ${isActive('/register') ? 'active' : ''}`}>Register</Link>
          </>
        )}
        {token && role === 'user' && (
          <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>My Dashboard</Link>
        )}
        {/* Admin only sees admin panel - no user view */}
        {token && role === 'admin' && (
          <Link to="/admin" className={`nav-link admin-link ${isActive('/admin') ? 'active' : ''}`}>Admin Panel</Link>
        )}
      </div>
      <div className="navbar-right">
        {token && (
          <>
            <span className="user-badge">
              {role === 'admin' ? '🛡️' : '👤'} {username}
            </span>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}

function Home() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const navigate = useNavigate();

  useEffect(() => {
    if (token && role === 'admin') navigate('/admin');
    else if (token) navigate('/dashboard');
  }, [token, role, navigate]);

  return (
    <div className="hero-page">
      <div className="hero-content">
        <div className="hero-badge">Secure Complaint Management</div>
        <h1 className="hero-title">Your Voice,<br /><span className="accent">Heard & Resolved</span></h1>
        <p className="hero-subtitle">Submit complaints, track progress, and get real resolutions — all in one secure platform.</p>
        <div className="hero-actions">
          <Link to="/register" className="btn-primary">Get Started</Link>
          <Link to="/login" className="btn-secondary">Sign In</Link>
        </div>
        <div className="hero-stats">
          <div className="stat"><span className="stat-num">5+</span><span className="stat-label">Security Layers</span></div>
          <div className="stat-divider" />
          <div className="stat"><span className="stat-num">JWT</span><span className="stat-label">Auth Protected</span></div>
          <div className="stat-divider" />
          <div className="stat"><span className="stat-num">RBAC</span><span className="stat-label">Role Based Access</span></div>
        </div>
      </div>
      <div className="hero-visual">
        <div className="floating-card card-1">
          <div className="fc-dot green" /> Complaint Resolved
        </div>
        <div className="floating-card card-2">
          <div className="fc-dot yellow" /> In Progress
        </div>
        <div className="floating-card card-3">
          <div className="fc-dot blue" /> New Submission
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="app-shell">
        <NavBar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register-admin" element={<RegisterAdmin />} />
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute adminOnly={true}><AdminDashboard /></ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;