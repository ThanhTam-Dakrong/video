<?php
session_start();

// Kiểm tra xem người dùng đã đăng nhập chưa
if (!isset($_SESSION['user_id'])) {
    header("Location: index.html");
    exit();
}

// Kết nối cơ sở dữ liệu
include 'config.php';

// Lấy thông tin người dùng từ session
$username = isset($_SESSION['username']) ? htmlspecialchars($_SESSION['username'], ENT_QUOTES, 'UTF-8') : 'Người dùng';
$role = isset($_SESSION['role']) ? htmlspecialchars($_SESSION['role'], ENT_QUOTES, 'UTF-8') : 'không xác định';
$user_id = $_SESSION['user_id'];
$room_id = isset($_GET['room_id']) ? $_GET['room_id'] : null;

if (!$room_id) {
    die("Không tìm thấy room_id. Vui lòng thử lại.");
}

if ($conn->connect_error) {
    die("Kết nối thất bại: " . $conn->connect_error);
}

// Xử lý khi người dùng nhấn "Kết thúc" cuộc gọi
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['end_call'])) {
    try {
        // Cập nhật trạng thái phòng thành 'closed'
        $stmt = $conn->prepare("UPDATE rooms SET status = 'closed' WHERE room_id = ?");
        $stmt->bind_param("s", $room_id);

        if (!$stmt->execute()) {
            error_log("Lỗi khi cập nhật phòng: " . $stmt->error);
            die("Lỗi khi cập nhật trạng thái phòng.");
        } else {
            // Điều hướng đến trang quản lý (hoặc trang khác)
            header("Location: index.html");
            exit();
        }
    } catch (Exception $e) {
        echo "Lỗi: " . $e->getMessage();
        exit();
    }
}

// Kiểm tra trạng thái hiện tại của phòng
try {
    $stmt = $conn->prepare("SELECT status FROM rooms WHERE room_id = ?");
    $stmt->bind_param("s", $room_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $rooms = $result->fetch_assoc();
        $room_status = $rooms['status'];
    } else {
        die("Không tìm thấy phòng.");
    }
} catch (Exception $e) {
    die("Lỗi khi lấy thông tin phòng: " . $e->getMessage());
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phòng học video</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
            background: black;
            color: white;
            font-family: Arial, sans-serif;
        }

        #videoGrid {
            flex: 1;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 10px;
            padding: 10px;
            background: black;
        }

        .videoParticipant {
            display: flex;
            flex-direction: column;
            align-items: center;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 10px;
        }

        .videoParticipant video {
            width: 100%;
            border-radius: 8px;
        }

        .videoParticipant .name {
            margin-top: 8px;
            font-size: 14px;
            text-align: center;
            color: white;
        }

        #controls {
            display: flex;
            justify-content: space-around;
            background: rgba(0, 0, 0, 0.8);
            padding: 10px;
            position: fixed;
            bottom: 0;
            width: 100%;
        }

        #controls button {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            padding: 10px;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.3s;
        }

        #controls button:hover {
            background: rgba(255, 255, 255, 0.4);
        }

        #controls button.end-call {
            background: red;
        }
    </style>
</head>
<body>
    <div id="videoGrid"></div>
    <div id="controls">
        <button id="toggleMic">🎤 Tắt/Bật mic</button>
        <button id="toggleCamera">📹 Tắt/Bật camera</button>
        <button id="shareScreen">🖥️ Chia sẻ màn hình</button>
        <button id="endCall" class="end-call">❌ Kết thúc</button>
    </div>

    <!-- Form ẩn để xử lý kết thúc cuộc gọi -->
    <form method="POST" id="endCallForm" style="display:none;">
        <input type="hidden" name="end_call" value="1">
    </form>

  <script src="https://cdn.socket.io/4.0.1/socket.io.min.js"></script> 
  <!-- <script src="https://thanhtam-dakrong.github.io/video/client.js"> -->
   <script src="https://cdn.jsdelivr.net/npm/simple-peer@9.11.0/simplepeer.min.js"></script>

<script>
    const videoGrid = document.getElementById('videoGrid');
    const toggleMicButton = document.getElementById('toggleMic');
    const toggleCameraButton = document.getElementById('toggleCamera');
    const shareScreenButton = document.getElementById('shareScreen');
    const endCallButton = document.getElementById('endCall');

    let localStream;
    let isMicOn = true;
    let isCameraOn = true;
    const socket = io('https://video-4-n5r2.onrender.com'); // Kết nối Socket.IO
   // const socket = io('js/server.js');
    const participants = {}; // Lưu trữ thông tin về các người tham gia

    // Bắt đầu video
    async function startVideo() {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            addVideoStream('<?php echo $username; ?>', localStream, true);
            socket.emit('user-joined', { username: '<?php echo $username; ?>' });  // Gửi tên người dùng đến server
        } catch (err) {
            console.error("Không thể truy cập camera/mic:", err);
        }
    }

    // Thêm video stream vào giao diện
    function addVideoStream(name, stream, isLocal = false) {
        const videoParticipant = document.createElement('div');
        videoParticipant.classList.add('videoParticipant');

        const video = document.createElement('video');
        if (stream) {
            video.srcObject = stream;
        }
        video.autoplay = true;
        video.playsInline = true;

        const nameLabel = document.createElement('div');
        nameLabel.classList.add('name');
        nameLabel.textContent = name;

        videoParticipant.appendChild(video);
        videoParticipant.appendChild(nameLabel);
        videoGrid.appendChild(videoParticipant);

        if (isLocal) {
            participants[name] = stream;
        }
    }

    // Tắt/Bật mic
    toggleMicButton.addEventListener('click', () => {
        if (localStream) {
            isMicOn = !isMicOn;
            localStream.getAudioTracks().forEach(track => (track.enabled = isMicOn));
            toggleMicButton.textContent = isMicOn ? '🎤 Mic Bật' : '🔇 Mic Tắt';
        }
    });

    // Tắt/Bật camera
    toggleCameraButton.addEventListener('click', () => {
        if (localStream) {
            isCameraOn = !isCameraOn;
            localStream.getVideoTracks().forEach(track => (track.enabled = isCameraOn));
            toggleCameraButton.textContent = isCameraOn ? '📹 Camera Bật' : '🚫 Camera Tắt';
        }
    });

    // Chia sẻ màn hình
    shareScreenButton.addEventListener('click', async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            addVideoStream('Chia sẻ màn hình', screenStream);
            screenStream.getVideoTracks()[0].addEventListener('ended', () => {
                videoGrid.innerHTML = ''; // Xóa stream khi ngừng chia sẻ
                Object.keys(participants).forEach((name) => {
                    addVideoStream(name, participants[name]);
                });
            });
        } catch (err) {
            console.error("Không thể chia sẻ màn hình:", err);
        }
    });

    // Kết thúc cuộc gọi
    endCallButton.addEventListener('click', () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop()); // Dừng tất cả các track của localStream
        }
        document.getElementById('endCallForm').submit(); // Gửi yêu cầu kết thúc cuộc gọi
    });

    // Xử lý các sự kiện từ server qua socket
    socket.on('new-participant', (data) => {
        addVideoStream(data.name, data.stream);
    });

    socket.on('participant-left', (name) => {
        // Loại bỏ video của người tham gia rời đi
        document.querySelectorAll('.videoParticipant').forEach(videoElement => {
            if (videoElement.querySelector('.name').textContent === name) {
                videoGrid.removeChild(videoElement);
            }
        });
    });

    // Bắt đầu video khi trang tải xong
    window.onload = startVideo;
</script>
</body>
</html>
