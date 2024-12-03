// Kết nối với server
const socket = io('https://<SERVER_URL>'); // Thay <SERVER_URL> bằng URL server của bạn (Render hoặc localhost)

// Lấy các phần tử DOM
const videoGrid = document.getElementById('videoGrid');
const myVideo = document.createElement('video');
myVideo.muted = true; // Tắt tiếng video của chính mình

// Tạo luồng video của chính người dùng
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then((stream) => {
    addVideoStream('my-video', stream); // Hiển thị video của chính mình
    socket.emit('user-stream', stream); // Gửi luồng của mình đến server

    // Khi có người khác phát luồng video
    socket.on('user-stream', ({ userId, streamData }) => {
        addVideoStream(userId, streamData);
    });

    // Khi nhận danh sách tất cả người dùng trong phòng
    socket.on('update-users', (users) => {
        users.forEach(user => {
            if (user.stream && user.userId !== 'my-video') {
                addVideoStream(user.userId, user.stream);
            }
        });
    });

    // Khi có người khác tham gia phòng
    socket.on('user-connected', ({ userId }) => {
        console.log(`${userId} đã kết nối.`);
    });

    // Khi có người khác ngắt kết nối
    socket.on('user-disconnected', ({ userId }) => {
        removeVideoStream(userId);
    });
}).catch((error) => {
    console.error('Không thể truy cập camera/micro:', error);
});

// Tham gia phòng
const roomId = 'room-123'; // Đặt ID phòng
const username = 'Người dùng A'; // Tên người dùng
socket.emit('join-room', roomId, socket.id, username);

// Hàm thêm video vào giao diện
function addVideoStream(userId, stream) {
    if (document.getElementById(`video-${userId}`)) return; // Tránh thêm video trùng lặp

    const video = document.createElement('video');
    video.id = `video-${userId}`;
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false; // Không hiển thị nút điều khiển video

    videoGrid.appendChild(video);
}

// Hàm xóa video khỏi giao diện
function removeVideoStream(userId) {
    const video = document.getElementById(`video-${userId}`);
    if (video) {
        video.remove();
    }
}
