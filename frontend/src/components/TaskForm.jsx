import { useState, useEffect } from 'react'
import axios from '../utils/axios'
import './TaskForm.css'

function TaskForm({ task, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending',
    categoryId: ''
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        status: task.status,
        categoryId: task.categoryId
      })
    }
  }, [task])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      console.log('Submitting form data:', formData)
      if (task) {
        const response = await axios.put(`/api/tasks/${task.id}`, formData)
        console.log('Update response:', response.data)
      } else {
        const response = await axios.post('/api/tasks', formData)
        console.log('Create response:', response.data)
      }
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving task:', error)
      setError(error.response?.data?.message || 'Failed to save task. Please try again.')
    }
  }

  return (
    <div className="task-form-modal">
      <div className="task-form">
        <h2>{task ? 'Edit Task' : 'Add New Task'}</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="submit">Save</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskForm 