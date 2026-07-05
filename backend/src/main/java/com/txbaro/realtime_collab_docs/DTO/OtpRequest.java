package com.txbaro.realtime_collab_docs.dto;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class OtpRequest {
    private String email;
    private String otpCode;
}