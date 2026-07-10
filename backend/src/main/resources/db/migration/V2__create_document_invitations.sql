-- =========================================================================
-- V2__create_document_invitations.sql
-- Tạo bảng quản lý lời mời tham gia tài liệu
-- =========================================================================

CREATE TABLE document_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL,
    invitee_id UUID NOT NULL,
    inviter_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, DECLINED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invitation_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_invitation_invitee FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_invitation_inviter FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_document_invitee_invitation UNIQUE (document_id, invitee_id)
);

CREATE INDEX idx_document_invitations_invitee ON document_invitations(invitee_id);
