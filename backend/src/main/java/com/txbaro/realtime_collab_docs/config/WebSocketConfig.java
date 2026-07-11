package com.txbaro.realtime_collab_docs.config;

import com.txbaro.realtime_collab_docs.websocket.DocumentWebSocketHandler;
import com.txbaro.realtime_collab_docs.websocket.DocumentWebSocketInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final DocumentWebSocketHandler documentWebSocketHandler;
    private final DocumentWebSocketInterceptor documentWebSocketInterceptor;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(documentWebSocketHandler, "/ws/document/{documentId}")
                .addInterceptors(documentWebSocketInterceptor)
                .setAllowedOrigins("*");
    }
}
