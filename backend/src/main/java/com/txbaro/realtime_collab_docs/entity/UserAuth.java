package com.txbaro.realtime_collab_docs.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "user_auth")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAuth {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Thiết lập khóa ngoại trỏ về bảng users
    // FetchType.LAZY giúp tối ưu hiệu năng: chỉ truy vấn User khi thực sự cần gọi đến
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Builder.Default
    @Column(name = "auth_provider", nullable = false, length = 20)
    private String authProvider = "LOCAL";

    @Column(name = "provider_id", length = 100)
    private String providerId;

    @Column(name = "password_hash")
    private String passwordHash;
}