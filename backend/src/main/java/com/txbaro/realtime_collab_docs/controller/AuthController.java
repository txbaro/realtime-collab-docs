package com.txbaro.realtime_collab_docs.controller;

import com.txbaro.realtime_collab_docs.dto.RegisterRequest;
import com.txbaro.realtime_collab_docs.entity.User;
import com.txbaro.realtime_collab_docs.entity.UserAuth;
import com.txbaro.realtime_collab_docs.repository.UserAuthRepository;
import com.txbaro.realtime_collab_docs.repository.UserRepository;
import com.txbaro.realtime_collab_docs.security.JwtUtil;
import com.txbaro.realtime_collab_docs.dto.LoginRequest;
import com.txbaro.realtime_collab_docs.dto.AuthResponse;
import com.txbaro.realtime_collab_docs.service.EmailService;
import com.txbaro.realtime_collab_docs.service.OtpService;
import com.txbaro.realtime_collab_docs.dto.OtpRequest;
import com.txbaro.realtime_collab_docs.dto.ChangePasswordRequest;
import com.txbaro.realtime_collab_docs.dto.DeleteAccountRequest;
import com.txbaro.realtime_collab_docs.dto.UserInfoResponse;
import lombok.RequiredArgsConstructor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import java.util.Optional;
import java.time.Duration;
import java.security.Principal;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final UserAuthRepository userAuthRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final OtpService otpService;
    private final StringRedisTemplate redisTemplate;

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Principal principal) {
        String email = principal.getName(); // Spring Security tự bóc email từ Token
        
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        return ResponseEntity.ok(new UserInfoResponse(
                user.getEmail(),
                user.getFirstname(),
                user.getLastname(),
                user.getStatus()
        ));
    }

    @PostMapping("/request-register-otp")
    public ResponseEntity<?> requestRegisterOtp(@RequestBody OtpRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Lỗi: Email đã được sử dụng!");
        }
        otpService.generateAndSendOtp(request.getEmail(), "REGISTER");
        return ResponseEntity.ok("Đã gửi mã OTP đăng ký đến email: " + request.getEmail());
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        // 1. Quét thẻ OTP dưới Redis trước tiên
        if (!otpService.validateOtp(request.getEmail(), request.getOtpCode(), "REGISTER")) {
            return ResponseEntity.badRequest().body("Lỗi: Mã OTP không hợp lệ hoặc đã hết hạn!");
        }

        // 2. Kiểm tra lại DB một lần nữa để chắc chắn trong 5 phút qua không ai lấy mất Email này
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Lỗi: Email đã tồn tại!");
        }

        // 3. Tiến hành ghi dữ liệu CHÍNH THỨC vào PostgreSQL
        User newUser = User.builder()
                .firstname(request.getFirstname())
                .lastname(request.getLastname())
                .email(request.getEmail())
                .status("ACTIVE") // Mặc định kích hoạt luôn vì đã xác thực OTP thành công
                .build();
        User savedUser = userRepository.save(newUser);

        UserAuth userAuth = UserAuth.builder()
                .user(savedUser)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();
        userAuthRepository.save(userAuth);

        return ResponseEntity.ok("Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Lỗi: Không tìm thấy tài khoản!");
        }
        User user = userOpt.get();

        // 1. Chặn nếu tài khoản chưa xác minh OTP lúc đăng ký
        if ("PENDING_VERIFICATION".equals(user.getStatus())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Lỗi: Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email!");
        }

        // 2. Kiểm tra tính hợp lệ của mật khẩu
        Optional<UserAuth> userAuthOpt = userAuthRepository.findByUser(user);
        if (userAuthOpt.isEmpty() || !passwordEncoder.matches(request.getPassword(), userAuthOpt.get().getPasswordHash())) {
            return ResponseEntity.badRequest().body("Lỗi: Sai mật khẩu!");
        }

        // 3. TÍNH NĂNG MỚI: Tự động "đánh thức" nếu tài khoản đang bị vô hiệu hóa tạm thời
        if ("INACTIVE".equals(user.getStatus())) {
            user.setStatus("ACTIVE");
            userRepository.save(user);
            // Có thể dùng emailService ở đây để gửi thư thông báo: "Tài khoản của bạn vừa được đăng nhập và kích hoạt lại"
        }

        // 4. Cấp thẻ JWT và trả thông tin về cho Frontend
        String token = jwtUtil.generateToken(user.getEmail());
        String fullname = user.getFirstname() + " " + user.getLastname();

        return ResponseEntity.ok(new AuthResponse(token, user.getEmail(), fullname));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            
            // Lưu Token này vào Redis với tiền tố BLACKLIST. 
            // Đặt thời gian sống (TTL) là 1 ngày (bằng với hạn sử dụng tối đa của JWT)
            redisTemplate.opsForValue().set("BLACKLIST:" + token, "logged_out", Duration.ofDays(1));
        }
        
        return ResponseEntity.ok("Đăng xuất thành công!");
    }

    @PostMapping("/verify-account")
    public ResponseEntity<?> verifyAccount(@RequestBody OtpRequest request) { // Tái sử dụng OtpRequest, nhưng bạn nhớ thêm trường otpCode vào file OtpRequest.java nhé
        // 1. Kiểm tra mã OTP
        if (!otpService.validateOtp(request.getEmail(), request.getOtpCode(), "VERIFY_ACCOUNT")) {
            return ResponseEntity.badRequest().body("Lỗi: Mã xác nhận không đúng hoặc đã hết hạn!");
        }

        // 2. Tìm user trong DB
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        // 3. Đổi trạng thái và lưu lại
        user.setStatus("ACTIVE");
        userRepository.save(user);

        return ResponseEntity.ok("Kích hoạt tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.");
    }

    @PostMapping("/request-password-otp")
    public ResponseEntity<?> requestPasswordOtp(Principal principal) {
        String email = principal.getName(); // Lấy email từ JWT Token
        otpService.generateAndSendOtp(email, "CHANGE_PW");
        return ResponseEntity.ok("Đã gửi mã OTP đổi mật khẩu đến email của bạn.");
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request, Principal principal) {
        String email = principal.getName();

        if (!otpService.validateOtp(email, request.getOtpCode(), "CHANGE_PW")) {
            return ResponseEntity.badRequest().body("Lỗi: Mã OTP sai hoặc đã hết hạn!");
        }

        User user = userRepository.findByEmail(email).orElseThrow();
        UserAuth userAuth = userAuthRepository.findByUser(user).orElseThrow();
        
        userAuth.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userAuthRepository.save(userAuth);

        return ResponseEntity.ok("Đổi mật khẩu thành công!");
    }

    @PostMapping("/request-delete-otp")
    public ResponseEntity<?> requestDeleteOtp(Principal principal) {
        String email = principal.getName();
        otpService.generateAndSendOtp(email, "DELETE_ACC");
        return ResponseEntity.ok("Đã gửi mã OTP xác nhận xóa tài khoản.");
    }

    @DeleteMapping("/delete-account")
    public ResponseEntity<?> deleteAccount(@RequestBody DeleteAccountRequest request, Principal principal) {
        String email = principal.getName();

        if (!otpService.validateOtp(email, request.getOtpCode(), "DELETE_ACC")) {
            return ResponseEntity.badRequest().body("Lỗi: Mã OTP xác nhận xóa không hợp lệ!");
        }

        User user = userRepository.findByEmail(email).orElseThrow();
        UserAuth userAuth = userAuthRepository.findByUser(user).orElseThrow();

        // Cần xóa Auth trước để không dính lỗi khóa ngoại (Foreign Key Constraint)
        userAuthRepository.delete(userAuth);
        userRepository.delete(user);

        return ResponseEntity.ok("Tài khoản đã được xóa vĩnh viễn khỏi hệ thống.");
    }

    @PostMapping("/request-deactivate-otp")
    public ResponseEntity<?> requestDeactivateOtp(Principal principal) {
        String email = principal.getName(); // Trích xuất email từ JWT
        otpService.generateAndSendOtp(email, "DEACTIVATE_ACC");
        return ResponseEntity.ok("Đã gửi mã OTP xác nhận vô hiệu hóa tài khoản.");
    }

    @PostMapping("/deactivate-account")
    public ResponseEntity<?> deactivateAccount(@RequestBody OtpRequest request, Principal principal) {
        String email = principal.getName();

        if (!otpService.validateOtp(email, request.getOtpCode(), "DEACTIVATE_ACC")) {
            return ResponseEntity.badRequest().body("Lỗi: Mã OTP xác nhận không hợp lệ hoặc đã hết hạn!");
        }

        User user = userRepository.findByEmail(email).orElseThrow();
        
        // Chuyển trạng thái sang Vô hiệu hóa
        user.setStatus("INACTIVE");
        userRepository.save(user);

        // Lưu ý: Ở môi trường thực tế, Frontend sẽ lập tức xóa Token hiện tại và đẩy user ra màn hình Login
        return ResponseEntity.ok("Tài khoản của bạn đã được vô hiệu hóa tạm thời.");
    }
}