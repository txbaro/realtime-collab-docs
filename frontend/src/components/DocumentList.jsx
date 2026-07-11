import React, { useState, useEffect } from 'react'
import { Plus, Trash2, FileText, X, AlertCircle } from 'lucide-react'

function DocumentList({ token, onSelectDocument, showToast, refreshTrigger }) {
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Sub-tabs: 'mine' (Tài liệu của tôi) hoặc 'shared' (Được mời tham gia)
  const [activeSubTab, setActiveSubTab] = useState('mine')

  // Popup hỏi tiêu đề khi nhấn nút "+"
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const API_URL = 'http://localhost:8080'

  useEffect(() => {
    fetchDocuments()
  }, [refreshTrigger])

  const fetchDocuments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setDocuments(data)
      } else {
        showToast("Không thể tải danh sách tài liệu", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ", false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateDocument = async (e) => {
    if (e) e.preventDefault()
    
    const docTitle = newTitle.trim() || 'Tài liệu không có tiêu đề'
    setIsCreating(true)

    try {
      const initialContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph'
          }
        ]
      }

      const response = await fetch(`${API_URL}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: docTitle,
          content: initialContent
        })
      })

      if (response.ok) {
        const newDoc = await response.json()
        showToast("Tạo tài liệu mới thành công!", true)
        setNewTitle('')
        setShowCreateDialog(false)
        
        // Mở thẳng tài liệu vừa tạo trong Editor
        onSelectDocument(newDoc)
      } else {
        const errorText = await response.text()
        showToast(errorText || "Tạo tài liệu thất bại", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ", false)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteDocument = async (id, title, e) => {
    e.stopPropagation()
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu "${title}" không?`)) return

    try {
      const response = await fetch(`${API_URL}/api/documents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        showToast("Đã xóa tài liệu thành công!", true)
        fetchDocuments()
      } else {
        showToast("Xóa tài liệu thất bại", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ", false)
    }
  }

  // Lọc tài liệu theo tab phụ
  const filteredDocs = documents.filter(doc => {
    if (activeSubTab === 'mine') {
      return doc.role === 'OWNER'
    } else {
      return doc.role !== 'OWNER'
    }
  })

  return (
    <div style={{ width: '100%' }}>
      
      {/* Banner bắt đầu tài liệu mới kiểu Google Docs */}
      <section className="new-doc-section">
        <div className="new-doc-content">
          <h4 className="section-title">Bắt đầu tài liệu mới</h4>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div 
              className="blank-template-card"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="plus-icon-color" />
            </div>
            <span className="template-label">Trang trống</span>
          </div>
        </div>
      </section>

      {/* Danh sách tài liệu Drive Style */}
      <section className="doc-list-section">
        
        {/* Navigation Tabs tối giản giống Google Drive */}
        <div style={{ 
          display: 'flex', 
          gap: '24px', 
          borderBottom: '1px solid var(--google-gray-border)', 
          marginBottom: '20px',
          alignItems: 'center'
        }}>
          <button
            onClick={() => setActiveSubTab('mine')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeSubTab === 'mine' ? '3px solid var(--google-blue)' : '3px solid transparent',
              color: activeSubTab === 'mine' ? 'var(--google-blue)' : 'var(--google-text-muted)',
              fontWeight: activeSubTab === 'mine' ? '600' : '500',
              fontSize: '14px',
              padding: '10px 4px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Tài liệu của tôi
          </button>
          <button
            onClick={() => setActiveSubTab('shared')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeSubTab === 'shared' ? '3px solid var(--google-blue)' : '3px solid transparent',
              color: activeSubTab === 'shared' ? 'var(--google-blue)' : 'var(--google-text-muted)',
              fontWeight: activeSubTab === 'shared' ? '600' : '500',
              fontSize: '14px',
              padding: '10px 4px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Được mời tham gia
          </button>
        </div>

        {/* Header của Table phẳng */}
        <div className="doc-table-header">
          <span style={{ flex: 3, textAlign: 'left' }}>Tên tệp</span>
          <span style={{ flex: 2, textAlign: 'left' }}>Quyền hạn của bạn</span>
          <span style={{ flex: 2, textAlign: 'left' }}>Sửa đổi lần cuối</span>
          <span style={{ width: '80px', textAlign: 'center' }}>Thao tác</span>
        </div>

        {/* Body danh sách tài liệu */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner"></div>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 0', 
            color: 'var(--google-text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <FileText size={48} style={{ color: '#dadce0' }} />
            <div>
              <p style={{ fontWeight: '500', color: 'var(--google-text-dark)' }}>
                {activeSubTab === 'mine' ? "Bạn chưa sở hữu tài liệu nào" : "Bạn chưa được mời tham gia tài liệu nào"}
              </p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>
                {activeSubTab === 'mine' 
                  ? "Bấm vào biểu tượng dấu cộng ở trên để tạo tài liệu mới." 
                  : "Khi người khác mời bạn cộng tác vào tài liệu của họ, chúng sẽ xuất hiện ở đây."
                }
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--google-gray-border)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--google-text-dark)',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                {/* Cột tên (Hiển thị thông tin Owner nếu ở tab Được mời tham gia) */}
                <div style={{ flex: 3, display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left', overflow: 'hidden' }}>
                  <FileText size={18} style={{ color: 'var(--google-blue)', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', overflow: 'hidden' }}>
                    <span style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.title}
                    </span>
                    {activeSubTab === 'shared' && (
                      <span style={{ fontSize: '11px', color: 'var(--google-text-muted)', marginTop: '3px' }}>
                        Chủ sở hữu: <strong>{doc.ownerName}</strong> ({doc.ownerEmail})
                      </span>
                    )}
                  </div>
                </div>

                {/* Cột Role */}
                <div style={{ flex: 2, textAlign: 'left' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: doc.role === 'OWNER' ? 'rgba(11, 87, 208, 0.08)' : doc.role === 'EDITOR' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                    color: doc.role === 'OWNER' ? 'var(--google-blue)' : doc.role === 'EDITOR' ? '#2563eb' : '#15803d'
                  }}>
                    {doc.role === 'OWNER' ? 'Chủ sở hữu' : doc.role === 'EDITOR' ? 'Được sửa' : 'Được xem'}
                  </span>
                </div>

                {/* Cột thời gian */}
                <div style={{ flex: 2, textAlign: 'left', color: 'var(--google-text-muted)', fontSize: '13px' }}>
                  {new Date(doc.updatedAt).toLocaleDateString('vi-VN', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </div>

                {/* Thao tác (Chỉ hiển thị nút Xóa đối với tài liệu của bản thân) */}
                <div style={{ width: '80px', display: 'flex', justifyContent: 'center' }}>
                  {activeSubTab === 'mine' ? (
                    <button
                      onClick={(e) => handleDeleteDocument(doc.id, doc.title, e)}
                      title="Xóa tài liệu"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--google-text-muted)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(217, 48, 37, 0.08)'; e.currentTarget.style.color = '#d93025' }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--google-text-muted)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <span style={{ color: 'var(--google-text-muted)', fontSize: '14px' }}>—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Popup Dialog hỏi tiêu đề tạo tài liệu mới */}
      {showCreateDialog && (
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
            maxWidth: '420px',
            padding: '30px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '500', color: 'var(--google-text-dark)' }}>
                Tạo tài liệu mới
              </h3>
              <button 
                onClick={() => setShowCreateDialog(false)}
                style={{ background: 'none', border: 'none', color: 'var(--google-text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Tiêu đề tài liệu</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Báo cáo công việc..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{ paddingLeft: '14px' }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowCreateDialog(false)} 
                  className="btn-flat"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="btn-submit" 
                  disabled={isCreating}
                  style={{ width: 'auto', marginTop: 0 }}
                >
                  {isCreating ? "Đang tạo..." : "Tạo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentList
