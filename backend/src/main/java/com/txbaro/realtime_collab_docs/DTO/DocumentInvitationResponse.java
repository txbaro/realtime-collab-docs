package com.txbaro.realtime_collab_docs.dto;

import com.txbaro.realtime_collab_docs.entity.enums.DocumentRole;
import lombok.*;

import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentInvitationResponse {
    private UUID id;
    private UUID documentId;
    private UUID inviteeId;
    private String inviteeEmail;
    private UUID inviterId;
    private DocumentRole role;
    private String status;
    private ZonedDateTime createdAt;
}
