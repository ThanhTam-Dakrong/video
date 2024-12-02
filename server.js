// Import các thư viện cần thiết
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

// Tạo ứng dụng Express và server HTTP
const app = express();
const server = http.createServer(app);

// Khởi tạo Socket.IO
const io = socketIO(server);

// Cung cấp tài nguyên tĩnh từ thư mục "public"
app.use(express.static('public'));

// Lưu trữ thông tin phòng
const rooms = {};

// Lắng nghe sự kiện "connection" từ Socket.IO
io.on('connection', socket => {
    console.log('Một người dùng đã kết nối: ' + socket.id);

    // Lắng nghe sự kiện "join-room" từ client
    socket.on('join-room', (roomId, userId, username) => {
        // Nếu phòng chưa tồn tại, tạo mới
        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }

        // Thêm người dùng vào phòng
        rooms[roomId].push({ userId, username });
        socket.join(roomId); // Tham gia phòng
        console.log(`${username} đã tham gia phòng ${roomId}`);

        // Thông báo cho các client khác trong phòng về người mới tham gia
        socket.to(roomId).emit('user-connected', { userId, username });

        // Gửi danh sách người dùng trong phòng cho người dùng mới tham gia
        socket.emit('update-users', rooms[roomId]);

        // Lắng nghe sự kiện "disconnect"
        socket.on('disconnect', () => {
            rooms[roomId] = rooms[roomId].filter(user => user.userId !== userId);
            console.log(`${username} đã rời phòng ${roomId}`);
            socket.to(roomId).emit('user-disconnected', { userId, username });
        });

        // Lắng nghe tin nhắn trong phòng
        socket.on('message', message => {
            io.to(roomId).emit('message', message);
        });

        // Các sự kiện điều khiển như tắt/mở mic, video, chia sẻ màn hình
        socket.on('mute-audio', userId => {
            io.to(roomId).emit('mute-audio', userId);
        });

        socket.on('unmute-audio', userId => {
            io.to(roomId).emit('unmute-audio', userId);
        });

        socket.on('stop-video', userId => {
            io.to(roomId).emit('stop-video', userId);
        });

        socket.on('start-video', userId => {
            io.to(roomId).emit('start-video', userId);
        });

        socket.on('share-screen', userId => {
            io.to(roomId).emit('share-screen', userId);
        });

        socket.on('stop-share-screen', userId => {
            io.to(roomId).emit('stop-share-screen', userId);
        });
    });
});

// Sử dụng biến môi trường PORT (Render sẽ cung cấp cổng này)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server đang chạy trên cổng ${PORT}`);
});
