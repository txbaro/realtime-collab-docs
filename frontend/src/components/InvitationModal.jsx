import React, { useState, useEffect } from 'react'
import { Check, X, Shield, Clock, Mail, FileText, AlertCircle } from 'lucide-react'

function InvitationModal({ token, onClose, showToast, onRefreshDocuments }) {
  const [invitations, setInvitations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  const API_URL = 'http://localhost:8080'

  useEffect(() => {
    fetchInvitations()
  }, [])

  const fetchInvitations = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/documents/invitations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setInvitations(data)
      } else {
        showToast("Không thể tải danh sách lời mời", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ", false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = async (invitation) => {
    setActionLoadingId(invitation.id)
    try {
      const response = await fetch(`${API_URL}/api/documents/${invitation.documentId}/invitations/accept`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        showToast(`Đã tham gia cộng tác tài liệu "${invitation.documentTitle}"`, true)
        setInvitations(prev => prev.filter(item => item.id !== invitation.id))
        onRefreshDocuments()
      } else {
        showToast("Chấp nhận lời mời thất bại!", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ", false)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDecline = async (invitation) => {
    setActionLoadingId(invitation.id)
    try {
      const response = await fetch(`${API_URL}/api/documents/${invitation.documentId}/invitations/decline`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        showToast("Đã từ chối lời mời cộng tác", true)
        setInvitations(prev => prev.filter(item => item.id !== invitation.id))
      } else {
        showToast("Từ chối lời mời thất bại!", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ", false)
    } finally {
      setActionLoadingId(null)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.45)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--google-gray-border)',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '85vh',
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        position: 'relative'
      }}>
        
        {/* Header Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '500', color: 'var(--google-text-dark)' }}>Lời mời cộng tác</h3>
            <p style={{ fontSize: '13px', color: 'var(--google-text-muted)', marginTop: '4px' }}>
              Danh sách các tài liệu bạn được mời tham gia biên tập hoặc xem.
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--google-text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '200px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, height: '200px' }}>
              <div className="spinner"></div>
            </div>
          ) : invitations.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              flex: 1,
              padding: '40px 0',
              color: 'var(--google-text-muted)',
              textAlign: 'center'
            }}>
              <AlertCircle size={36} style={{ color: '#dadce0' }} />
              <div>
                <p style={{ fontWeight: '500', color: 'var(--google-text-dark)' }}>Không có lời mời nào</p>
                <p style={{ fontSize: '13px', marginTop: '4px' }}>Bạn sẽ thấy lời mời từ người khác xuất hiện ở đây.</p>
              </div>
            </div>
          ) : (
            invitations.map(inv => (
              <div 
                key={inv.id}
                style={{
                  background: '#f8f9fa',
                  border: '1px solid var(--google-gray-border)',
                  borderRadius: '6px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '15px'
                }}
              >
                {/* Thông tin lời mời */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} style={{ color: 'var(--google-blue)' }} />
                    <span style={{ fontWeight: '600', color: 'var(--google-text-dark)', fontSize: '15px' }}>
                      {inv.documentTitle}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: inv.role === 'EDITOR' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                      color: inv.role === 'EDITOR' ? '#2563eb' : '#15803d'
                    }}>
                      {inv.role === 'EDITOR' ? 'Chỉnh sửa' : 'Đọc duy nhất'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--google-text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={12} />
                      <span>Người mời: <strong>{inv.inviterName}</strong> ({inv.inviterEmail})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={12} />
                      <span>Nhận lúc: {formatDate(inv.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Các nút accept / decline */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    disabled={actionLoadingId !== null}
                    onClick={() => handleAccept(inv)}
                    style={{
                      background: 'var(--google-blue)',
                      border: 'none',
                      color: 'white',
                      borderRadius: '4px',
                      width: '38px',
                      height: '38px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--google-blue-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--google-blue)' }}
                    title="Đồng ý"
                  >
                    {actionLoadingId === inv.id ? (
                      <div className="spinner" style={{ width: '14px', height: '14px', borderTopColor: 'white' }}></div>
                    ) : (
                      <Check size={16} />
                    )}
                  </button>
                  
                  <button
                    disabled={actionLoadingId !== null}
                    onClick={() => handleDecline(inv)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid var(--google-gray-border)',
                      color: '#d93025',
                      borderRadius: '4px',
                      width: '38px',
                      height: '38px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(217, 48, 37, 0.08)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff' }}
                    title="Từ chối"
                  >
                    {actionLoadingId === inv.id ? (
                      <div className="spinner" style={{ width: '14px', height: '14px' }}></div>
                    ) : (
                      <X size={16} />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--google-gray-border)', paddingTop: '15px' }}>
          <button 
            onClick={onClose}
            className="btn-logout"
            style={{ padding: '8px 20px' }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

export default InvitationModal
