package com.txbaro.realtime_collab_docs.websocket;

import com.txbaro.realtime_collab_docs.entity.Document;
import com.txbaro.realtime_collab_docs.entity.DocumentPermission;
import com.txbaro.realtime_collab_docs.entity.User;
import com.txbaro.realtime_collab_docs.entity.enums.DocumentRole;
import com.txbaro.realtime_collab_docs.repository.DocumentPermissionRepository;
import com.txbaro.realtime_collab_docs.repository.DocumentRepository;
import com.txbaro.realtime_collab_docs.repository.UserRepository;
import com.txbaro.realtime_collab_docs.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.net.URI;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class DocumentWebSocketInterceptor implements HandshakeInterceptor {

    private final JwtUtil jwtUtil;
    private final DocumentRepository documentRepository;
    private final DocumentPermissionRepository documentPermissionRepository;
    private final UserRepository userRepository;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
        if (request instanceof ServletServerHttpRequest) {
            ServletServerHttpRequest servletRequest = (ServletServerHttpRequest) request;
            String query = servletRequest.getServletRequest().getQueryString();
            
            // Trích xuất token từ query param ?token=...
            String token = null;
            if (query != null) {
                String[] params = query.split("&");
                for (String param : params) {
                    String[] pair = param.split("=", 2);
                    if (pair.length == 2 && "token".equals(pair[0])) {
                        token = pair[1];
                        break;
                    }
                }
            }

            if (token == null || !jwtUtil.validateToken(token)) {
                log.warn("WebSocket Handshake bị từ chối: Token không hợp lệ hoặc bị thiếu");
                response.setStatusCode(HttpStatus.UNAUTHORIZED);
                return false;
            }

            String email = jwtUtil.extractEmail(token);
            
            // Trích xuất documentId từ URI path (ví dụ: /ws/document/{documentId})
            URI uri = request.getURI();
            String path = uri.getPath();
            String[] segments = path.split("/");
            String docIdStr = segments[segments.length - 1];
            
            UUID documentId;
            try {
                documentId = UUID.fromString(docIdStr);
            } catch (IllegalArgumentException e) {
                log.warn("WebSocket Handshake bị từ chối: documentId không đúng định dạng: {}", docIdStr);
                response.setStatusCode(HttpStatus.BAD_REQUEST);
                return false;
            }

            // Tìm kiếm tài liệu kèm thông tin owner
            Optional<Document> docOpt = documentRepository.findWithOwnerById(documentId);
            if (docOpt.isEmpty()) {
                log.warn("WebSocket Handshake bị từ chối: Tài liệu không tồn tại: {}", documentId);
                response.setStatusCode(HttpStatus.NOT_FOUND);
                return false;
            }
            Document document = docOpt.get();

            // Kiểm tra phân quyền truy cập của người dùng đối với tài liệu
            boolean isOwner = document.getOwner().getEmail().equalsIgnoreCase(email);
            DocumentRole role = null;

            if (isOwner) {
                role = DocumentRole.OWNER;
            } else {
                Optional<DocumentPermission> permissionOpt = documentPermissionRepository
                        .findByDocumentIdAndUserEmail(documentId, email);
                if (permissionOpt.isEmpty()) {
                    log.warn("WebSocket Handshake bị từ chối: Người dùng {} không được phân quyền xem/chỉnh sửa tài liệu {}", email, documentId);
                    response.setStatusCode(HttpStatus.FORBIDDEN);
                    return false;
                }
                role = permissionOpt.get().getRole();
            }

            // Lấy thêm tên hiển thị
            Optional<User> userOpt = userRepository.findByEmail(email);
            String fullname = userOpt.map(u -> u.getFirstname() + " " + u.getLastname()).orElse("User");

            // Lưu các thông tin cần thiết vào attributes của WebSocket session
            attributes.put("email", email);
            attributes.put("documentId", documentId);
            attributes.put("role", role);
            attributes.put("fullname", fullname);

            log.info("WebSocket Handshake thành công: User {} ({}) truy cập tài liệu {}", email, role, documentId);
            return true;
        }
        return false;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
    }
}
