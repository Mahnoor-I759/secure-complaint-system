import React, { useState, useEffect } from 'react';
import API from './api';

function StatusBadge({ status }) {
  const cls =
    status === 'Resolved' ? 'status-badge status-resolved' :
    status === 'In Progress' ? 'status-badge status-progress' :
    'status-badge status-pending';

  const dot =
    status === 'Resolved' ? '●' :
    status === 'In Progress' ? '●' : '●';

  return <span className={cls}>{dot} {status}</span>;
}

function Dashboard() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const username = localStorage.getItem('username') || 'User';

  // FIX: Was /complaints — must be /my-complaints
  const fetchComplaints = async () => {
    try {
      const res = await API.get('/my-complaints');
      setComplaints(res.data);
    } catch (err) {
      console.error('Failed to fetch complaints', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaints(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await API.post('/complaints', { title, description });
      setSuccess('Complaint submitted successfully!');
      setTitle('');
      setDescription('');
      fetchComplaints();
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this complaint?')) return;

    try {
      await API.delete(`/delete-complaint/${id}`);
      setComplaints(complaints.filter(c => c.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete complaint.');
    }
  };

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'Pending').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="spinner" /> Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Hello, {username} 👋</h1>
          <p className="page-subtitle">Submit and track your complaints below</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-label">Total Complaints</div>
          <div className="stat-card-num">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Pending</div>
          <div className="stat-card-num" style={{ color: 'var(--yellow)' }}>{stats.pending}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Resolved</div>
          <div className="stat-card-num" style={{ color: 'var(--green)' }}>{stats.resolved}</div>
        </div>
      </div>

      {/* Submit Form */}
      <div className="section-card">
        <div className="section-title">📝 Submit a New Complaint</div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="inline-form">
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              placeholder="Brief title of your complaint"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Describe your complaint in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              required
            />
          </div>
          <div>
            <button type="submit" className="btn-submit" style={{ width: 'auto', padding: '11px 28px' }} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>

      {/* Complaints List */}
      <div className="section-card">
        <div className="section-title">📋 Your Complaints</div>

        {complaints.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No complaints submitted yet. Use the form above to get started.</p>
          </div>
        ) : (
          <table className="complaints-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Description</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c.id}>
                  <td style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{c.id}</td>
                  <td style={{ fontWeight: '500' }}>{c.title}</td>
                  <td style={{ color: 'var(--text-2)', maxWidth: '300px' }}>{c.description}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>
                    <button className="btn-delete" onClick={() => handleDelete(c.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
