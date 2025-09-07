import express from 'express';
import http from 'http';
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let onlineUsers = new Map();
let usersInCall = new Set();

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

    socket.on('call-user', (data) => {
      if (usersInCall.has(data.targetUserId)) {
        console.log(`Arama denemesi başarısız: ${data.targetUserId} zaten bir görüşmede.`);
        socket.emit('user-is-busy');
        return;
      }
  
      const targetSocketId = onlineUsers.get(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('incoming-call', {
          signal: data.signal,
          from: data.fromUserId
        });
      }
    });

    socket.on('accept-call', (data) => {
      usersInCall.add(data.targetUserId);
      usersInCall.add(data.fromUserId);
  
      console.log('Aktif aramadaki kullanıcılar:', Array.from(usersInCall));
  
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
     usersInCall.delete(data.targetUserId);
     usersInCall.delete(data.userId);
     if(targetSocketId) {
        io.to(targetSocketId).emit('call-ended');
     }
  });

  socket.on('cancel-call', (data) => {
    const targetSocketId = onlineUsers.get(data.targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-cancelled');
    }
  });


  socket.on('disconnect', () => {
    console.log('Bir kullanıcı ayrıldı:', socket.id);
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        usersInCall.delete(userId);
        break;
      }
    }
    io.emit('online-users-updated', Array.from(onlineUsers.keys()));
    console.log('Online kullanıcılar:', onlineUsers);
  });

  socket.on("new-twish-posted", (newTwishId) => {
    console.log("New Twish Posted", newTwishId);
    io.emit("invalidate-twish-list");
  })
});

app.get('/', (req, res) => {
  res.send('Server çalışıyor 🚀');
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Sinyal sunucusu ${PORT} portunda çalışıyor.`));