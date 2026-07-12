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
import com.txbaro.realtime_collab_docs.dto.UpdateProfileRequest;
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
        String email = principal.getName();
        
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
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isPresent() && !"PENDING_VERIFICATION".equals(userOpt.get().getStatus())) {
            return ResponseEntity.badRequest().body("Lỗi: Email đã được sử dụng!");
        }
        otpService.generateAndSendOtp(request.getEmail(), "VERIFY_ACCOUNT");
        return ResponseEntity.ok("Đã gửi mã OTP kích hoạt đến email: " + request.getEmail());
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Lỗi: Email đã tồn tại!");
        }

        User newUser = User.builder()
                .firstname(request.getFirstname())
                .lastname(request.getLastname())
                .email(request.getEmail())
                .status("PENDING_VERIFICATION") 
                .build();
        User savedUser = userRepository.save(newUser);

        UserAuth userAuth = UserAuth.builder()
                .user(savedUser)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();
        userAuthRepository.save(userAuth);

        // Tự động gửi mã OTP kích hoạt
        otpService.generateAndSendOtp(request.getEmail(), "VERIFY_ACCOUNT");

        return ResponseEntity.ok("Đăng ký tài khoản thành công! Mã OTP kích hoạt đã được gửi đến email của bạn.");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Lỗi: Không tìm thấy tài khoản!");
        }
        User user = userOpt.get();

        if ("PENDING_VERIFICATION".equals(user.getStatus())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Lỗi: Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email!");
        }

        Optional<UserAuth> userAuthOpt = userAuthRepository.findByUser(user);
        if (userAuthOpt.isEmpty() || !passwordEncoder.matches(request.getPassword(), userAuthOpt.get().getPasswordHash())) {
            return ResponseEntity.badRequest().body("Lỗi: Sai mật khẩu!");
        }

        if ("INACTIVE".equals(user.getStatus())) {
            user.setStatus("ACTIVE");
            userRepository.save(user);
        }

        String token = jwtUtil.generateToken(user.getEmail());
        String fullname = user.getFirstname() + " " + user.getLastname();

        return ResponseEntity.ok(new AuthResponse(token, user.getEmail(), fullname));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            
            redisTemplate.opsForValue().set("BLACKLIST:" + token, "logged_out", Duration.ofDays(1));
        }
        
        return ResponseEntity.ok("Đăng xuất thành công!");
    }

    @PostMapping("/verify-account")
    public ResponseEntity<?> verifyAccount(@RequestBody OtpRequest request) { 
        if (!otpService.validateOtp(request.getEmail(), request.getOtpCode(), "VERIFY_ACCOUNT")) {
            return ResponseEntity.badRequest().body("Lỗi: Mã xác nhận không đúng hoặc đã hết hạn!");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        user.setStatus("ACTIVE");
        userRepository.save(user);

        // Tự động cấp mã Token JWT và đăng nhập cho người dùng
        String token = jwtUtil.generateToken(user.getEmail());
        String fullname = user.getFirstname() + " " + user.getLastname();

        return ResponseEntity.ok(new AuthResponse(token, user.getEmail(), fullname));
    }

    @PostMapping("/request-password-otp")
    public ResponseEntity<?> requestPasswordOtp(@RequestParam(required = false) String email, Principal principal) {
        String targetEmail = null;
        if (principal != null) {
            targetEmail = principal.getName();
        } else if (email != null && !email.trim().isEmpty()) {
            targetEmail = email.trim();
        }
        
        if (targetEmail == null) {
            return ResponseEntity.badRequest().body("Lỗi: Email không được để trống!");
        }
        
        if (!userRepository.existsByEmail(targetEmail)) {
            return ResponseEntity.badRequest().body("Lỗi: Email không tồn tại trong hệ thống!");
        }

        otpService.generateAndSendOtp(targetEmail, "CHANGE_PW");
        return ResponseEntity.ok("Đã gửi mã OTP đổi mật khẩu đến email của bạn.");
    }

    @PostMapping("/verify-password-otp")
    public ResponseEntity<?> verifyPasswordOtp(@RequestParam String email, @RequestParam String otp) {
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Lỗi: Email không được để trống!");
        }
        if (otp == null || otp.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Lỗi: Mã OTP không được để trống!");
        }

        String key = "OTP:CHANGE_PW:" + email.trim();
        String savedOtp = redisTemplate.opsForValue().get(key);
        if (savedOtp != null && savedOtp.trim().equals(otp.trim())) {
            return ResponseEntity.ok("Mã OTP chính xác.");
        }
        return ResponseEntity.badRequest().body("Lỗi: Mã OTP không chính xác hoặc đã hết hạn!");
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request, Principal principal) {
        String email = null;
        boolean checkOldPassword = false;
        
        if (principal != null) {
            email = principal.getName();
            checkOldPassword = true;
        } else if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            email = request.getEmail().trim();
        }

        if (email == null) {
            return ResponseEntity.badRequest().body("Lỗi: Email không được để trống!");
        }

        if (!otpService.validateOtp(email, request.getOtpCode(), "CHANGE_PW")) {
            return ResponseEntity.badRequest().body("Lỗi: Mã OTP sai hoặc đã hết hạn!");
        }

        User user = userRepository.findByEmail(email).orElseThrow();
        UserAuth userAuth = userAuthRepository.findByUser(user).orElseThrow();
        
        if (checkOldPassword) {
            if (request.getOldPassword() == null || request.getOldPassword().isEmpty()) {
                return ResponseEntity.badRequest().body("Lỗi: Vui lòng nhập mật khẩu cũ!");
            }
            if (!passwordEncoder.matches(request.getOldPassword(), userAuth.getPasswordHash())) {
                return ResponseEntity.badRequest().body("Lỗi: Mật khẩu cũ không chính xác!");
            }
        }
        
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

        userAuthRepository.delete(userAuth);
        userRepository.delete(user);

        return ResponseEntity.ok("Tài khoản đã được xóa vĩnh viễn khỏi hệ thống.");
    }

    @PostMapping("/request-deactivate-otp")
    public ResponseEntity<?> requestDeactivateOtp(Principal principal) {
        String email = principal.getName();
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
        
        user.setStatus("INACTIVE");
        userRepository.save(user);

        return ResponseEntity.ok("Tài khoản của bạn đã được vô hiệu hóa tạm thời.");
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateProfileRequest request, Principal principal) {
        String email = principal.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        
        if (request.getFirstname() == null || request.getFirstname().trim().isEmpty() ||
            request.getLastname() == null || request.getLastname().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Lỗi: Họ và tên không được để trống!");
        }

        user.setFirstname(request.getFirstname().trim());
        user.setLastname(request.getLastname().trim());
        userRepository.save(user);

        return ResponseEntity.ok("Cập nhật thông tin cá nhân thành công!");
    }
}