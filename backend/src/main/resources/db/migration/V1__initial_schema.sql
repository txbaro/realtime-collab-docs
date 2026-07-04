-- =========================================================================
-- V1__initial_schema.sql
-- Khởi tạo cấu trúc cơ sở dữ liệu ban đầu cho dự án Realtime Collab Docs
-- =========================================================================

-- Kích hoạt tiện ích mở rộng tạo mã UUID tự động trong PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BẢNG USERS: Lưu thông tin hồ sơ và trạng thái tài khoản
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    avatar_url VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_VERIFICATION',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG USER_AUTH: Lưu thông tin mật khẩu/Social provider phục vụ đăng nhập
CREATE TABLE user_auth (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL', -- LOCAL, GOOGLE, GITHUB
    provider_id VARCHAR(100),                           -- ID từ Google/Github cấp
    password_hash VARCHAR(255),                         -- Chuỗi băm mật khẩu (null nếu login bằng Social)
    CONSTRAINT fk_user_auth_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. BẢNG DOCUMENTS: Lưu trữ metadata và nội dung cấu trúc của tài liệu
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled Document',
    content JSONB,                                      -- Cấu trúc Rich-text lưu dạng JSONB để tối ưu truy vấn
    owner_id UUID NOT NULL,                             -- Khóa ngoại trỏ đến chủ sở hữu
    is_trashed BOOLEAN NOT NULL DEFAULT FALSE,          -- Soft delete (Thùng rác)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_document_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. BẢNG DOCUMENT_PERMISSIONS: Quản lý quyền chia sẻ cho các cộng tác viên
CREATE TABLE document_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL,
    user_id UUID NOT NULL,                              -- Người được mời chia sẻ
    role VARCHAR(20) NOT NULL,                          -- EDITOR, VIEWER
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_permission_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_permission_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_document_user_permission UNIQUE (document_id, user_id) -- Đảm bảo một user chỉ có 1 quyền duy nhất trên 1 file
);

-- =========================================================================
-- TỐI ƯU HÓA HIỆU NĂNG: Đánh index các cột thường xuyên xuất hiện trong mệnh đề WHERE
-- =========================================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_auth_user_id ON user_auth(user_id);
CREATE INDEX idx_documents_owner_id ON documents(owner_id);
CREATE INDEX idx_document_permissions_doc_user ON document_permissions(document_id, user_id);