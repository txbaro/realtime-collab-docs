import { useState, useEffect } from 'react'
import { User, Lock, Mail, Key, LogOut, CheckCircle2, AlertTriangle, ArrowRight, FileText } from 'lucide-react'
import DocumentList from './components/DocumentList'
import DocumentEditor from './components/DocumentEditor'
import InvitationModal from './components/InvitationModal'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('login')
  const [isLoading, setIsLoading] = useState(false)
  const [toasts, setToasts] = useState([])
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [profile, setProfile] = useState(null)
  
  // Điều hướng chọn tài liệu soạn thảo
  const [selectedDoc, setSelectedDoc] = useState(null)

  // Quản lý lời mời
  const [showInvitationsModal, setShowInvitationsModal] = useState(false)
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0)
  const [refreshDocsTrigger, setRefreshDocsTrigger] = useState(0)

  // OTP states
  const [showOtpVerification, setShowOtpVerification] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [isOtpSending, setIsOtpSending] = useState(false)

  // Form Inputs
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  
  const [regFirstname, setRegFirstname] = useState('')
  const [regLastname, setRegLastname] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regOtp, setRegOtp] = useState('')
  const [regPassword, setRegPassword] = useState('')

  const API_URL = 'http://localhost:8080' // Point explicitly to Spring Boot port 8080 during dev

  const fetchPendingInvitesCount = async () => {
    if (!token) return
    try {
      const response = await fetch(`${API_URL}/api/documents/invitations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setPendingInvitesCount(data.length)
      }
    } catch (err) {}
  }

  const showToast = (message, isSuccess = true) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, isSuccess }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  // Effect to load user profile on startup
  useEffect(() => {
    if (token) {
      loadUserProfile(token)
      fetchPendingInvitesCount()
    }
  }, [token])

  // OTP Countdown timer effect
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [otpCountdown])

  const loadUserProfile = async (authToken) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
      if (response.ok) {
        const user = await response.json()
        setProfile(user)
      } else {
        localStorage.removeItem('token')
        setToken('')
        setProfile(null)
      }
    } catch (err) {
      showToast("Không thể kết nối đến máy chủ để tải thông tin!", false)
    }
  }

  // Request new or Resend OTP
  const requestResendOtp = async () => {
    const emailToUse = showOtpVerification ? registeredEmail : regEmail
    if (!emailToUse) {
      showToast("Vui lòng nhập email hợp lệ!", false)
      return
    }

    setIsOtpSending(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/request-register-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse })
      })

      const resText = await response.text()

      if (response.ok) {
        showToast("Mã OTP mới đã được gửi về email của bạn!", true)
        setOtpCountdown(60)
      } else {
        showToast(resText || "Gửi OTP thất bại!", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ!", false)
    } finally {
      setIsOtpSending(false)
    }
  }

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('token', data.token)
        setToken(data.token)
        showToast("Đăng nhập thành công!", true)
      } else {
        const errorText = await response.text()
        showToast(errorText || "Sai tài khoản hoặc mật khẩu!", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ!", false)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Registration
  const handleRegister = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstname: regFirstname,
          lastname: regLastname,
          email: regEmail,
          password: regPassword
        })
      })

      const resText = await response.text()

      if (response.ok) {
        showToast("Đăng ký thành công! Vui lòng nhập mã OTP để kích hoạt.", true)
        setRegisteredEmail(regEmail)
        setShowOtpVerification(true)
        setOtpCountdown(60)
      } else {
        showToast(resText || "Đăng ký thất bại!", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ!", false)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Verification OTP
  const handleVerifyAccount = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registeredEmail,
          otpCode: regOtp
        })
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('token', data.token)
        setToken(data.token)
        showToast("Kích hoạt và đăng nhập thành công!", true)
        
        // Reset states
        setShowOtpVerification(false)
        setRegFirstname('')
        setRegLastname('')
        setRegEmail('')
        setRegOtp('')
        setRegPassword('')
      } else {
        const errorText = await response.text()
        showToast(errorText || "Mã OTP không hợp lệ!", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ!", false)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
    } catch (err) {}

    localStorage.removeItem('token')
    setToken('')
    setSelectedDoc(null)
    setProfile(null)
    showToast("Đã đăng xuất tài khoản!", true)
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.isSuccess ? 'toast-success' : 'toast-error'}`}>
            {toast.isSuccess ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {!profile ? (
        /* Authentication Screen (Google Account Style) */
        <div className="auth-page-container">
          <div className="auth-card">
            <div className="auth-logo-container">
              <FileText style={{ color: 'var(--google-blue)', width: '40px', height: '40px', marginBottom: '8px' }} />
              <h1 className="auth-title">Docs</h1>
              <p style={{ fontSize: '15px', color: 'var(--google-text-dark)', marginTop: '4px' }}>
                {showOtpVerification ? "Xác minh tài khoản" : activeTab === 'login' ? "Đăng nhập tài khoản" : "Tạo tài khoản Google"}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--google-text-muted)', marginTop: '4px' }}>
                để tiếp tục đến ứng dụng cộng tác tài liệu
              </p>
            </div>

            {!showOtpVerification ? (
              <>
                <div className="tabs" style={{ display: 'flex', borderBottom: '1px solid var(--google-gray-border)', marginBottom: '24px', padding: 0, background: 'none' }}>
                  <div 
                    className={`tab ${activeTab === 'login' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('login')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      cursor: 'pointer',
                      borderBottom: activeTab === 'login' ? '2px solid var(--google-blue)' : '2px solid transparent',
                      color: activeTab === 'login' ? 'var(--google-blue)' : 'var(--google-text-muted)',
                      fontWeight: activeTab === 'login' ? '600' : '400',
                      background: 'none',
                      boxShadow: 'none',
                      borderRadius: 0
                    }}
                  >
                    Đăng nhập
                  </div>
                  <div 
                    className={`tab ${activeTab === 'register' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('register')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      cursor: 'pointer',
                      borderBottom: activeTab === 'register' ? '2px solid var(--google-blue)' : '2px solid transparent',
                      color: activeTab === 'register' ? 'var(--google-blue)' : 'var(--google-text-muted)',
                      fontWeight: activeTab === 'register' ? '600' : '400',
                      background: 'none',
                      boxShadow: 'none',
                      borderRadius: 0
                    }}
                  >
                    Đăng ký
                  </div>
                </div>

                {activeTab === 'login' ? (
                  /* Login Form */
                  <form onSubmit={handleLogin}>
                    <div className="form-group">
                      <label className="label">Địa chỉ email</label>
                      <div className="input-wrapper">
                        <Mail className="input-icon" size={18} />
                        <input 
                          type="email" 
                          placeholder="example@gmail.com" 
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required 
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="label">Mật khẩu</label>
                      <div className="input-wrapper">
                        <Lock className="input-icon" size={18} />
                        <input 
                          type="password" 
                          placeholder="••••••••" 
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required 
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn-submit" disabled={isLoading}>
                      {isLoading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : <>Đăng nhập <ArrowRight size={18} /></>}
                    </button>
                  </form>
                ) : (
                  /* Register Form */
                  <form onSubmit={handleRegister}>
                    <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="label">Họ</label>
                        <div className="input-wrapper">
                          <User className="input-icon" size={18} />
                          <input 
                            type="text" 
                            placeholder="Nguyễn" 
                            value={regLastname}
                            onChange={(e) => setRegLastname(e.target.value)}
                            required 
                          />
                        </div>
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="label">Tên</label>
                        <div className="input-wrapper">
                          <User className="input-icon" size={18} />
                          <input 
                            type="text" 
                            placeholder="Văn A" 
                            value={regFirstname}
                            onChange={(e) => setRegFirstname(e.target.value)}
                            required 
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label className="label">Email</label>
                      <div className="input-wrapper">
                        <Mail className="input-icon" size={18} />
                        <input 
                          type="email" 
                          placeholder="example@gmail.com" 
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          required 
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="label">Mật khẩu</label>
                      <div className="input-wrapper">
                        <Lock className="input-icon" size={18} />
                        <input 
                          type="password" 
                          placeholder="Tối thiểu 6 ký tự" 
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          required 
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn-submit" disabled={isLoading}>
                      {isLoading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : <>Đăng ký tài khoản <ArrowRight size={18} /></>}
                    </button>
                  </form>
                )}
              </>
            ) : (
              /* OTP Verification Screen */
              <form onSubmit={handleVerifyAccount}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <p style={{ color: 'var(--google-text-muted)', fontSize: '13px', lineHeight: '1.5' }}>
                    Một mã OTP kích hoạt tài khoản đã được gửi đến email của bạn: <strong>{registeredEmail}</strong>.
                  </p>
                </div>

                <div className="form-group">
                  <label className="label">Mã xác minh OTP</label>
                  <div className="otp-group" style={{ display: 'flex', gap: '8px' }}>
                    <div className="input-wrapper" style={{ flex: 1 }}>
                      <Key className="input-icon" size={18} />
                      <input 
                        type="text" 
                        placeholder="Nhập OTP" 
                        value={regOtp}
                        onChange={(e) => setRegOtp(e.target.value)}
                        required 
                      />
                    </div>
                    <button 
                      type="button" 
                      className="btn-otp" 
                      style={{ height: 'auto', padding: '10px 16px' }}
                      onClick={requestResendOtp}
                      disabled={otpCountdown > 0 || isOtpSending}
                    >
                      {isOtpSending ? "Đang gửi..." : otpCountdown > 0 ? `Gửi lại (${otpCountdown}s)` : "Gửi lại OTP"}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-submit" disabled={isLoading}>
                  {isLoading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : <>Xác minh & Đăng nhập <ArrowRight size={18} /></>}
                </button>

                <button 
                  type="button" 
                  className="btn-flat"
                  style={{ width: '100%', marginTop: '12px' }}
                  onClick={() => {
                    setShowOtpVerification(false)
                    setActiveTab('register')
                  }}
                >
                  Quay lại màn hình Đăng ký
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* Dashboard & App Views (Google Drive / Google Docs Layout) */
        <div className="app-container">
          {selectedDoc ? (
            /* Trình soạn thảo tài liệu cộng tác */
            <DocumentEditor 
              token={token} 
              documentId={selectedDoc.id} 
              profile={profile} 
              onBack={() => {
                setSelectedDoc(null)
                setRefreshDocsTrigger(prev => prev + 1)
              }} 
              showToast={showToast} 
            />
          ) : (
            /* Dashboard chính & Danh sách tài liệu */
            <div className="dashboard-container">
              {/* Header profile người dùng */}
              <header className="dashboard-header">
                <div className="dashboard-title-area">
                  <FileText className="dashboard-logo-icon" style={{ width: '32px', height: '32px' }} />
                  <h1 className="dashboard-title" style={{ fontSize: '22px', fontWeight: '500', color: '#1f1f1f' }}>Docs</h1>
                </div>

                <div className="dashboard-user-area">
                  {/* Nút Lời mời cộng tác */}
                  <button 
                    onClick={() => setShowInvitationsModal(true)} 
                    style={{ 
                      width: 'auto', 
                      padding: '8px 16px', 
                      fontSize: '13px', 
                      background: 'rgba(11, 87, 208, 0.08)', 
                      color: 'var(--google-blue)', 
                      border: '1px solid rgba(11, 87, 208, 0.15)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(11, 87, 208, 0.15)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(11, 87, 208, 0.08)' }}
                  >
                    <Mail size={14} /> 
                    Lời mời {pendingInvitesCount > 0 && <span style={{ background: '#d93025', color: 'white', borderRadius: '10px', padding: '1px 6px', fontSize: '10px', marginLeft: '4px' }}>{pendingInvitesCount}</span>}
                  </button>

                  {/* Avatar & Email */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--google-gray-border)', paddingLeft: '12px' }}>
                    <div className="avatar-glow" style={{ width: '32px', height: '32px', fontSize: '13px', background: 'var(--google-blue)' }}>
                      {((profile.firstname ? profile.firstname[0] : '') + (profile.lastname ? profile.lastname[0] : '')).toUpperCase() || 'U'}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <h3 style={{ fontSize: '13px', color: 'var(--google-text-dark)', fontWeight: '600' }}>{profile.firstname} {profile.lastname}</h3>
                    </div>
                  </div>

                  <button className="btn-logout" onClick={handleLogout}>
                    <LogOut size={14} /> Đăng xuất
                  </button>
                </div>
              </header>

              {/* Danh sách tài liệu */}
              <DocumentList 
                token={token} 
                onSelectDocument={(doc) => setSelectedDoc(doc)} 
                showToast={showToast} 
                refreshTrigger={refreshDocsTrigger}
              />
            </div>
          )}
        </div>
      )}

      {showInvitationsModal && (
        <InvitationModal
          token={token}
          onClose={() => {
            setShowInvitationsModal(false)
            fetchPendingInvitesCount()
          }}
          showToast={showToast}
          onRefreshDocuments={() => {
            setRefreshDocsTrigger(prev => prev + 1)
          }}
        />
      )}
    </div>
  )
}

export default App
