package com.txbaro.realtime_collab_docs.controller;

import com.txbaro.realtime_collab_docs.RealtimeCollabDocsApplication;
import com.txbaro.realtime_collab_docs.entity.Document;
import com.txbaro.realtime_collab_docs.entity.DocumentPermission;
import com.txbaro.realtime_collab_docs.entity.User;
import com.txbaro.realtime_collab_docs.entity.enums.DocumentRole;
import com.txbaro.realtime_collab_docs.repository.DocumentPermissionRepository;
import com.txbaro.realtime_collab_docs.repository.DocumentRepository;
import com.txbaro.realtime_collab_docs.repository.UserRepository;
import com.txbaro.realtime_collab_docs.entity.DocumentInvitation;
import com.txbaro.realtime_collab_docs.repository.DocumentInvitationRepository;
import com.txbaro.realtime_collab_docs.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;
import java.util.UUID;

import org.springframework.test.context.ActiveProfiles;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = RealtimeCollabDocsApplication.class)
@ActiveProfiles("test")
class DocumentControllerIntegrationTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @MockitoSpyBean
    private DocumentPermissionRepository documentPermissionRepositorySpy;

    @Autowired
    private DocumentInvitationRepository documentInvitationRepository;

    @Autowired
    private JwtUtil jwtUtil;

    private User testUser;
    private String jwtToken;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        documentInvitationRepository.deleteAll();
        documentPermissionRepositorySpy.deleteAll();
        documentRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Tạo test user
        testUser = User.builder()
                .firstname("John")
                .lastname("Doe")
                .email("john.doe@example.com")
                .status("ACTIVE")
                .build();
        testUser = userRepository.save(testUser);

        // 2. Tạo token hợp lệ
        jwtToken = jwtUtil.generateToken(testUser.getEmail());
    }

    @Test
    void createDocument_success() throws Exception {
        String jsonPayload = "{\"title\":\"Tài liệu đầu tiên\",\"content\":{\"key\":\"value\"}}";

        mockMvc.perform(post("/api/documents")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.title", is("Tài liệu đầu tiên")))
                .andExpect(jsonPath("$.content.key", is("value")))
                .andExpect(jsonPath("$.ownerId", is(testUser.getId().toString())))
                .andExpect(jsonPath("$.trashed", is(false)))
                .andExpect(jsonPath("$.createdAt", notNullValue()))
                .andExpect(jsonPath("$.updatedAt", notNullValue()));

        // Kiểm chứng dữ liệu trong DB
        List<Document> docs = documentRepository.findAll();
        assertEquals(1, docs.size());
        Document savedDoc = docs.get(0);
        assertEquals("Tài liệu đầu tiên", savedDoc.getTitle());
        assertNotNull(savedDoc.getContent());
        assertEquals("value", savedDoc.getContent().get("key"));
        assertEquals(testUser.getId(), savedDoc.getOwner().getId());

        List<DocumentPermission> permissions = documentPermissionRepositorySpy.findAll();
        assertEquals(1, permissions.size());
        DocumentPermission permission = permissions.get(0);
        assertEquals(savedDoc.getId(), permission.getDocument().getId());
        assertEquals(testUser.getId(), permission.getUser().getId());
        assertEquals(DocumentRole.OWNER, permission.getRole());
    }

    @Test
    void createDocument_invalidTitle_returnsBadRequest() throws Exception {
        String jsonPayload = "{\"title\":\"\",\"content\":{}}";

        mockMvc.perform(post("/api/documents")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title", is("Tiêu đề không được để trống")));

        // Đảm bảo không lưu gì vào DB
        assertEquals(0, documentRepository.count());
        assertEquals(0, documentPermissionRepositorySpy.count());
    }

    @Test
    void createDocument_unauthorized_returnsUnauthorized() throws Exception {
        String jsonPayload = "{\"title\":\"Tài liệu không xác thực\",\"content\":{}}";

        mockMvc.perform(post("/api/documents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createDocument_transactionRollback_onPermissionFailure() throws Exception {
        // Cấu hình SpyBean ném lỗi khi lưu DocumentPermission
        doThrow(new RuntimeException("Database error simulation on document permission saving"))
                .when(documentPermissionRepositorySpy).save(any(DocumentPermission.class));

        String jsonPayload = "{\"title\":\"Tài liệu giao dịch thất bại\",\"content\":{}}";

        mockMvc.perform(post("/api/documents")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest());

        // Kiểm chứng: Cả document và permission đều không được lưu trong DB do rollback thành công
        assertEquals(0, documentRepository.count());
        assertEquals(0, documentPermissionRepositorySpy.count());
    }

    @Test
    void deleteDocument_success() throws Exception {
        // Tạo document và phân quyền OWNER
        Document doc = Document.builder()
                .title("Tài liệu cần xóa")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        DocumentPermission permission = DocumentPermission.builder()
                .document(savedDoc)
                .user(testUser)
                .role(DocumentRole.OWNER)
                .build();
        documentPermissionRepositorySpy.save(permission);

        // Gọi API xóa tài liệu
        mockMvc.perform(delete("/api/documents/" + savedDoc.getId())
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isNoContent());

        // Kiểm chứng đã xóa trong DB
        assertEquals(0, documentRepository.count());
        assertEquals(0, documentPermissionRepositorySpy.count());
    }

    @Test
    void deleteDocument_notFound() throws Exception {
        UUID randomId = UUID.randomUUID();

        mockMvc.perform(delete("/api/documents/" + randomId)
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteDocument_forbidden() throws Exception {
        // 1. Tạo document của testUser
        Document doc = Document.builder()
                .title("Tài liệu bí mật")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        DocumentPermission permission = DocumentPermission.builder()
                .document(savedDoc)
                .user(testUser)
                .role(DocumentRole.OWNER)
                .build();
        documentPermissionRepositorySpy.save(permission);

        // 2. Tạo một user khác (Kẻ tấn công)
        User attacker = User.builder()
                .firstname("Attacker")
                .lastname("User")
                .email("attacker@example.com")
                .status("ACTIVE")
                .build();
        attacker = userRepository.save(attacker);
        String attackerToken = jwtUtil.generateToken(attacker.getEmail());

        // 3. Kẻ tấn công gọi xóa tài liệu của testUser
        mockMvc.perform(delete("/api/documents/" + savedDoc.getId())
                        .header("Authorization", "Bearer " + attackerToken))
                .andExpect(status().isForbidden());

        // Tài liệu vẫn tồn tại
        assertEquals(1, documentRepository.count());
        assertEquals(1, documentPermissionRepositorySpy.count());
    }

    @Test
    void deleteDocument_unauthorized() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        mockMvc.perform(delete("/api/documents/" + savedDoc.getId()))
                .andExpect(status().isUnauthorized());

        // Tài liệu vẫn tồn tại
        assertEquals(1, documentRepository.count());
    }

    @Test
    void updateDocument_owner_success() throws Exception {
        Document doc = Document.builder()
                .title("Tiêu đề cũ")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        String jsonPayload = "{\"title\":\"Tiêu đề mới\",\"content\":{\"updated_key\":\"updated_value\"}}";

        mockMvc.perform(put("/api/documents/" + savedDoc.getId())
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(savedDoc.getId().toString())))
                .andExpect(jsonPath("$.title", is("Tiêu đề mới")))
                .andExpect(jsonPath("$.content.updated_key", is("updated_value")))
                .andExpect(jsonPath("$.ownerId", is(testUser.getId().toString())));

        // Kiểm chứng database
        Document updatedDoc = documentRepository.findById(savedDoc.getId()).orElseThrow();
        assertEquals("Tiêu đề mới", updatedDoc.getTitle());
        assertEquals("updated_value", updatedDoc.getContent().get("updated_key"));
    }

    @Test
    void updateDocument_editor_success() throws Exception {
        // 1. Tạo tài liệu của testUser
        Document doc = Document.builder()
                .title("Tài liệu dùng chung")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        // 2. Tạo một editor user
        User editor = User.builder()
                .firstname("Editor")
                .lastname("Collab")
                .email("editor@example.com")
                .status("ACTIVE")
                .build();
        editor = userRepository.save(editor);
        String editorToken = jwtUtil.generateToken(editor.getEmail());

        // 3. Cấp quyền EDITOR cho editor user
        DocumentPermission permission = DocumentPermission.builder()
                .document(savedDoc)
                .user(editor)
                .role(DocumentRole.EDITOR)
                .build();
        documentPermissionRepositorySpy.save(permission);

        // 4. Editor thực hiện cập nhật tài liệu
        String jsonPayload = "{\"title\":\"Tiêu đề cập nhật bởi Editor\",\"content\":{\"editor_key\":\"editor_value\"}}";

        mockMvc.perform(put("/api/documents/" + savedDoc.getId())
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Tiêu đề cập nhật bởi Editor")))
                .andExpect(jsonPath("$.content.editor_key", is("editor_value")));

        // Kiểm chứng DB
        Document updatedDoc = documentRepository.findById(savedDoc.getId()).orElseThrow();
        assertEquals("Tiêu đề cập nhật bởi Editor", updatedDoc.getTitle());
    }

    @Test
    void updateDocument_viewer_forbidden() throws Exception {
        // 1. Tạo tài liệu của testUser
        Document doc = Document.builder()
                .title("Tài liệu chỉ xem")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        // 2. Tạo một viewer user
        User viewer = User.builder()
                .firstname("Viewer")
                .lastname("Collab")
                .email("viewer@example.com")
                .status("ACTIVE")
                .build();
        viewer = userRepository.save(viewer);
        String viewerToken = jwtUtil.generateToken(viewer.getEmail());

        // 3. Cấp quyền VIEWER
        DocumentPermission permission = DocumentPermission.builder()
                .document(savedDoc)
                .user(viewer)
                .role(DocumentRole.VIEWER)
                .build();
        documentPermissionRepositorySpy.save(permission);

        // 4. Viewer cố gắng cập nhật tài liệu -> mong đợi 403
        String jsonPayload = "{\"title\":\"Cập nhật trái phép\",\"content\":{}}";

        mockMvc.perform(put("/api/documents/" + savedDoc.getId())
                        .header("Authorization", "Bearer " + viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isForbidden());

        // Kiểm chứng DB không đổi
        Document dbDoc = documentRepository.findById(savedDoc.getId()).orElseThrow();
        assertEquals("Tài liệu chỉ xem", dbDoc.getTitle());
    }

    @Test
    void updateDocument_unauthenticated() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        String jsonPayload = "{\"title\":\"Cập nhật không xác thực\",\"content\":{}}";

        mockMvc.perform(put("/api/documents/" + savedDoc.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void updateDocument_notFound() throws Exception {
        UUID randomId = UUID.randomUUID();
        String jsonPayload = "{\"title\":\"Tiêu đề\",\"content\":{}}";

        mockMvc.perform(put("/api/documents/" + randomId)
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateDocument_validationFailure() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        String jsonPayload = "{\"title\":\"\",\"content\":{}}";

        mockMvc.perform(put("/api/documents/" + savedDoc.getId())
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title", is("Tiêu đề không được để trống")));
    }

    @Test
    void inviteUser_ownerInvitesEditor_success() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu của tôi")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        User invitee = User.builder()
                .firstname("Jane")
                .lastname("Smith")
                .email("jane.smith@example.com")
                .status("ACTIVE")
                .build();
        invitee = userRepository.save(invitee);

        String jsonPayload = "{\"email\":\"jane.smith@example.com\",\"role\":\"EDITOR\"}";

        mockMvc.perform(post("/api/documents/" + savedDoc.getId() + "/members")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.documentId", is(savedDoc.getId().toString())))
                .andExpect(jsonPath("$.inviteeId", is(invitee.getId().toString())))
                .andExpect(jsonPath("$.inviteeEmail", is("jane.smith@example.com")))
                .andExpect(jsonPath("$.role", is("EDITOR")))
                .andExpect(jsonPath("$.status", is("PENDING")));

        // Kiểm chứng trong DB
        assertEquals(1, documentInvitationRepository.count());
    }

    @Test
    void inviteUser_ownerInvitesViewer_success() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu của tôi")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        User invitee = User.builder()
                .firstname("Jane")
                .lastname("Smith")
                .email("jane.smith@example.com")
                .status("ACTIVE")
                .build();
        invitee = userRepository.save(invitee);

        String jsonPayload = "{\"email\":\"jane.smith@example.com\",\"role\":\"VIEWER\"}";

        mockMvc.perform(post("/api/documents/" + savedDoc.getId() + "/members")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role", is("VIEWER")))
                .andExpect(jsonPath("$.status", is("PENDING")));
    }

    @Test
    void inviteUser_nonOwner_forbidden() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu của tôi")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        User anotherUser = User.builder()
                .firstname("Another")
                .lastname("User")
                .email("another@example.com")
                .status("ACTIVE")
                .build();
        anotherUser = userRepository.save(anotherUser);
        String anotherToken = jwtUtil.generateToken(anotherUser.getEmail());

        String jsonPayload = "{\"email\":\"jane.smith@example.com\",\"role\":\"EDITOR\"}";

        mockMvc.perform(post("/api/documents/" + savedDoc.getId() + "/members")
                        .header("Authorization", "Bearer " + anotherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isForbidden());
    }

    @Test
    void inviteUser_invitedUserNotFound() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu của tôi")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        String jsonPayload = "{\"email\":\"nonexistent@example.com\",\"role\":\"EDITOR\"}";

        mockMvc.perform(post("/api/documents/" + savedDoc.getId() + "/members")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isNotFound());
    }

    @Test
    void inviteUser_documentNotFound() throws Exception {
        UUID randomId = UUID.randomUUID();
        String jsonPayload = "{\"email\":\"jane.smith@example.com\",\"role\":\"EDITOR\"}";

        mockMvc.perform(post("/api/documents/" + randomId + "/members")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isNotFound());
    }

    @Test
    void inviteUser_duplicateInvitation_conflict() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu của tôi")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        User invitee = User.builder()
                .firstname("Jane")
                .lastname("Smith")
                .email("jane.smith@example.com")
                .status("ACTIVE")
                .build();
        invitee = userRepository.save(invitee);

        // Tạo lời mời PENDING đầu tiên
        DocumentInvitation invitation = DocumentInvitation.builder()
                .document(savedDoc)
                .invitee(invitee)
                .inviter(testUser)
                .role(DocumentRole.EDITOR)
                .status("PENDING")
                .build();
        documentInvitationRepository.save(invitation);

        // Gửi lời mời lần thứ 2 -> mong đợi 409
        String jsonPayload = "{\"email\":\"jane.smith@example.com\",\"role\":\"EDITOR\"}";

        mockMvc.perform(post("/api/documents/" + savedDoc.getId() + "/members")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isConflict());
    }

    @Test
    void inviteUser_alreadyMember_conflict() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu của tôi")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        User invitee = User.builder()
                .firstname("Jane")
                .lastname("Smith")
                .email("jane.smith@example.com")
                .status("ACTIVE")
                .build();
        invitee = userRepository.save(invitee);

        // Đã là thành viên (có permission)
        DocumentPermission permission = DocumentPermission.builder()
                .document(savedDoc)
                .user(invitee)
                .role(DocumentRole.EDITOR)
                .build();
        documentPermissionRepositorySpy.save(permission);

        // Gửi lời mời -> mong đợi 409
        String jsonPayload = "{\"email\":\"jane.smith@example.com\",\"role\":\"EDITOR\"}";

        mockMvc.perform(post("/api/documents/" + savedDoc.getId() + "/members")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isConflict());
    }

    @Test
    void inviteUser_invalidRole_badRequest() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        User invitee = User.builder()
                .firstname("Jane")
                .lastname("Smith")
                .email("jane.smith@example.com")
                .status("ACTIVE")
                .build();
        invitee = userRepository.save(invitee);

        // Mời với vai trò OWNER không được phép -> mong đợi 400
        String jsonPayload1 = "{\"email\":\"jane.smith@example.com\",\"role\":\"OWNER\"}";
        mockMvc.perform(post("/api/documents/" + savedDoc.getId() + "/members")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload1))
                .andExpect(status().isBadRequest());

        // Mời với vai trò sai chính tả -> mong đợi 400
        String jsonPayload2 = "{\"email\":\"jane.smith@example.com\",\"role\":\"XYZ\"}";
        mockMvc.perform(post("/api/documents/" + savedDoc.getId() + "/members")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload2))
                .andExpect(status().isBadRequest());
    }

    @Test
    void inviteUser_unauthenticated() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        String jsonPayload = "{\"email\":\"jane.smith@example.com\",\"role\":\"EDITOR\"}";

        mockMvc.perform(post("/api/documents/" + savedDoc.getId() + "/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void acceptInvitation_success() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        User invitee = User.builder()
                .firstname("Jane")
                .lastname("Smith")
                .email("jane.smith@example.com")
                .status("ACTIVE")
                .build();
        final User savedInvitee = userRepository.save(invitee);
        String inviteeToken = jwtUtil.generateToken(savedInvitee.getEmail());

        // Tạo lời mời PENDING
        DocumentInvitation invitation = DocumentInvitation.builder()
                .document(savedDoc)
                .invitee(savedInvitee)
                .inviter(testUser)
                .role(DocumentRole.EDITOR)
                .status("PENDING")
                .build();
        DocumentInvitation savedInv = documentInvitationRepository.save(invitation);

        // Chấp nhận lời mời
        mockMvc.perform(post("/api/documents/" + savedDoc.getId() + "/invitations/accept")
                        .header("Authorization", "Bearer " + inviteeToken))
                .andExpect(status().isOk());

        // Kiểm chứng DB
        DocumentInvitation updatedInv = documentInvitationRepository.findById(savedInv.getId()).orElseThrow();
        assertEquals("ACCEPTED", updatedInv.getStatus());

        List<DocumentPermission> permissions = documentPermissionRepositorySpy.findAll();
        boolean hasPermission = permissions.stream().anyMatch(p -> p.getUser().getId().equals(savedInvitee.getId()) && p.getRole() == DocumentRole.EDITOR);
        assertTrue(hasPermission);
    }

    @Test
    void declineInvitation_success() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        User invitee = User.builder()
                .firstname("Jane")
                .lastname("Smith")
                .email("jane.smith@example.com")
                .status("ACTIVE")
                .build();
        final User savedInvitee = userRepository.save(invitee);
        String inviteeToken = jwtUtil.generateToken(savedInvitee.getEmail());

        // Tạo lời mời PENDING
        DocumentInvitation invitation = DocumentInvitation.builder()
                .document(savedDoc)
                .invitee(savedInvitee)
                .inviter(testUser)
                .role(DocumentRole.VIEWER)
                .status("PENDING")
                .build();
        DocumentInvitation savedInv = documentInvitationRepository.save(invitation);

        // Từ chối lời mời
        mockMvc.perform(post("/api/documents/" + savedDoc.getId() + "/invitations/decline")
                        .header("Authorization", "Bearer " + inviteeToken))
                .andExpect(status().isOk());

        // Kiểm chứng DB
        DocumentInvitation updatedInv = documentInvitationRepository.findById(savedInv.getId()).orElseThrow();
        assertEquals("DECLINED", updatedInv.getStatus());

        // Không được tạo permission nào
        long permissionsCount = documentPermissionRepositorySpy.findAll().stream().filter(p -> p.getUser().getId().equals(savedInvitee.getId())).count();
        assertEquals(0, permissionsCount);
    }

    @Test
    void removeMember_ownerRemovesEditor_success() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu của Owner")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        User member = User.builder()
                .firstname("Jane")
                .lastname("Smith")
                .email("jane.smith@example.com")
                .status("ACTIVE")
                .build();
        final User savedMember = userRepository.save(member);

        // Tạo DocumentPermission cho EDITOR
        DocumentPermission permission = DocumentPermission.builder()
                .document(savedDoc)
                .user(savedMember)
                .role(DocumentRole.EDITOR)
                .build();
        documentPermissionRepositorySpy.save(permission);

        // Gọi API xóa thành viên
        mockMvc.perform(delete("/api/documents/" + savedDoc.getId() + "/members/" + savedMember.getId())
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isNoContent());

        // Kiểm chứng trong DB: đã xóa thành công
        long permissionsCount = documentPermissionRepositorySpy.findAll().stream()
                .filter(p -> p.getUser().getId().equals(savedMember.getId()))
                .count();
        assertEquals(0, permissionsCount);
    }

    @Test
    void removeMember_ownerRemovesViewer_success() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu của Owner")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        User member = User.builder()
                .firstname("Jane")
                .lastname("Smith")
                .email("jane.smith@example.com")
                .status("ACTIVE")
                .build();
        final User savedMember = userRepository.save(member);

        // Tạo DocumentPermission cho VIEWER
        DocumentPermission permission = DocumentPermission.builder()
                .document(savedDoc)
                .user(savedMember)
                .role(DocumentRole.VIEWER)
                .build();
        documentPermissionRepositorySpy.save(permission);

        // Xóa thành viên
        mockMvc.perform(delete("/api/documents/" + savedDoc.getId() + "/members/" + savedMember.getId())
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isNoContent());

        long permissionsCount = documentPermissionRepositorySpy.findAll().stream()
                .filter(p -> p.getUser().getId().equals(savedMember.getId()))
                .count();
        assertEquals(0, permissionsCount);
    }

    @Test
    void removeMember_nonOwnerEditor_forbidden() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        User editor = User.builder()
                .firstname("Editor")
                .lastname("User")
                .email("editor@example.com")
                .status("ACTIVE")
                .build();
        final User savedEditor = userRepository.save(editor);
        String editorToken = jwtUtil.generateToken(savedEditor.getEmail());

        User member = User.builder()
                .firstname("Member")
                .lastname("User")
                .email("member@example.com")
                .status("ACTIVE")
                .build();
        final User savedMember = userRepository.save(member);

        // Cấp quyền EDITOR cho editor
        DocumentPermission p1 = DocumentPermission.builder()
                .document(savedDoc)
                .user(savedEditor)
                .role(DocumentRole.EDITOR)
                .build();
        documentPermissionRepositorySpy.save(p1);

        // Cấp quyền VIEWER cho member
        DocumentPermission p2 = DocumentPermission.builder()
                .document(savedDoc)
                .user(savedMember)
                .role(DocumentRole.VIEWER)
                .build();
        documentPermissionRepositorySpy.save(p2);

        // Editor cố xóa member -> mong đợi 403
        mockMvc.perform(delete("/api/documents/" + savedDoc.getId() + "/members/" + savedMember.getId())
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isForbidden());

        // Phân quyền vẫn còn
        assertTrue(documentPermissionRepositorySpy.findByDocumentIdAndUserId(savedDoc.getId(), savedMember.getId()).isPresent());
    }

    @Test
    void removeMember_nonOwnerViewer_forbidden() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        User viewer = User.builder()
                .firstname("Viewer")
                .lastname("User")
                .email("viewer@example.com")
                .status("ACTIVE")
                .build();
        final User savedViewer = userRepository.save(viewer);
        String viewerToken = jwtUtil.generateToken(savedViewer.getEmail());

        User member = User.builder()
                .firstname("Member")
                .lastname("User")
                .email("member@example.com")
                .status("ACTIVE")
                .build();
        final User savedMember = userRepository.save(member);

        // Cấp quyền VIEWER cho viewer
        DocumentPermission p1 = DocumentPermission.builder()
                .document(savedDoc)
                .user(savedViewer)
                .role(DocumentRole.VIEWER)
                .build();
        documentPermissionRepositorySpy.save(p1);

        // Cấp quyền EDITOR cho member
        DocumentPermission p2 = DocumentPermission.builder()
                .document(savedDoc)
                .user(savedMember)
                .role(DocumentRole.EDITOR)
                .build();
        documentPermissionRepositorySpy.save(p2);

        // Viewer cố xóa member -> mong đợi 403
        mockMvc.perform(delete("/api/documents/" + savedDoc.getId() + "/members/" + savedMember.getId())
                        .header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void removeMember_targetNotMember_notFound() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        User nonMember = User.builder()
                .firstname("Non")
                .lastname("Member")
                .email("nonmember@example.com")
                .status("ACTIVE")
                .build();
        final User savedNonMember = userRepository.save(nonMember);

        // Cố xóa một user tồn tại nhưng không phải thành viên tài liệu -> mong đợi 404
        mockMvc.perform(delete("/api/documents/" + savedDoc.getId() + "/members/" + savedNonMember.getId())
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void removeMember_targetUserNotFound() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        UUID randomUserId = UUID.randomUUID();

        // Cố xóa một user không tồn tại -> mong đợi 404
        mockMvc.perform(delete("/api/documents/" + savedDoc.getId() + "/members/" + randomUserId)
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void removeMember_documentNotFound() throws Exception {
        User member = User.builder()
                .firstname("Jane")
                .lastname("Smith")
                .email("jane.smith@example.com")
                .status("ACTIVE")
                .build();
        final User savedMember = userRepository.save(member);

        UUID randomDocId = UUID.randomUUID();

        // Xóa trên tài liệu không tồn tại -> mong đợi 404
        mockMvc.perform(delete("/api/documents/" + randomDocId + "/members/" + savedMember.getId())
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void removeMember_attemptToRemoveOwner_badRequest() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        // Tạo DocumentPermission OWNER cho testUser
        DocumentPermission permission = DocumentPermission.builder()
                .document(savedDoc)
                .user(testUser)
                .role(DocumentRole.OWNER)
                .build();
        documentPermissionRepositorySpy.save(permission);

        // Cố xóa chủ sở hữu (Owner) -> mong đợi 400
        mockMvc.perform(delete("/api/documents/" + savedDoc.getId() + "/members/" + testUser.getId())
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void removeMember_unauthenticated() throws Exception {
        Document doc = Document.builder()
                .title("Tài liệu")
                .owner(testUser)
                .isTrashed(false)
                .build();
        Document savedDoc = documentRepository.saveAndFlush(doc);

        UUID randomUserId = UUID.randomUUID();

        mockMvc.perform(delete("/api/documents/" + savedDoc.getId() + "/members/" + randomUserId))
                .andExpect(status().isUnauthorized());
    }
}
