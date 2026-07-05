package com.txbaro.realtime_collab_docs.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final StringRedisTemplate redisTemplate;
    private final EmailService emailService;

    public void generateAndSendOtp(String email, String action) {
        String otpCode = String.format("%06d", new Random().nextInt(1000000));
        
        redisTemplate.opsForValue().set("OTP:" + action + ":" + email, otpCode, Duration.ofMinutes(5));

        String actionName = action.equals("REGISTER") ? "Đăng ký tài khoản" :
                            action.equals("CHANGE_PW") ? "Đổi mật khẩu" : "Xóa tài khoản";
                            
        emailService.sendOtpEmail(email, otpCode, actionName);
    }

    public boolean validateOtp(String email, String otpCode, String action) {
        String key = "OTP:" + action + ":" + email;
        String savedOtp = redisTemplate.opsForValue().get(key);
        
        if (savedOtp != null && savedOtp.equals(otpCode)) {
            redisTemplate.delete(key);
            return true;
        }
        return false;
    }
}