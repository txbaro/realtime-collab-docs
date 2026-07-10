package com.txbaro.realtime_collab_docs.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.ZonedDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentResponse {
    private UUID id;
    private String title;
    private Map<String, Object> content;
    private UUID ownerId;
    private boolean isTrashed;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;
}
