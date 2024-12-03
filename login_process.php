<?php
session_start();
include 'config.php'; // Kết nối đến cơ sở dữ liệu

// Kiểm tra xem có phải phương thức POST
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Lấy dữ liệu từ form
    $username = $_POST['username'];
    $password = $_POST['password'];

    // Chuẩn bị câu lệnh SQL để kiểm tra tên đăng nhập
    $stmt = $conn->prepare("SELECT id, password, role FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        // Nếu tồn tại tên đăng nhập, lấy mật khẩu đã mã hóa
        $stmt->bind_result($id, $hashed_password, $role);
        $stmt->fetch();

        // Kiểm tra mật khẩu
        if (password_verify($password, $hashed_password)) {
            // Đăng nhập thành công, lưu thông tin vào session
            $_SESSION['user_id'] = $id;
            $_SESSION['username'] = $username;
            $_SESSION['role'] = $role;

            // Chuyển hướng đến trang chủ
            header("Location: trangchu2.php");
            exit();
        } else {
            echo "Mật khẩu không chính xác.";
        }
    } else {
        echo "Tên đăng nhập không tồn tại.";
    }

    // Đóng câu lệnh và kết nối
    $stmt->close();
    $conn->close();
} else {
    echo "Yêu cầu không hợp lệ.";
}
?>
