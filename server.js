// Import các thư viện cần thiết
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');  // Thêm thư viện CORS

// Thêm middleware CORS



// Tạo ứng dụng Express và server HTTP
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
app.use(cors());
// Lưu trữ thông tin phòng và người dùng
const rooms = {}; // Lưu danh sách người dùng trong từng phòng
const userStreams = {}; // Lưu trữ video stream của từng user

// Giao diện HTML được trả về từ server
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Video Call App</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; text-align: center; }
                #video-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin: 20px; }
                video { width: 300px; border: 2px solid #ccc; border-radius: 8px; }
                button { padding: 10px 20px; margin: 10px; }
            </style>
        </head>
        <body>
            <h1>Welcome to Video Call App</h1>
            <div id="controls">
                <button onclick="muteAudio()">Mute Audio</button>
                <button onclick="unmuteAudio()">Unmute Audio</button>
                <button onclick="stopVideo()">Stop Video</button>
                <button onclick="startVideo()">Start Video</button>
                <button onclick="shareScreen()">Share Screen</button>
                <button onclick="stopShareScreen()">Stop Screen Share</button>
                <button onclick="endCall()">End Call</button>
            </div>
            <div id="video-grid"></div>
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                const videoGrid = document.getElementById('video-grid');
                const roomId = 'default-room'; // Bạn có thể thay đổi cách tạo roomId
                const userId = socket.id;
                const username = prompt("Enter your name:");

                // Tham gia phòng
                socket.emit('join-room', roomId, userId, username);

                // Nhận danh sách người dùng
                socket.on('update-users', users => {
                    console.log('Users in room:', users);
                });

                // Khi có người dùng kết nối
                socket.on('user-connected', data => {
                    console.log('User connected:', data);
                });

                // Khi người dùng rời đi
                socket.on('user-disconnected', data => {
                    console.log('User disconnected:', data);
                    const video = document.getElementById(data.userId);
                    if (video) video.remove();
                });

                // Điều khiển từ các nút
                function muteAudio() {
                    socket.emit('mute-audio', userId);
                }
                function unmuteAudio() {
                    socket.emit('unmute-audio', userId);
                }
                function stopVideo() {
                    socket.emit('stop-video', userId);
                }
                function startVideo() {
                    socket.emit('start-video', userId);
                }
                function shareScreen() {
                    socket.emit('share-screen', userId);
                }
                function stopShareScreen() {
                    socket.emit('stop-share-screen', userId);
                }
                function endCall() {
                    socket.emit('end-call');
                }
            </script>
        </body>
        </html>
    `);
});

// Xử lý sự kiện kết nối từ client
io.on('connection', (socket) => {
    console.log('Một người dùng đã kết nối:', socket.id);

    // Khi người dùng tham gia phòng
    socket.on('join-room', (roomId, userId, username) => {
        if (!rooms[roomId]) rooms[roomId] = [];
        rooms[roomId].push({ userId, username });
        socket.join(roomId);

        console.log(`${username} đã tham gia phòng ${roomId}`);
        socket.to(roomId).emit('user-connected', { userId, username });
        socket.emit('update-users', rooms[roomId]);

        // Nhận video stream từ người dùng
        socket.on('user-stream', (streamData) => {
            userStreams[userId] = streamData;
            socket.to(roomId).emit('user-stream', { userId, streamData });
        });

        // Các điều khiển
        socket.on('mute-audio', () => io.to(roomId).emit('mute-audio', userId));
        socket.on('unmute-audio', () => io.to(roomId).emit('unmute-audio', userId));
        socket.on('stop-video', () => io.to(roomId).emit('stop-video', userId));
        socket.on('start-video', () => io.to(roomId).emit('start-video', userId));
        socket.on('share-screen', () => io.to(roomId).emit('share-screen', userId));
        socket.on('stop-share-screen', () => io.to(roomId).emit('stop-share-screen', userId));

        // Khi người dùng rời khỏi
        socket.on('disconnect', () => {
            rooms[roomId] = rooms[roomId].filter(user => user.userId !== userId);
            delete userStreams[userId];
            console.log(`${username} đã rời phòng ${roomId}`);
            socket.to(roomId).emit('user-disconnected', { userId, username });
        });

        // Khi kết thúc cuộc gọi
        socket.on('end-call', () => {
            console.log(`Kết thúc cuộc gọi trong phòng ${roomId}`);
            io.to(roomId).emit('call-ended', { roomId });
            socket.leave(roomId);
        });
    });
});

// Cấu hình cổng và khởi động server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server đang chạy trên cổng ${PORT}`);
});
