// index.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = new Map();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const roomId = url.searchParams.get('room');

  if (!roomId) {
    ws.close();
    return;
  }

  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  rooms.get(roomId).add(ws);
  ws.roomId = roomId;

  ws.on('message', (msg) => {
    // Broadcast to others in the room
    for (const client of rooms.get(roomId)) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  });

  ws.on('close', () => {
    rooms.get(roomId)?.delete(ws);
    if (rooms.get(roomId)?.size === 0) rooms.delete(roomId);
  });
});

app.get('/', (req, res) => {
  res.send('WebRTC Signaling Server is running.');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`WebRTC signaling server is running on port ${PORT}`);
});
