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
    private String documentTitle;
    private UUID inviteeId;
    private String inviteeEmail;
    private UUID inviterId;
    private String inviterName;
    private String inviterEmail;
    private DocumentRole role;
    private String status;
    private ZonedDateTime createdAt;
}
