const socket = io("https://video-3-8shi.onrender.com"); // Kết nối đến Signaling Server
const videoGrid = document.getElementById("videoGrid");
let localStream;
const peers = {};

// Hiển thị video
function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.appendChild(video);
}

// Khi nhấn nút Start Call
document.getElementById("startCall").addEventListener("click", async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

  // Hiển thị video của chính bạn
  const localVideo = document.createElement("video");
  localVideo.muted = true;
  addVideoStream(localVideo, localStream);

  socket.emit("join-call", "room-1");

  // Khi có người mới tham gia
  socket.on("user-connected", (userId) => {
    console.log("User connected:", userId);
    connectToNewUser(userId, localStream);
  });

  // Khi nhận được tín hiệu WebRTC
  socket.on("signal", async (data) => {
    const peerConnection = peers[data.from];
    if (!peerConnection) return;

    if (data.type === "offer") {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("signal", { to: data.from, type: "answer", answer });
    } else if (data.type === "answer") {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.type === "candidate") {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  });

  // Khi có người ngắt kết nối
  socket.on("user-disconnected", (userId) => {
    if (peers[userId]) {
      peers[userId].close();
      delete peers[userId];
    }
  });
});

// Kết nối tới người dùng mới
function connectToNewUser(userId, stream) {
  const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  peerConnection.ontrack = (event) => {
    const remoteVideo = document.createElement("video");
    addVideoStream(remoteVideo, event.streams[0]);
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("signal", { to: userId, type: "candidate", candidate: event.candidate });
    }
  };

  peers[userId] = peerConnection;

  peerConnection.createOffer().then((offer) => {
    peerConnection.setLocalDescription(offer);
    socket.emit("signal", { to: userId, type: "offer", offer });
  });
}

// Khi nhấn nút End Call
document.getElementById("endCall").addEventListener("click", () => {
  Object.values(peers).forEach((peer) => peer.close());
  peers = {};
  socket.disconnect();
});
