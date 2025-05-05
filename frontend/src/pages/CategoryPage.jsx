import { useState, useEffect } from 'react'
import axios from '../utils/axios'
import './CategoryPage.css'

function CategoryPage() {
  const [categories, setCategories] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/categories')
      setCategories(response.data)
      setError('')
    } catch (error) {
      console.error('Error fetching categories:', error)
      setError('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newCategory.trim()) {
      setError('Category name cannot be empty')
      return
    }

    try {
      setError('')
      await axios.post('/api/categories', { name: newCategory.trim() })
      setNewCategory('')
      fetchCategories()
    } catch (error) {
      console.error('Error creating category:', error)
      setError(error.response?.data?.message || 'Failed to create category')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return

    try {
      setError('')
      await axios.delete(`/api/categories/${id}`)
      fetchCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      setError(error.response?.data?.message || 'Failed to delete category')
    }
  }

  if (loading) {
    return <div className="category-page">Loading categories...</div>
  }

  return (
    <div className="category-page">
      <h1>Categories</h1>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="category-form">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Enter category name"
          required
        />
        <button type="submit">Add Category</button>
      </form>

      <div className="categories-list">
        {categories.length === 0 ? (
          <p>No categories found. Add your first category above.</p>
        ) : (
          categories.map(category => (
            <div key={category.id} className="category-item">
              <span>{category.name}</span>
              <button 
                onClick={() => handleDelete(category.id)}
                disabled={category.name === 'Uncategorized'}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CategoryPage 