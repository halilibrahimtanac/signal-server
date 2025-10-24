
const pendingMessages = new Map();

/**
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {Map<string, string>} onlineUsers
 */
export function registerDmHandlers(io, socket, onlineUsers) {
  socket.on('send-dm', ({ toUserId, text, message: incomingMessage }) => {
    const fromUserId = socket.userId; 

    if (!fromUserId) {
      console.error('DM gönderilemedi: Gönderen kullanıcının kimliği sokette bulunamadı.');
      return;
    }

    // Prefer client-provided persisted message; fallback to generating
    const message = incomingMessage || {
      id: `${Date.now()}-${fromUserId}-${toUserId}`,
      from: fromUserId,
      to: toUserId,
      text: text,
      timestamp: new Date().toISOString()
    };

    const targetSocketId = onlineUsers.get(toUserId);

    if (targetSocketId) {
      io.to(targetSocketId).emit('receive-dm', message);
      console.log(`Mesaj ${fromUserId}'den ${toUserId}'a gönderildi.`);
    } else {
      if (!pendingMessages.has(toUserId)) {
        pendingMessages.set(toUserId, []);
      }
      pendingMessages.get(toUserId).push(message);
      console.log(`Mesaj ${fromUserId}'den ${toUserId}'a beklemeye alındı (kullanıcı offline).`);
    }

    socket.emit('dm-sent-confirmation', message);
  });
}

/**
 * @param {import('socket.io').Server} io
 * @param {string} userId
 * @param {string} socketId
 */
export function sendPendingDms(io, userId, socketId) {
  if (pendingMessages.has(userId)) {
    const messages = pendingMessages.get(userId);
    console.log(`${userId} için ${messages.length} adet bekleyen mesaj gönderiliyor.`);
    
    io.to(socketId).emit('pending-dms', messages);
    
    pendingMessages.delete(userId);
  }
}