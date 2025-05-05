import React from 'react';
import './TaskList.css'

function TaskList({ tasks, onEdit, onDelete }) {
  return (
    <div className="task-list">
      {tasks.length === 0 ? (
        <p className="no-tasks">No tasks found. Add a new task to get started!</p>
      ) : (
        <ul>
          {tasks.map(task => (
            <li key={task.id} className="task-item">
              <div className="task-content">
                <h3>{task.title}</h3>
                <p>{task.description}</p>
                <span className={`status ${task.status}`}>{task.status}</span>
              </div>
              <div className="task-actions">
                <button onClick={() => onEdit(task)}>Edit</button>
                <button onClick={() => onDelete(task.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default TaskList 