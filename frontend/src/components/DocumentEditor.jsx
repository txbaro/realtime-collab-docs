import React, { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, 
  Code, List, ListOrdered, Quote, Undo, Redo, Users, 
  CheckCircle, AlertCircle, RefreshCw, X, UserPlus, Trash, 
  ArrowLeft, Lock, Share2, FileText
} from 'lucide-react'

// Cấu hình danh sách màu sắc ngẫu nhiên cho con trỏ cộng tác
const COLLABORATOR_COLORS = [
  '#ea4335', '#fbbc05', '#34a853', '#4285f4', '#ab47bc', 
  '#ff7043', '#26a69a', '#ec407a'
]
const getRandomColor = () => COLLABORATOR_COLORS[Math.floor(Math.random() * COLLABORATOR_COLORS.length)]

const API_URL = 'http://localhost:8080'

// Component con xử lý editor và cộng tác sau khi ydoc và provider đã sẵn sàng
function CollabEditor({ token, documentId, profile, onBack, showToast, docDetails, ydoc, wsProvider }) {
  const [title, setTitle] = useState(docDetails.title || 'Không có tiêu đề')
  const [role, setRole] = useState(docDetails.role || 'VIEWER')
  const [syncState, setSyncState] = useState(wsProvider.connected ? 'connected' : 'connecting')
  const [saveStatus, setSaveStatus] = useState('saved')
  const [activeUsers, setActiveUsers] = useState([])
  const saveTimeoutRef = useRef(null)

  // Quản lý thành viên (Share Popup)
  const [showShareModal, setShowShareModal] = useState(false)
  const [members, setMembers] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('EDITOR')

  // 1. Đồng bộ trạng thái kết nối và người dùng đang hoạt động (Awareness)
  useEffect(() => {
    const handleStatus = (event) => {
      setSyncState(event.status)
    }
    wsProvider.on('status', handleStatus)

    const handleAwarenessChange = () => {
      const states = Array.from(wsProvider.awareness.getStates().values())
      const users = states
        .map(state => state.user)
        .filter(Boolean)
      setActiveUsers(users)
    }
    wsProvider.awareness.on('change', handleAwarenessChange)

    // Lấy trạng thái ban đầu
    handleAwarenessChange()

    return () => {
      wsProvider.off('status', handleStatus)
      wsProvider.awareness.off('change', handleAwarenessChange)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [wsProvider])

  // 2. Khởi tạo Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCaret.configure({
        provider: wsProvider,
        user: {
          name: `${profile.firstname} ${profile.lastname}`,
          color: getRandomColor()
        }
      })
    ],
    onUpdate({ editor, transaction }) {
      const isLocalChange = !transaction.getMeta('y-sync$')
      if (isLocalChange && (role === 'OWNER' || role === 'EDITOR')) {
        setSaveStatus('saving')
        
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = setTimeout(() => {
          saveDocumentToBackend(title, editor.getJSON())
        }, 1500)
      }
    }
  }, [ydoc, wsProvider])

  // 3. Đảm bảo cập nhật quyền Editable
  useEffect(() => {
    if (editor) {
      const canEdit = role === 'OWNER' || role === 'EDITOR'
      editor.setEditable(canEdit)
    }
  }, [editor, role])

  // 4. Logic nạp nội dung ban đầu từ DB nếu Y.Doc trống và phòng trống
  useEffect(() => {
    if (!editor || !ydoc || !docDetails) return

    const timer = setTimeout(() => {
      const isYdocEmpty = ydoc.getXmlFragment('default').length === 0
      const activeUserCount = wsProvider.awareness.getStates().size

      if (isYdocEmpty && activeUserCount <= 1 && docDetails.content) {
        editor.commands.setContent(docDetails.content, false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [editor, ydoc, docDetails, wsProvider])

  // 5. API lưu tài liệu (PUT)
  const saveDocumentToBackend = async (currentTitle, jsonContent) => {
    try {
      const response = await fetch(`${API_URL}/api/documents/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: currentTitle,
          content: jsonContent || editor?.getJSON()
        })
      })

      if (response.ok) {
        setSaveStatus('saved')
      } else {
        setSaveStatus('error')
        showToast("Lưu tài liệu tự động thất bại!", false)
      }
    } catch (err) {
      setSaveStatus('error')
    }
  }

  // Xử lý đổi tiêu đề tài liệu
  const handleTitleChange = (e) => {
    const newTitle = e.target.value
    setTitle(newTitle)

    if (role === 'OWNER' || role === 'EDITOR') {
      setSaveStatus('saving')
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        saveDocumentToBackend(newTitle, editor.getJSON())
      }, 1500)
    }
  }

  // --- Logic quản lý thành viên (popup chia sẻ) ---
  const openShareModal = () => {
    setShowShareModal(true)
    fetchMembers()
  }

  const fetchMembers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/documents/${documentId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setMembers(data)
      }
    } catch (err) {
      showToast("Lỗi tải danh sách thành viên", false)
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    try {
      const response = await fetch(`${API_URL}/api/documents/${documentId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole
        })
      })

      if (response.ok) {
        showToast(`Đã gửi lời mời đến ${inviteEmail}!`, true)
        setInviteEmail('')
        fetchMembers()
      } else {
        const resText = await response.text()
        showToast(resText || "Mời thành viên thất bại", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ", false)
    }
  }

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Loại bỏ thành viên này khỏi tài liệu?")) return

    try {
      const response = await fetch(`${API_URL}/api/documents/${documentId}/members/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        showToast("Đã loại bỏ thành viên thành công!", true)
        fetchMembers()
      } else {
        showToast("Loại bỏ thành viên thất bại", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ", false)
    }
  }

  const handleUpdateMemberRole = async (userId, newRole) => {
    try {
      const response = await fetch(`${API_URL}/api/documents/${documentId}/members/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        showToast("Đã cập nhật vai trò thành công!", true)
        fetchMembers()
      } else {
        showToast("Cập nhật vai trò thất bại", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ", false)
    }
  }

  if (!editor) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'white' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    )
  }

  const isReadOnly = role !== 'OWNER' && role !== 'EDITOR'

  return (
    <div className="editor-layout">
      
      {/* 1. Header Trình soạn thảo kiểu Google Docs */}
      <header className="editor-header">
        <div className="editor-title-container">
          <button onClick={onBack} className="editor-logo-btn" title="Quay lại Dashboard">
            <FileText className="dashboard-logo-icon" style={{ width: '32px', height: '32px' }} />
          </button>
          
          <div className="editor-title-details">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                disabled={isReadOnly}
                className="editor-title-input"
              />
              <span className="editor-status-text">
                {saveStatus === 'saved' && <CheckCircle size={13} style={{ color: '#1e8e3e' }} />}
                {saveStatus === 'saving' && <RefreshCw size={13} className="spinner" />}
                {saveStatus === 'error' && <AlertCircle size={13} style={{ color: '#d93025' }} />}
              </span>
            </div>
            
            {/* Phân quyền vai trò hiện tại của User */}
            <span style={{ 
              fontSize: '11px', 
              color: 'var(--google-text-muted)', 
              paddingLeft: '6px',
              textAlign: 'left'
            }}>
              {role === 'OWNER' && 'Chủ sở hữu'}
              {role === 'EDITOR' && 'Người chỉnh sửa'}
              {role === 'VIEWER' && 'Chỉ được xem'}
            </span>
          </div>
        </div>

        {/* Căn lề phải: Active Users & Nút Share */}
        <div className="editor-actions">
          {/* Active Users Avatar list */}
          {activeUsers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
              {activeUsers.map((user, idx) => (
                <div 
                  key={idx}
                  title={user.name}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: user.color || '#0b57d0',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '11px',
                    fontWeight: '600',
                    border: '2px solid white',
                    marginLeft: idx > 0 ? '-6px' : '0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    zIndex: 10 - idx
                  }}
                >
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
              ))}
            </div>
          )}

          {/* Nút chia sẻ (Share) hoặc nút chi tiết */}
          {role === 'OWNER' ? (
            <button className="btn-share" onClick={openShareModal}>
              <Share2 size={16} /> Chia sẻ
            </button>
          ) : (
            <button 
              className="btn-logout" 
              style={{ padding: '8px 16px', background: 'transparent' }} 
              onClick={openShareModal}
            >
              <Users size={14} /> Thành viên
            </button>
          )}

          <button 
            className="btn-logout" 
            style={{ padding: '8px 16px' }}
            onClick={onBack}
          >
            Đóng
          </button>
        </div>
      </header>

      {/* 2. Thanh công cụ (Toolbar) Google Docs */}
      {!isReadOnly && (
        <div className="editor-toolbar">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className="btn-tool"
            title="Hoàn tác (Ctrl+Z)"
          >
            <Undo size={15} />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className="btn-tool"
            title="Làm lại (Ctrl+Y)"
          >
            <Redo size={15} />
          </button>
          
          <div className="toolbar-separator" />
          
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`btn-tool ${editor.isActive('bold') ? 'active' : ''}`}
            title="Chữ đậm"
          >
            <Bold size={15} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`btn-tool ${editor.isActive('italic') ? 'active' : ''}`}
            title="Chữ nghiêng"
          >
            <Italic size={15} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`btn-tool ${editor.isActive('strike') ? 'active' : ''}`}
            title="Gạch ngang"
          >
            <Strikethrough size={15} />
          </button>
          
          <div className="toolbar-separator" />

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`btn-tool ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
            title="Tiêu đề 1"
          >
            <Heading1 size={15} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`btn-tool ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
            title="Tiêu đề 2"
          >
            <Heading2 size={15} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`btn-tool ${editor.isActive('code') ? 'active' : ''}`}
            title="Code tag"
          >
            <Code size={15} />
          </button>
          
          <div className="toolbar-separator" />

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`btn-tool ${editor.isActive('bulletList') ? 'active' : ''}`}
            title="Danh sách gạch đầu dòng"
          >
            <List size={15} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`btn-tool ${editor.isActive('orderedList') ? 'active' : ''}`}
            title="Danh sách số"
          >
            <ListOrdered size={15} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`btn-tool ${editor.isActive('blockquote') ? 'active' : ''}`}
            title="Trích dẫn"
          >
            <Quote size={15} />
          </button>
        </div>
      )}

      {/* 3. Canvas & Vùng soạn thảo trang giấy A4 */}
      <div className="editor-canvas">
        <div className="editor-paper">
          <EditorContent editor={editor} className="tiptap-editor-content" />
        </div>
      </div>

      {/* 4. Modal/Popup Chia sẻ & Quản lý thành viên (Google Style) */}
      {showShareModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--google-gray-border)',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '520px',
            padding: '30px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '500', color: 'var(--google-text-dark)' }}>
                Chia sẻ "{title}"
              </h3>
              <button 
                onClick={() => setShowShareModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--google-text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form mời thành viên (Chỉ chủ sở hữu mới gửi được) */}
            {role === 'OWNER' ? (
              <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid var(--google-gray-border)' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    placeholder="Thêm người dùng hoặc email..."
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    style={{ flex: 1, paddingLeft: '14px' }}
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    style={{
                      width: 'auto',
                      background: '#ffffff',
                      border: '1px solid var(--google-gray-border)',
                      borderRadius: '4px',
                      color: 'var(--google-text-dark)',
                      padding: '0 12px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="EDITOR">EDITOR (Sửa)</option>
                    <option value="VIEWER">VIEWER (Xem)</option>
                  </select>
                </div>
                <button type="submit" className="btn-submit" style={{ alignSelf: 'flex-end', width: 'auto', marginTop: 0, padding: '8px 16px' }}>
                  <UserPlus size={16} /> Gửi lời mời
                </button>
              </form>
            ) : (
              <div style={{ paddingBottom: '15px', marginBottom: '15px', borderBottom: '1px solid var(--google-gray-border)', fontSize: '13px', color: 'var(--google-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} /> Bạn chỉ có quyền xem danh sách thành viên của tài liệu này.
              </div>
            )}

            {/* Danh sách thành viên */}
            <h4 style={{ fontSize: '14px', fontWeight: '500', color: 'var(--google-text-dark)', marginBottom: '12px', textAlign: 'left' }}>
              Những người có quyền truy cập
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
              {/* Hiển thị chủ sở hữu trước */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.01)',
                border: '1px solid rgba(0,0,0,0.03)',
                borderRadius: '6px'
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--google-text-dark)' }}>
                    Chủ sở hữu tài liệu
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--google-text-muted)' }}>{docDetails.ownerEmail || 'Email Owner'}</div>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(11, 87, 208, 0.08)',
                  color: 'var(--google-blue)'
                }}>
                  OWNER
                </span>
              </div>

              {/* Các thành viên được phân quyền */}
              {members.filter(m => m.role !== 'OWNER').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '15px', color: 'var(--google-text-muted)', fontSize: '13px' }}>
                  Chưa có thành viên nào khác tham gia.
                </div>
              ) : (
                members.filter(m => m.role !== 'OWNER').map((member) => (
                  <div 
                    key={member.id} 
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: '#ffffff',
                      border: '1px solid var(--google-gray-border)',
                      borderRadius: '6px'
                    }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--google-text-dark)' }}>
                        {member.firstname} {member.lastname}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--google-text-muted)' }}>{member.email}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {role === 'OWNER' ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                          style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: member.role === 'EDITOR' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                            color: member.role === 'EDITOR' ? '#2563eb' : '#15803d',
                            border: '1px solid transparent',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="EDITOR" style={{ color: '#2563eb' }}>EDITOR</option>
                          <option value="VIEWER" style={{ color: '#15803d' }}>VIEWER</option>
                        </select>
                      ) : (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: member.role === 'EDITOR' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: member.role === 'EDITOR' ? '#2563eb' : '#15803d'
                        }}>
                          {member.role}
                        </span>
                      )}
                      
                      {role === 'OWNER' && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          title="Loại bỏ thành viên"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#d93025',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--google-gray-border)', paddingTop: '15px' }}>
              <button 
                onClick={() => setShowShareModal(false)}
                className="btn-logout"
                style={{ padding: '8px 20px' }}
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Component Wrapper quản lý việc tải thông tin tài liệu và khởi tạo Y.js/Websocket
function DocumentEditor({ token, documentId, profile, onBack, showToast }) {
  const [docDetails, setDocDetails] = useState(null)
  const [collabResource, setCollabResource] = useState(null)

  useEffect(() => {
    let active = true
    let provider = null
    let ydoc = null

    const fetchDetailsAndInit = async () => {
      try {
        const response = await fetch(`${API_URL}/api/documents/${documentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!active) return

        if (response.ok) {
          const data = await response.json()
          
          ydoc = new Y.Doc()
          
          provider = new WebsocketProvider(
            'ws://localhost:8080/ws/document',
            documentId,
            ydoc,
            {
              params: { token: token }
            }
          )
          
          const userColor = getRandomColor()
          provider.awareness.setLocalStateField('user', {
            name: `${profile.firstname} ${profile.lastname}`,
            color: userColor
          })

          setDocDetails(data)
          setCollabResource({ ydoc, provider })
        } else {
          showToast("Không thể tải thông tin tài liệu này", false)
          onBack()
        }
      } catch (err) {
        if (active) {
          showToast("Lỗi kết nối máy chủ", false)
          onBack()
        }
      }
    }

    fetchDetailsAndInit()

    return () => {
      active = false
      if (provider) {
        provider.disconnect()
      }
      if (ydoc) {
        ydoc.destroy()
      }
    }
  }, [documentId, token])

  if (!docDetails || !collabResource) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'white' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    )
  }

  return (
    <CollabEditor
      token={token}
      documentId={documentId}
      profile={profile}
      onBack={onBack}
      showToast={showToast}
      docDetails={docDetails}
      ydoc={collabResource.ydoc}
      wsProvider={collabResource.provider}
    />
  )
}

export default DocumentEditor
