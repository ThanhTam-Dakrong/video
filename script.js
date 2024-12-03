let localStream;
let remoteStream;
let peerConnection;

// STUN server (dùng để vượt NAT/firewall)
const configuration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    }
  ]
};

// Chọn các phần tử video
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

// Start Call
document.getElementById("startCall").addEventListener("click", async () => {
  // Lấy luồng video từ camera
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  // Khởi tạo kết nối ngang hàng (PeerConnection)
  peerConnection = new RTCPeerConnection(configuration);

  // Thêm luồng địa phương vào PeerConnection
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  // Nhận luồng từ phía đối diện
  peerConnection.ontrack = event => {
    remoteStream = event.streams[0];
    remoteVideo.srcObject = remoteStream;
  };

  // Đàm phán ICE candidate
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      console.log("Send ICE Candidate to Remote Peer:", event.candidate);
      // Gửi ICE candidate tới peer khác thông qua server signaling
    }
  };

  // Tạo SDP offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  console.log("Send Offer to Remote Peer:", offer);
  // Gửi offer tới peer khác thông qua server signaling
});

// End Call
document.getElementById("endCall").addEventListener("click", () => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
});

// Share Screen
document.getElementById("shareScreen").addEventListener("click", async () => {
  const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  const screenTrack = screenStream.getTracks()[0];

  // Thay track video bằng track màn hình
  const sender = peerConnection.getSenders().find(s => s.track.kind === "video");
  sender.replaceTrack(screenTrack);

  // Trả lại camera sau khi chia sẻ màn hình xong
  screenTrack.onended = () => {
    sender.replaceTrack(localStream.getVideoTracks()[0]);
  };
});
