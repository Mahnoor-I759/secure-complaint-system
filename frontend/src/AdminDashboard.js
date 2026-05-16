import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from './api';

function StatusBadge({ status }) {
  const cls =
    status === 'Resolved' ? 'status-badge status-resolved' :
    status === 'In Progress' ? 'status-badge status-progress' :
    'status-badge status-pending';
  return <span className={cls}>● {status}</span>;
}

function AdminDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('complaints');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchAllComplaints = async () => {
    try {
      const res = await API.get('/admin/complaints');
      setComplaints(res.data);
    } catch (err) {
      if (err.response?.status === 403) {
        alert('Access Denied: Admins only.');
        navigate('/dashboard');
      }
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await API.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  useEffect(() => {
    Promise.all([fetchAllComplaints(), fetchAllUsers()]).finally(() => setLoading(false));
  }, []);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await API.put(`/admin/update-status/${id}`, { status: newStatus });
      setComplaints(complaints.map(c => c.id === id ? { ...c, status: newStatus } : c));
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete complaint #${id}? This cannot be undone.`)) return;
    try {
      await API.delete(`/admin/delete-complaint/${id}`);
      setComplaints(complaints.filter(c => c.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete complaint.');
    }
  };

  // NEW: Promote or demote user role
  const handleRoleUpdate = async (userId, newRole) => {
    try {
      await API.put(`/admin/update-role/${userId}`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role.');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="spinner" /> Loading Admin Panel...
      </div>
    );
  }

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'Pending').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
  };

  const currentAdminId = parseInt(localStorage.getItem('userId'));

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <div>
          <div className="admin-badge">🛡️ Admin Panel</div>
          <h1 className="page-title" style={{ marginTop: '10px' }}>Management Console</h1>
          <p className="page-subtitle">Manage all complaints and user roles</p>
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

      {/* Complaints Tab */}
      {(
        <div className="section-card">
          <div className="section-title">All Complaints</div>
          {complaints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>No complaints submitted yet.</p>
            </div>
          ) : (
            <table className="complaints-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User ID</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Update</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{c.id}</td>
                    <td style={{ color: 'var(--text-3)' }}>{c.user_id}</td>
                    <td style={{ fontWeight: '500' }}>{c.title}</td>
                    <td style={{ color: 'var(--text-2)', maxWidth: '260px' }}>{c.description}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>
                      <select
                        className="status-select"
                        value={c.status}
                        onChange={(e) => handleStatusUpdate(c.id, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </td>
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
      )}


    </div>
  );
}

export default AdminDashboard;