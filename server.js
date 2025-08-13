import express from 'express';
import http from 'http';
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://1e28443e6a56.ngrok-free.app"],
    methods: ["GET", "POST"]
  }
});

let onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('Bir kullanıcı bağlandı:', socket.id);

  socket.on('user-online', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('online-users-updated', Array.from(onlineUsers.keys()));
    console.log('Online kullanıcılar:', onlineUsers);
  });

  socket.on('check-user-online', (userId, callback) => {
    callback({ isOnline: onlineUsers.has(userId) });
  });

  // WebRTC Sinyalleşme Olayları
  socket.on('call-user', (data) => {
    const targetSocketId = onlineUsers.get(data.targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('incoming-call', {
        signal: data.signal,
        from: data.fromUserId
      });
    }
  });

  socket.on('accept-call', (data) => {
    const targetSocketId = onlineUsers.get(data.targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-accepted', { signal: data.signal });
    }
  });
  
  socket.on('call-rejected', (data) => {
     const targetSocketId = onlineUsers.get(data.targetUserId);
     if(targetSocketId) {
        io.to(targetSocketId).emit('call-ended');
     }
  });
  
   socket.on('end-call', (data) => {
     const targetSocketId = onlineUsers.get(data.targetUserId);
     if(targetSocketId) {
        io.to(targetSocketId).emit('call-ended');
     }
  });


  socket.on('disconnect', () => {
    console.log('Bir kullanıcı ayrıldı:', socket.id);
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit('online-users-updated', Array.from(onlineUsers.keys()));
    console.log('Online kullanıcılar:', onlineUsers);
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Sinyal sunucusu ${PORT} portunda çalışıyor.`));