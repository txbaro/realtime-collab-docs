package com.txbaro.realtime_collab_docs.repository;

import com.txbaro.realtime_collab_docs.entity.DocumentPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentPermissionRepository extends JpaRepository<DocumentPermission, UUID> {
    void deleteByDocumentId(UUID documentId);
    Optional<DocumentPermission> findByDocumentIdAndUserEmail(UUID documentId, String email);
    Optional<DocumentPermission> findByDocumentIdAndUserId(UUID documentId, UUID userId);
}
