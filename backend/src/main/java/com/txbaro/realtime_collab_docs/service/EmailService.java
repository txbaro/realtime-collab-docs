package com.txbaro.realtime_collab_docs.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendOtpEmail(String toEmail, String otpCode, String actionName) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("no-reply@realtimecollab.com");
        message.setTo(toEmail);
        message.setSubject("Mã OTP xác nhận - " + actionName);
        message.setText("Xin chào,\n\n" +
                "Mã OTP để thực hiện [" + actionName + "] của bạn là: " + otpCode + "\n\n" +
                "Mã này sẽ hết hạn trong vòng 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.\n\n");

        mailSender.send(message);
    }
}