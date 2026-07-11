package com.txbaro.realtime_collab_docs.websocket;

import com.txbaro.realtime_collab_docs.entity.enums.DocumentRole;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
@Slf4j
public class DocumentWebSocketHandler extends BinaryWebSocketHandler {

    // Quản lý các kết nối session theo từng documentId (room)
    private final Map<UUID, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        UUID documentId = (UUID) session.getAttributes().get("documentId");
        if (documentId != null) {
            rooms.computeIfAbsent(documentId, k -> new CopyOnWriteArraySet<>()).add(session);
            log.info("WebSocket kết nối: Session {} tham gia phòng tài liệu {}", session.getId(), documentId);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        UUID documentId = (UUID) session.getAttributes().get("documentId");
        if (documentId != null) {
            Set<WebSocketSession> roomSessions = rooms.get(documentId);
            if (roomSessions != null) {
                roomSessions.remove(session);
                if (roomSessions.isEmpty()) {
                    rooms.remove(documentId);
                    log.info("Phòng tài liệu {} trống. Đã dọn dẹp phòng.", documentId);
                }
            }
            log.info("WebSocket ngắt kết nối: Session {} rời phòng tài liệu {}", session.getId(), documentId);
        }
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        UUID documentId = (UUID) session.getAttributes().get("documentId");
        DocumentRole role = (DocumentRole) session.getAttributes().get("role");

        if (documentId == null) {
            return;
        }

        // Nếu là VIEWER, từ chối phát dữ liệu chỉnh sửa lên phòng
        if (role == DocumentRole.VIEWER) {
            log.warn("WebSocket Cảnh báo: Session {} với vai trò VIEWER cố gắng gửi bản cập nhật tài liệu {}", session.getId(), documentId);
            return;
        }

        // Phát lại tin nhắn nhị phân cho các session đang hoạt động khác trong cùng phòng
        Set<WebSocketSession> roomSessions = rooms.get(documentId);
        if (roomSessions != null) {
            for (WebSocketSession activeSession : roomSessions) {
                if (activeSession.isOpen() && !activeSession.getId().equals(session.getId())) {
                    try {
                        activeSession.sendMessage(message);
                    } catch (IOException e) {
                        log.error("Lỗi gửi tin nhắn đến session {}: {}", activeSession.getId(), e.getMessage());
                    }
                }
            }
        }
    }
}
