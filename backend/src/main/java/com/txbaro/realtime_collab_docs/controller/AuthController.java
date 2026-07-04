package com.txbaro.realtime_collab_docs.controller;

import com.txbaro.realtime_collab_docs.dto.RegisterRequest;
import com.txbaro.realtime_collab_docs.entity.User;
import com.txbaro.realtime_collab_docs.entity.UserAuth;
import com.txbaro.realtime_collab_docs.repository.UserAuthRepository;
import com.txbaro.realtime_collab_docs.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final UserAuthRepository userAuthRepository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        // 1. Kiểm tra email đã được sử dụng chưa
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Lỗi: Email này đã được đăng ký!");
        }

        // 2. Tạo mới User
        User newUser = User.builder()
                .firstname(request.getFirstname())
                .lastname(request.getLastname())
                .email(request.getEmail())
                .status("PENDING_VERIFICATION")
                .build();
        User savedUser = userRepository.save(newUser);

        // 3. Tạo thông tin xác thực UserAuth
        // ⚠️ Lưu ý: Ở bước test này, password đang lưu dạng thô (plain text).
        // Khi cấu hình bảo mật chính thức, chúng ta sẽ dùng BCrypt để băm (hash) mật khẩu!
        UserAuth userAuth = UserAuth.builder()
                .user(savedUser)
                .authProvider("LOCAL")
                .passwordHash(request.getPassword())
                .build();
        userAuthRepository.save(userAuth);

        return ResponseEntity.ok("Đăng ký thành công tài khoản: " + savedUser.getEmail());
    }
}