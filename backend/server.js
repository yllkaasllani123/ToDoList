import express from 'express'
import cors from 'cors'
import mysql from 'mysql2/promise'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const app = express()
const PORT = process.env.PORT || 5001
const JWT_SECRET = 'your-secret-key' // In production, use environment variable

// Middleware
app.use(cors())
app.use(express.json())

// MySQL Connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'todolist',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// Initialize Database
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection()
    
    // Create users table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create categories table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create tasks table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('pending', 'in-progress', 'completed') DEFAULT 'pending',
        user_id INT,
        category_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `)

    // Check if default category exists
    const [categories] = await connection.query('SELECT * FROM categories WHERE name = ?', ['Uncategorized'])
    if (categories.length === 0) {
      await connection.query('INSERT INTO categories (name) VALUES (?)', ['Uncategorized'])
      console.log('Default category created')
    }

    connection.release()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
  }
}

initializeDatabase()

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    console.log('No token provided')
    return res.sendStatus(401)
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Token verification failed:', err)
      return res.sendStatus(403)
    }
    console.log('Token verified successfully, user:', user)
    req.user = user
    next()
  })
}

// Routes
// Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    console.log('Login attempt for user:', username)
    
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username])
    console.log('Found users:', users)
    
    if (users.length === 0) {
      console.log('User not found:', username)
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const user = users[0]
    console.log('User found:', { id: user.id, username: user.username })
    
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      console.log('Invalid password for user:', username)
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    console.log('Login successful for user:', username)
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' })
    console.log('Generated token for user ID:', user.id)
    res.json({ token })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Tasks
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const [tasks] = await pool.query(
      'SELECT * FROM tasks WHERE user_id = ?',
      [req.user.id]
    )
    res.json(tasks)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    console.log('Creating task with data:', req.body)
    console.log('User from token:', req.user)
    
    // Verify user exists
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [req.user.id])
    if (users.length === 0) {
      console.log('User not found in database:', req.user.id)
      return res.status(404).json({ message: 'User not found' })
    }

    const { title, description, status, categoryId } = req.body
    const [result] = await pool.query(
      'INSERT INTO tasks (title, description, status, user_id, category_id) VALUES (?, ?, ?, ?, ?)',
      [title, description, status, req.user.id, categoryId || null]
    )
    console.log('Task created successfully:', result)
    res.status(201).json({ id: result.insertId, ...req.body })
  } catch (error) {
    console.error('Error creating task:', error)
    res.status(400).json({ message: error.message })
  }
})

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, status, categoryId } = req.body
    await pool.query(
      'UPDATE tasks SET title = ?, description = ?, status = ?, category_id = ? WHERE id = ? AND user_id = ?',
      [title, description, status, categoryId, req.params.id, req.user.id]
    )
    res.json({ id: req.params.id, ...req.body })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    )
    res.sendStatus(204)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// Users
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, username, created_at FROM users')
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.post('/api/users', async (req, res) => {
  try {
    const { username, email, password } = req.body
    const hashedPassword = await bcrypt.hash(password, 10)
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    )
    res.status(201).json({ id: result.insertId, username, email })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.sqlMessage.includes('username')) {
        res.status(400).json({ message: 'Username already exists' })
      } else if (error.sqlMessage.includes('email')) {
        res.status(400).json({ message: 'Email already exists' })
      }
    } else {
      res.status(400).json({ message: error.message })
    }
  }
})

// Categories
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT * FROM categories')
    res.json(categories)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.post('/api/categories', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body
    const [result] = await pool.query(
      'INSERT INTO categories (name) VALUES (?)',
      [name]
    )
    res.status(201).json({ id: result.insertId, name })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// Add this route before the app.listen
app.get('/api/debug/users', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM users')
    console.log('Users in database:', users)
    res.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ message: 'Error fetching users' })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
}) 