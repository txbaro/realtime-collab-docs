package com.txbaro.realtime_collab_docs.repository;

import com.txbaro.realtime_collab_docs.entity.DocumentInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentInvitationRepository extends JpaRepository<DocumentInvitation, UUID> {
    Optional<DocumentInvitation> findByDocumentIdAndInviteeEmail(UUID documentId, String email);
    Optional<DocumentInvitation> findByDocumentIdAndInviteeEmailAndStatus(UUID documentId, String email, String status);
    List<DocumentInvitation> findByInviteeEmailAndStatus(String email, String status);
}
