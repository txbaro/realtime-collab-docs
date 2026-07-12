package com.txbaro.realtime_collab_docs.dto;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ChangePasswordRequest {
    private String email;
    private String oldPassword;
    private String newPassword;
    private String otpCode;
}