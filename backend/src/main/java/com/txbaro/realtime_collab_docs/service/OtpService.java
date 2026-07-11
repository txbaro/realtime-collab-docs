package com.txbaro.realtime_collab_docs.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final StringRedisTemplate redisTemplate;
    private final EmailService emailService;

    public void generateAndSendOtp(String email, String action) {
        String otpCode = String.format("%06d", new Random().nextInt(1000000));
        
        redisTemplate.opsForValue().set("OTP:" + action + ":" + email, otpCode, Duration.ofMinutes(5));
        log.info("Đã tạo OTP hành động [{}]: email={}, code={}", action, email, otpCode);

        String actionName = action.equals("VERIFY_ACCOUNT") ? "Đăng ký tài khoản" :
                            action.equals("CHANGE_PW") ? "Đổi mật khẩu" :
                            action.equals("DEACTIVATE_ACC") ? "Vô hiệu hóa tài khoản" : "Xóa tài khoản";
                            
        emailService.sendOtpEmail(email, otpCode, actionName);
    }

    public boolean validateOtp(String email, String otpCode, String action) {
        String key = "OTP:" + action + ":" + email;
        String savedOtp = redisTemplate.opsForValue().get(key);
        
        log.info("Xác thực OTP hành động [{}]: email={}, inputCode='{}', savedCode='{}'", action, email, otpCode, savedOtp);
        
        if (savedOtp != null && savedOtp.trim().equals(otpCode != null ? otpCode.trim() : "")) {
            redisTemplate.delete(key);
            return true;
        }
        return false;
    }
}