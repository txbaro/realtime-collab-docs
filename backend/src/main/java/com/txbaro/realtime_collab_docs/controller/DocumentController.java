package com.txbaro.realtime_collab_docs.controller;

import com.txbaro.realtime_collab_docs.dto.CreateDocumentRequest;
import com.txbaro.realtime_collab_docs.dto.DocumentResponse;
import com.txbaro.realtime_collab_docs.dto.DocumentInvitationResponse;
import com.txbaro.realtime_collab_docs.dto.InviteUserRequest;
import com.txbaro.realtime_collab_docs.service.DocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping
    public ResponseEntity<DocumentResponse> createDocument(
            @Valid @RequestBody CreateDocumentRequest request,
            Principal principal) {
        String email = principal.getName();
        DocumentResponse response = documentService.createDocument(request, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{documentId}")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable UUID documentId,
            Principal principal) {
        String email = principal.getName();
        documentService.deleteDocument(documentId, email);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{documentId}")
    public ResponseEntity<DocumentResponse> updateDocument(
            @PathVariable UUID documentId,
            @Valid @RequestBody CreateDocumentRequest request,
            Principal principal) {
        String email = principal.getName();
        DocumentResponse response = documentService.updateDocument(documentId, request, email);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{documentId}/members")
    public ResponseEntity<DocumentInvitationResponse> inviteUser(
            @PathVariable UUID documentId,
            @Valid @RequestBody InviteUserRequest request,
            Principal principal) {
        String email = principal.getName();
        DocumentInvitationResponse response = documentService.inviteUser(documentId, request, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{documentId}/invitations/accept")
    public ResponseEntity<Void> acceptInvitation(
            @PathVariable UUID documentId,
            Principal principal) {
        String email = principal.getName();
        documentService.acceptInvitation(documentId, email);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{documentId}/invitations/decline")
    public ResponseEntity<Void> declineInvitation(
            @PathVariable UUID documentId,
            Principal principal) {
        String email = principal.getName();
        documentService.declineInvitation(documentId, email);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{documentId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable UUID documentId,
            @PathVariable UUID userId,
            Principal principal) {
        String email = principal.getName();
        documentService.removeMember(documentId, userId, email);
        return ResponseEntity.noContent().build();
    }
}
