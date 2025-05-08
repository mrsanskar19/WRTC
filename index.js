const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const rooms = new Map(); // roomId -> Set of { socket, userId }

io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  socket.on('join', ({ roomId, userId }) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add({ socket, userId });
    socket.roomId = roomId;
    socket.userId = userId;

    // Notify others in the room about the new user
    for (const { socket: otherSocket } of rooms.get(roomId)) {
      if (otherSocket !== socket) {
        otherSocket.emit('user-joined', { userId });
      }
    }

    console.log(`${userId} joined room ${roomId}`);
  });

  socket.on('offer', ({ offer, to, roomId }) => {
    const targetSocket = [...rooms.get(roomId)].find(({ userId }) => userId === to)?.socket;
    if (targetSocket) {
      targetSocket.emit('offer', { offer, from: socket.userId });
    }
  });

  socket.on('answer', ({ answer, to, roomId }) => {
    const targetSocket = [...rooms.get(roomId)].find(({ userId }) => userId === to)?.socket;
    if (targetSocket) {
      targetSocket.emit('answer', { answer, from: socket.userId });
    }
  });

  socket.on('candidate', ({ candidate, to, roomId }) => {
    const targetSocket = [...rooms.get(roomId)].find(({ userId }) => userId === to)?.socket;
    if (targetSocket) {
      targetSocket.emit('candidate', { candidate, from: socket.userId });
    }
  });

  socket.on('leave', ({ roomId, userId }) => {
    if (rooms.get(roomId)) {
      rooms.get(roomId).delete([...rooms.get(roomId)].find(({ userId: id }) => id === userId));
      for (const { socket: otherSocket } of rooms.get(roomId)) {
        otherSocket.emit('user-left', { userId });
      }
      if (rooms.get(roomId).size === 0) {
        rooms.delete(roomId);
      }
    }
    socket.disconnect();
  });

  socket.on('disconnect', () => {
    if (socket.roomId && rooms.get(socket.roomId)) {
      rooms.get(socket.roomId).delete([...rooms.get(socket.roomId)].find(({ userId }) => userId === socket.userId));
      for (const { socket: otherSocket } of rooms.get(socket.roomId)) {
        otherSocket.emit('user-left', { userId: socket.userId });
      }
      if (rooms.get(socket.roomId)?.size === 0) {
        rooms.delete(socket.roomId);
      }
    }
    console.log(`Disconnected: ${socket.id}`);
  });
});

app.get('/', (req, res) => {
  res.send('WebRTC Signaling Server is running.');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`WebRTC signaling server is running on port ${PORT}`);
});
