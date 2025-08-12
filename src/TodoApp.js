import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import './index.css';

function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleAddTodo = () => {
    if (inputValue.trim() !== '') {
      setTodos([...todos, inputValue.trim()]);
      setInputValue('');
    }
  };

  const handleDeleteTodo = (index) => {
    setTodos(todos.filter((_, i) => i !== index));
  };

  return (
    <div className="todo-app">
      <h1>Todo App</h1>
      <InputForm inputValue={inputValue} onInputChange={handleInputChange} onAddTodo={handleAddTodo} />
      <TodoList todos={todos} onDeleteTodo={handleDeleteTodo} />
    </div>
  );
}

function InputForm({ inputValue, onInputChange, onAddTodo }) {
  return (
    <div className="input-form">
      <input type="text" value={inputValue} onChange={onInputChange} />
      <button onClick={onAddTodo}>Add</button>
    </div>
  );
}

function TodoList({ todos, onDeleteTodo }) {
  return (
    <ul className="todo-list">
      {todos.map((todo, index) => (
        <TodoItem key={index} todo={todo} onDelete={() => onDeleteTodo(index)} />
      ))}
    </ul>
  );
}

function TodoItem({ todo, onDelete }) {
  return (
    <li className="todo-item">
      {todo} <button onClick={onDelete}>Delete</button>
    </li>
  );
}

ReactDOM.render(<TodoApp />, document.getElementById('root'));