import React, { useState, useEffect } from 'react';
import socket from './socket';
import axios from 'axios';

function App() {
  const [userId, setUserId] = useState(localStorage.getItem('username') || '');
  const [inputUsername, setInputUsername] = useState('');
  const [password, setPassword] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [isLogin, setIsLogin] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  useEffect(() => {
  socket.on('online_users', (users) => {
    setOnlineUsers(users);
  });

  return () => socket.off('online_users');
}, []);

  useEffect(() => {
    if (userId) {
      socket.emit('join', userId);
    }
  }, [userId]);
  
  useEffect(() => {
  if (receiverId) {
    fetchSuggestions();
  } else {
    setSuggestions([]);
  }
}, [chat, receiverId]);
  

  useEffect(() => {
    const handleReceive = (data) => {
      if (data.from !== userId) {
        setChat((prev) => [...prev, data]);
      }
    };

    socket.on('receive_message', handleReceive);
    return () => socket.off('receive_message', handleReceive);
  }, [userId]);

  const sendMessage = async () => {
    if (!message || !receiverId) return;
    const msgData = { from: userId, to: receiverId, message };
    socket.emit('send_message', msgData);
    setChat((prev) => [...prev, { from: userId, message }]);
    try {
      await axios.post('https://chat-app-backend-5ox2.onrender.com/api/messages/send', msgData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
    } catch (err) {
      console.error('Send message failed:', err);
    }
    setMessage('');
  };

  const handleAuth = async () => {
    const endpoint = isLogin ? 'login' : 'register';
    if (!inputUsername || !password) return alert('Username and password required');
    try {
      const res = await axios.post(`https://chat-app-backend-5ox2.onrender.com/api/auth/${endpoint}`, {
        username: inputUsername,
        password,
      });
      if (isLogin) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('username', res.data.username);
        setUserId(res.data.username);
      } else {
        alert('Registered successfully. Please login.');
        setInputUsername('');
        setPassword('');
        setIsLogin(true);
      }
    } catch (err) {
      alert(err.response?.data?.msg || 'Authentication failed');
    }
  };

  const logout = () => {
    localStorage.clear();
    setUserId('');
    setReceiverId('');
    setChat([]);
    setInputUsername('');
    setPassword('');
  };
  const fetchSuggestions = async () => {
  if (!chat.length) return;

  setLoadingSuggestions(true);

  try {
  
    const messageHistory = chat.slice(-10).map(msg => `${msg.from}: ${msg.message}`);

    const res = await axios.post('http://localhost:5001/api/suggestions', { messageHistory });
    setSuggestions(res.data.suggestions || []);
  } catch (err) {
    console.error('Failed to fetch suggestions:', err);
    setSuggestions([]);
  } finally {
    setLoadingSuggestions(false);
  }
};

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-4 text-center">{isLogin ? 'Login' : 'Register'}</h2>
          <input
            className="w-full p-2 mb-3 border rounded"
            placeholder="Username"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
          />
          <input
            className="w-full p-2 mb-4 border rounded"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handleAuth}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
          >
            {isLogin ? 'Login' : 'Register'}
          </button>
          <p className="mt-4 text-sm text-center">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:underline"
            >
              {isLogin ? 'Register here' : 'Login here'}
            </button>
          </p>
        </div>
      </div>
    );
  }

 return (
  <div className="min-h-screen bg-gray-100 p-6">
    <div className="max-w-5xl mx-auto flex gap-6">
      
      {/* Chat Section */}
      <div className="flex-1 bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Welcome, {userId}</h2>
          <button
            onClick={logout}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        <input
          className="w-full p-2 mb-4 border rounded"
          placeholder="Receiver ID"
          value={receiverId}
          onChange={(e) => setReceiverId(e.target.value)}
        />

        <div className="h-64 overflow-y-auto border rounded p-4 mb-4 bg-gray-50">
          {chat.map((msg, i) => (
            <div
              key={i}
              className={`mb-2 p-2 rounded ${
                msg.from === userId ? 'bg-blue-200 text-right' : 'bg-green-200 text-left'
              }`}
            >
              <p className="text-sm font-semibold">{msg.from}</p>
              <p>{msg.message}</p>
            </div>
          ))}
        </div>

      {/* Suggestions below input */}
{loadingSuggestions && <p className="text-sm text-gray-500 mb-2">Loading suggestions...</p>}

{suggestions.length > 0 && (
  <div className="mb-2 flex gap-2 flex-wrap">
    {suggestions.map((sug, i) => (
      <button
        key={i}
        onClick={() => setMessage(sug)}
        className="bg-green-300 px-3 py-1 rounded hover:bg-green-400 transition"
      >
        {sug}
      </button>
    ))}
  </div>
)}

<div className="flex gap-2">
  <input
    value={message}
    onChange={(e) => setMessage(e.target.value)}
    placeholder="Type a message"
    className="flex-grow p-2 border rounded"
  />
  <button
    onClick={sendMessage}
    className="bg-blue-500 text-white px-4 rounded hover:bg-blue-600"
  >
    Send
  </button>
</div>

      </div>

      {/* Online Users Panel */}
      <div className="w-64 bg-white p-4 rounded-lg shadow h-fit max-h-[500px] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-3">Online Users</h3>
        <ul className="space-y-2">
          {onlineUsers
            .filter((u) => u !== userId)
            .map((user, idx) => (
              <li key={idx} className="bg-blue-100 px-3 py-2 rounded">
                {user}
              </li>
            ))}
        </ul>
        {onlineUsers.length === 1 && (
          <p className="text-sm text-gray-500 mt-2">You're the only one online 😅</p>
        )}
      </div>
    </div>
  </div>
);
}

export default App;
