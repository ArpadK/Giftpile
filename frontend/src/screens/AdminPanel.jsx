import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { TopBar } from '../components/TopBar'
import { UserFormModal } from '../components/UserFormModal'
import { DeleteUserConfirmModal } from '../components/DeleteUserConfirmModal'
import { AdminEditConfirmModal } from '../components/AdminEditConfirmModal'
import './AdminPanel.css'

export function AdminPanel() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal states
  const [showUserFormModal, setShowUserFormModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingUser, setDeletingUser] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [showAdminEditModal, setShowAdminEditModal] = useState(false)
  const [adminEditUser, setAdminEditUser] = useState(null)

  useEffect(() => {
    if (!currentUser?.isAdmin) {
      navigate('/home')
      return
    }
    loadUsers()
  }, [currentUser, navigate])

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users', {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      } else {
        setError('Failed to load users')
      }
    } catch (err) {
      console.error('Failed to load users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  function handleAddUser() {
    setEditingUser(null)
    setShowUserFormModal(true)
  }

  function handleEditUser(user) {
    setEditingUser(user)
    setShowUserFormModal(true)
  }

  function handleDeleteUser(user) {
    setDeletingUser(user)
    setDeleteError('')
    setShowDeleteModal(true)
  }

  function handleViewEditList(user) {
    setAdminEditUser(user)
    setShowAdminEditModal(true)
  }

  async function handleSaveUser(formData) {
    try {
      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users'
      const method = editingUser ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setShowUserFormModal(false)
        loadUsers()
      } else {
        const errorData = await res.json()
        setError(errorData.message || 'Failed to save user')
      }
    } catch (err) {
      console.error('Failed to save user:', err)
      setError('Failed to save user')
    }
  }

  async function handleConfirmDelete(userName) {
    if (!deletingUser) return

    try {
      const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        setShowDeleteModal(false)
        setDeletingUser(null)
        loadUsers()
      } else {
        const errorData = await res.json()
        setDeleteError(errorData.message || 'Failed to delete user')
      }
    } catch (err) {
      console.error('Failed to delete user:', err)
      setDeleteError('Failed to delete user')
    }
  }

  function handleConfirmAdminEdit() {
    if (adminEditUser) {
      setShowAdminEditModal(false)
      navigate(`/admin/list/${adminEditUser.id}`)
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

        <button className="add-user-btn" onClick={handleAddUser}>
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
                    title="Edit user"
                    onClick={() => handleEditUser(user)}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M3 16.5L14.586 4.914C14.9465 4.55358 15.5535 4.55358 15.914 4.914L16.5 5.5C16.8604 5.86046 16.8604 6.46746 16.5 6.828L4.914 18.414M3 16.5L3.5 14.5L5.5 16.5M3 16.5H1V18.5H3V16.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    className="icon-btn icon-btn--danger"
                    title="Delete user"
                    onClick={() => handleDeleteUser(user)}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M2.5 5H17.5M8.5 9V15M11.5 9V15M3.5 5L4.5 17C4.5 17.5304 4.72064 18.0391 5.12132 18.4142C5.52201 18.7893 6.06031 19 6.62 19H13.38C13.9397 19 14.478 18.7893 14.8787 18.4142C15.2794 18.0391 15.5 17.5304 15.5 17L16.5 5M7 5V3.5C7 3.36193 7.05268 3.22955 7.14645 3.13579C7.24021 3.04204 7.37259 2.99 7.51 2.99H12.49C12.6274 2.99 12.7598 3.04204 12.8536 3.13579C12.9473 3.22955 13 3.36193 13 3.5V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              <button
                className="user-card__list-btn"
                onClick={() => handleViewEditList(user)}
              >
                View / edit their list
              </button>
            </div>
          ))}
        </div>
      </div>

      {showUserFormModal && (
        <UserFormModal
          user={editingUser}
          onSave={handleSaveUser}
          onClose={() => setShowUserFormModal(false)}
        />
      )}

      {showDeleteModal && deletingUser && (
        <DeleteUserConfirmModal
          user={deletingUser}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {showAdminEditModal && adminEditUser && (
        <AdminEditConfirmModal
          userName={adminEditUser.name}
          onConfirm={handleConfirmAdminEdit}
          onCancel={() => setShowAdminEditModal(false)}
        />
      )}
    </div>
  )
}
