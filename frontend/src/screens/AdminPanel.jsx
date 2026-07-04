import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/TopBar'
import { UserFormModal } from '../components/UserFormModal'
import { DeleteUserConfirmModal } from '../components/DeleteUserConfirmModal'
import { AdminEditConfirmModal } from '../components/AdminEditConfirmModal'
import { api } from '../lib/api'
import './AdminPanel.css'

export function AdminPanel() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal state: which user a modal is acting on (null = closed)
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [adminEditUser, setAdminEditUser] = useState(null)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      setUsers(await api.get('/api/admin/users'))
    } catch (err) {
      console.error('Failed to load users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveUser(formData) {
    setError('')
    try {
      if (editingUser) {
        await api.put(`/api/admin/users/${editingUser.id}`, formData)
      } else {
        await api.post('/api/admin/users', formData)
      }
      setShowUserForm(false)
      setEditingUser(null)
      await loadUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingUser) return
    try {
      await api.delete(`/api/admin/users/${deletingUser.id}`)
      setDeletingUser(null)
      await loadUsers()
    } catch (err) {
      setDeleteError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="admin-panel">
        <TopBar title="Admin" showBack backTo="/home" />
        <div className="admin-panel__content">
          <div className="loading">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-panel">
      <TopBar title="Admin" showBack backTo="/home" />
      <div className="admin-panel__content">
        {error && <div className="error-banner">{error}</div>}

        <button className="add-user-btn" onClick={() => { setEditingUser(null); setShowUserForm(true) }}>
          + Add family member
        </button>

        <div className="user-cards">
          {users.map(user => (
            <div key={user.id} className="user-card">
              <div className="user-card__header">
                <div className="user-card__avatar" style={{ backgroundColor: user.color }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="user-card__info">
                  <div className="user-card__name">{user.name}</div>
                  {user.isAdmin && <div className="user-card__admin-label">Admin</div>}
                </div>
                <div className="user-card__actions">
                  <button
                    className="icon-btn"
                    aria-label={`Edit ${user.name}`}
                    title="Edit user"
                    onClick={() => { setEditingUser(user); setShowUserForm(true) }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    className="icon-btn icon-btn--danger"
                    aria-label={`Delete ${user.name}`}
                    title="Delete user"
                    onClick={() => { setDeletingUser(user); setDeleteError('') }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              </div>

              <button className="user-card__list-btn" onClick={() => setAdminEditUser(user)}>
                View / edit their list
              </button>
            </div>
          ))}
        </div>
      </div>

      {showUserForm && (
        <UserFormModal
          user={editingUser}
          onSave={handleSaveUser}
          onClose={() => { setShowUserForm(false); setEditingUser(null) }}
        />
      )}

      {deletingUser && (
        <DeleteUserConfirmModal
          user={deletingUser}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingUser(null)}
        />
      )}

      {adminEditUser && (
        <AdminEditConfirmModal
          userName={adminEditUser.name}
          onConfirm={() => navigate(`/admin/list/${adminEditUser.id}`)}
          onCancel={() => setAdminEditUser(null)}
        />
      )}
    </div>
  )
}
