import { useState, useEffect } from 'react'
import axios from '../utils/axios'
import './UserPage.css'

function UserPage() {
  const [users, setUsers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setShowForm(true)
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setShowForm(true)
  }

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`/api/users/${userId}`)
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  return (
    <div className="user-page">
      <div className="user-page-header">
        <h1>User Management</h1>
        <button onClick={handleAddUser}>Add New User</button>
      </div>

      <div className="user-list">
        {users.map(user => (
          <div key={user.id} className="user-card">
            <div className="user-info">
              <h3>{user.username}</h3>
              <p>Created: {new Date(user.created_at).toLocaleDateString()}</p>
            </div>
            <div className="user-actions">
              <button onClick={() => handleEditUser(user)}>Edit</button>
              <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default UserPage 