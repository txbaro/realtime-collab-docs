package com.txbaro.realtime_collab_docs.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class UserInfoResponse {
    private String email;
    private String firstname;
    private String lastname;
    private String status;
}