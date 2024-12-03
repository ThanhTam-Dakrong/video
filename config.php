<?php
// Thông tin kết nối cơ sở dữ liệu
$servername = "sql211.infinityfree.com"; // MySQL Hostname trên InfinityFree
$username = "if0_37687617"; // MySQL Username của bạn
$password = "22031991Qt"; // MySQL Password của bạn
$dbname = "if0_37687617_your_database"; // Đúng tên cơ sở dữ liệu trên InfinityFree

// Kết nối đến MySQL và chỉ định cơ sở dữ liệu ngay khi kết nối
$conn = new mysqli($servername, $username, $password, $dbname);

// Kiểm tra kết nối
if ($conn->connect_error) {
    die("Kết nối thất bại: " . $conn->connect_error);
}

// Kiểm tra xem cơ sở dữ liệu có tồn tại không
if (!$conn->select_db($dbname)) {
    // Nếu cơ sở dữ liệu không tồn tại, tạo cơ sở dữ liệu từ tệp SQL
    $sql_file = 'database.sql'; // Đường dẫn đến tệp SQL
    if (file_exists($sql_file)) {
        $sql_commands = file_get_contents($sql_file);

        // Thực thi từng câu lệnh SQL trong tệp SQL
        if ($conn->multi_query($sql_commands)) {
            echo "Cơ sở dữ liệu và các bảng đã được tạo thành công!";
            // Đợi đến khi tất cả các lệnh đã thực thi
            do {
                if ($result = $conn->store_result()) {
                    $result->free();
                }
            } while ($conn->more_results() && $conn->next_result());
        } else {
            die("Lỗi khi thực thi tệp SQL: " . $conn->error);
        }
    } else {
        die("Không tìm thấy tệp database.sql để tạo cơ sở dữ liệu.");
    }
}
function getOpenViduToken($room_name, $room_password = '') {
    // Cấu hình URL và API Key của máy chủ OpenVidu
    $server_url = 'https://YOUR_SERVER_IP:4443';
    $secret = 'YOUR_SECRET';

    // Dữ liệu yêu cầu API để tạo token
    $data = json_encode(array('session' => $room_name, 'role' => 'PUBLISHER'));

    // Cài đặt yêu cầu
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $server_url . "/openvidu/api/tokens");
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Authorization: Basic ' . base64_encode("OPENVIDUAPP:$secret"),
        'Content-Type: application/json'
    ));
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Không kiểm tra SSL nếu là thử nghiệm

    // Gửi yêu cầu
    $response = curl_exec($ch);
    curl_close($ch);

    // Xử lý phản hồi
    $result = json_decode($response, true);
    return $result['token'] ?? null; // Trả về token nếu có
}


// Bây giờ bạn có thể sử dụng $conn để thực thi các lệnh SQL khác
?>
