const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Track connected users: socket.id -> username
const users = {};

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  // User joins with a chosen name
  socket.on('join', (username) => {
    // Sanitize and trim
    const name = String(username).trim().slice(0, 24) || 'Anonymous';
    users[socket.id] = name;

    console.log(`${name} joined`);

    // Notify everyone this user joined
    io.emit('system', { message: `${name} joined the chat`, type: 'join' });

    // Send updated user list to all clients
    io.emit('userList', Object.values(users));
  });

  // User sends a chat message
  socket.on('chatMessage', (msg) => {
    const name = users[socket.id] || 'Anonymous';
    const text = String(msg).trim().slice(0, 500);
    if (!text) return;

    io.emit('chatMessage', {
      username: name,
      message: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  });

  // User is typing
  socket.on('typing', () => {
    const name = users[socket.id];
    if (name) {
      socket.broadcast.emit('typing', { username: name });
    }
  });

  socket.on('stopTyping', () => {
    socket.broadcast.emit('stopTyping');
  });

  // User disconnects
  socket.on('disconnect', () => {
    const name = users[socket.id];
    if (name) {
      delete users[socket.id];
      io.emit('system', { message: `${name} left the chat`, type: 'leave' });
      io.emit('userList', Object.values(users));
      console.log(`${name} disconnected`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});
