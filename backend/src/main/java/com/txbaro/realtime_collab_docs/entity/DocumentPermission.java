package com.txbaro.realtime_collab_docs.entity;

import com.txbaro.realtime_collab_docs.entity.enums.DocumentRole;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_permissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Khóa ngoại trỏ về tài liệu được chia sẻ
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    // Khóa ngoại trỏ về user được cấp quyền
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Sử dụng EnumType.STRING để lưu giá trị chữ (EDITOR, VIEWER) xuống Database
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private DocumentRole role;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;
}