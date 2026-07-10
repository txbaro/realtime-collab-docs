package com.txbaro.realtime_collab_docs.service;

import com.txbaro.realtime_collab_docs.dto.CreateDocumentRequest;
import com.txbaro.realtime_collab_docs.dto.DocumentResponse;
import com.txbaro.realtime_collab_docs.entity.Document;
import com.txbaro.realtime_collab_docs.entity.DocumentPermission;
import com.txbaro.realtime_collab_docs.entity.User;
import com.txbaro.realtime_collab_docs.entity.enums.DocumentRole;
import com.txbaro.realtime_collab_docs.repository.DocumentPermissionRepository;
import com.txbaro.realtime_collab_docs.repository.DocumentRepository;
import com.txbaro.realtime_collab_docs.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.Optional;
import com.txbaro.realtime_collab_docs.dto.DocumentInvitationResponse;
import com.txbaro.realtime_collab_docs.dto.InviteUserRequest;
import com.txbaro.realtime_collab_docs.entity.DocumentInvitation;
import com.txbaro.realtime_collab_docs.exception.ConflictException;
import com.txbaro.realtime_collab_docs.exception.ForbiddenException;
import com.txbaro.realtime_collab_docs.exception.ResourceNotFoundException;
import com.txbaro.realtime_collab_docs.repository.DocumentInvitationRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentPermissionRepository documentPermissionRepository;
    private final UserRepository userRepository;
    private final DocumentInvitationRepository documentInvitationRepository;

    @Transactional
    public DocumentResponse createDocument(CreateDocumentRequest request, String userEmail) {
        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng hiện tại"));

        // 1. Tạo document và lưu bằng saveAndFlush để đảm bảo sinh createdAt, updatedAt lập tức
        Document document = Document.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .owner(currentUser)
                .isTrashed(false)
                .build();
        Document savedDocument = documentRepository.saveAndFlush(document);

        // 2. Tạo document permission với role OWNER
        DocumentPermission permission = DocumentPermission.builder()
                .document(savedDocument)
                .user(currentUser)
                .role(DocumentRole.OWNER)
                .build();
        documentPermissionRepository.save(permission);

        // 3. Phản hồi DTO
        return DocumentResponse.builder()
                .id(savedDocument.getId())
                .title(savedDocument.getTitle())
                .content(savedDocument.getContent())
                .ownerId(currentUser.getId())
                .isTrashed(savedDocument.isTrashed())
                .createdAt(savedDocument.getCreatedAt())
                .updatedAt(savedDocument.getUpdatedAt())
                .build();
    }

    @Transactional
    public void deleteDocument(UUID documentId, String userEmail) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Tài liệu không tồn tại"));

        if (!document.getOwner().getEmail().equals(userEmail)) {
            throw new ForbiddenException("Bạn không phải là chủ sở hữu tài liệu này");
        }

        // Xóa các phân quyền liên quan
        documentPermissionRepository.deleteByDocumentId(documentId);

        // Xóa tài liệu
        documentRepository.delete(document);
    }

    @Transactional
    public DocumentResponse updateDocument(UUID documentId, CreateDocumentRequest request, String userEmail) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Tài liệu không tồn tại"));

        // Kiểm tra quyền cập nhật:
        // 1. Nếu là chủ sở hữu (Owner)
        boolean isOwner = document.getOwner().getEmail().equals(userEmail);

        // 2. Nếu không phải chủ sở hữu, kiểm tra phân quyền EDITOR / OWNER
        if (!isOwner) {
            DocumentPermission permission = documentPermissionRepository.findByDocumentIdAndUserEmail(documentId, userEmail)
                    .orElseThrow(() -> new ForbiddenException("Bạn không có quyền chỉnh sửa tài liệu này"));

            if (permission.getRole() != DocumentRole.OWNER && permission.getRole() != DocumentRole.EDITOR) {
                throw new ForbiddenException("Bạn không có quyền chỉnh sửa tài liệu này");
            }
        }

        // Cập nhật tiêu đề và nội dung
        document.setTitle(request.getTitle());
        document.setContent(request.getContent());

        // Lưu thực thể tài liệu
        Document savedDocument = documentRepository.save(document);

        return DocumentResponse.builder()
                .id(savedDocument.getId())
                .title(savedDocument.getTitle())
                .content(savedDocument.getContent())
                .ownerId(savedDocument.getOwner().getId())
                .isTrashed(savedDocument.isTrashed())
                .createdAt(savedDocument.getCreatedAt())
                .updatedAt(savedDocument.getUpdatedAt())
                .build();
    }

    @Transactional
    public DocumentInvitationResponse inviteUser(UUID documentId, InviteUserRequest request, String ownerEmail) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Tài liệu không tồn tại"));

        // 1. Kiểm tra xem người mời có phải chủ sở hữu tài liệu không
        if (!document.getOwner().getEmail().equalsIgnoreCase(ownerEmail)) {
            throw new ForbiddenException("Chỉ chủ sở hữu tài liệu mới có quyền mời thành viên");
        }

        // 2. Kiểm tra vai trò mời hợp lệ (Chỉ nhận EDITOR hoặc VIEWER)
        String roleStr = request.getRole();
        if (!"EDITOR".equalsIgnoreCase(roleStr) && !"VIEWER".equalsIgnoreCase(roleStr)) {
            throw new IllegalArgumentException("Vai trò không hợp lệ. Chỉ chấp nhận EDITOR hoặc VIEWER");
        }
        DocumentRole assignedRole = DocumentRole.valueOf(roleStr.toUpperCase());

        // 3. Tìm người được mời
        User invitee = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng được mời không tồn tại"));

        // 4. Kiểm tra xem đã là thành viên (đã có permission) chưa
        boolean alreadyMember = documentPermissionRepository.findByDocumentIdAndUserEmail(documentId, request.getEmail()).isPresent();
        if (alreadyMember) {
            throw new ConflictException("Người dùng đã là thành viên của tài liệu");
        }

        // 5. Kiểm tra xem đã có lời mời PENDING nào chưa
        Optional<DocumentInvitation> existingInvitation = documentInvitationRepository.findByDocumentIdAndInviteeEmailAndStatus(documentId, request.getEmail(), "PENDING");
        if (existingInvitation.isPresent()) {
            throw new ConflictException("Lời mời người dùng này vẫn đang ở trạng thái chờ xác nhận");
        }

        // 6. Tạo lời mời mới
        User inviter = userRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng hiện tại"));

        DocumentInvitation invitation = DocumentInvitation.builder()
                .document(document)
                .invitee(invitee)
                .inviter(inviter)
                .role(assignedRole)
                .status("PENDING")
                .build();
        DocumentInvitation saved = documentInvitationRepository.save(invitation);

        return DocumentInvitationResponse.builder()
                .id(saved.getId())
                .documentId(saved.getDocument().getId())
                .inviteeId(saved.getInvitee().getId())
                .inviteeEmail(saved.getInvitee().getEmail())
                .inviterId(saved.getInviter().getId())
                .role(saved.getRole())
                .status(saved.getStatus())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Transactional
    public void acceptInvitation(UUID documentId, String userEmail) {
        DocumentInvitation invitation = documentInvitationRepository.findByDocumentIdAndInviteeEmailAndStatus(documentId, userEmail, "PENDING")
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lời mời đang chờ xác nhận"));

        // Cập nhật trạng thái lời mời sang ACCEPTED
        invitation.setStatus("ACCEPTED");
        documentInvitationRepository.save(invitation);

        // Tạo bản ghi phân quyền truy cập
        DocumentPermission permission = DocumentPermission.builder()
                .document(invitation.getDocument())
                .user(invitation.getInvitee())
                .role(invitation.getRole())
                .build();
        documentPermissionRepository.save(permission);
    }

    @Transactional
    public void declineInvitation(UUID documentId, String userEmail) {
        DocumentInvitation invitation = documentInvitationRepository.findByDocumentIdAndInviteeEmailAndStatus(documentId, userEmail, "PENDING")
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lời mời đang chờ xác nhận"));

        // Cập nhật trạng thái sang DECLINED
        invitation.setStatus("DECLINED");
        documentInvitationRepository.save(invitation);
    }

    @Transactional
    public void removeMember(UUID documentId, UUID userId, String ownerEmail) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Tài liệu không tồn tại"));

        // 1. Kiểm tra xem người yêu cầu có phải chủ sở hữu (Owner) tài liệu hay không
        if (!document.getOwner().getEmail().equalsIgnoreCase(ownerEmail)) {
            throw new ForbiddenException("Chỉ chủ sở hữu tài liệu mới có quyền xóa thành viên");
        }

        // 2. Kiểm tra xem người dùng cần xóa có tồn tại không
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng mục tiêu không tồn tại"));

        // 3. Tìm kiếm bản ghi phân quyền tương ứng
        DocumentPermission permission = documentPermissionRepository.findByDocumentIdAndUserId(documentId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không phải là thành viên của tài liệu này"));

        // 4. Ngăn chặn việc xóa vai trò OWNER
        if (permission.getRole() == DocumentRole.OWNER || targetUser.getId().equals(document.getOwner().getId())) {
            throw new IllegalArgumentException("Không thể xóa quyền của chủ sở hữu tài liệu");
        }

        // 5. Thực hiện xóa phân quyền
        documentPermissionRepository.delete(permission);
    }
}
