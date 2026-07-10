import { useState, useEffect } from 'react'
import { User, Lock, Mail, Key, LogOut, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('login')
  const [isLoading, setIsLoading] = useState(false)
  const [toasts, setToasts] = useState([])
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [profile, setProfile] = useState(null)
  
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
    setProfile(null)
    showToast("Đã đăng xuất tài khoản!", true)
  }

  return (
    <div className="container">
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
        /* Authentication Card */
        <div className="card">
          <div className="logo-container">
            <h1 className="logo-text">Realtime Collab Docs</h1>
            <p className="logo-desc">Hệ thống quản lý và cộng tác tài liệu thời gian thực</p>
          </div>

          {!showOtpVerification ? (
            <>
              <div className="tabs">
                <div 
                  className={`tab ${activeTab === 'login' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('login')}
                >
                  Đăng nhập
                </div>
                <div 
                  className={`tab ${activeTab === 'register' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('register')}
                >
                  Đăng ký
                </div>
              </div>

              {activeTab === 'login' ? (
                /* Login Form */
                <form onSubmit={handleLogin}>
                  <div className="form-group">
                    <label className="label">Email</label>
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
                    {isLoading ? <div className="spinner"></div> : <>Đăng nhập <ArrowRight size={18} /></>}
                  </button>
                </form>
              ) : (
                /* Register Form */
                <form onSubmit={handleRegister}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="label">Họ (Lastname)</label>
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
                    <div className="form-group">
                      <label className="label">Tên (Firstname)</label>
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
                    {isLoading ? <div className="spinner"></div> : <>Đăng ký tài khoản <ArrowRight size={18} /></>}
                  </button>
                </form>
              )}
            </>
          ) : (
            /* OTP Verification Screen */
            <form onSubmit={handleVerifyAccount}>
              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Xác minh tài khoản</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
                  Hệ thống đã gửi một mã OTP kích hoạt tài khoản đến địa chỉ email: <strong style={{ color: 'white' }}>{registeredEmail}</strong>.
                </p>
              </div>

              <div className="form-group">
                <label className="label">Mã xác minh OTP</label>
                <div className="otp-group">
                  <div className="input-wrapper" style={{ flex: 1 }}>
                    <Key className="input-icon" size={18} />
                    <input 
                      type="text" 
                      placeholder="Nhập 6 ký tự số OTP" 
                      value={regOtp}
                      onChange={(e) => setRegOtp(e.target.value)}
                      required 
                    />
                  </div>
                  <button 
                    type="button" 
                    className="btn-otp" 
                    onClick={requestResendOtp}
                    disabled={otpCountdown > 0 || isOtpSending}
                  >
                    {isOtpSending ? "Đang gửi..." : otpCountdown > 0 ? `Gửi lại (${otpCountdown}s)` : "Gửi lại OTP"}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-submit" disabled={isLoading}>
                {isLoading ? <div className="spinner"></div> : <>Xác minh & Đăng nhập <ArrowRight size={18} /></>}
              </button>

              <button 
                type="button" 
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  width: '100%',
                  marginTop: '15px',
                  cursor: 'pointer'
                }}
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
      ) : (
        /* Dashboard Card */
        <div className="card">
          <div className="profile-container">
            <div className="avatar-glow">
              {((profile.firstname ? profile.firstname[0] : '') + (profile.lastname ? profile.lastname[0] : '')).toUpperCase() || 'U'}
            </div>
            <h2 style={{ fontSize: '22px', marginBottom: '5px' }}>{`${profile.firstname} ${profile.lastname}`}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '25px' }}>{profile.email}</p>

            <div className="profile-info">
              <div className="profile-info-row">
                <span className="info-label">Họ</span>
                <span className="info-val">{profile.lastname}</span>
              </div>
              <div className="profile-info-row">
                <span className="info-label">Tên</span>
                <span className="info-val">{profile.firstname}</span>
              </div>
              <div className="profile-info-row">
                <span className="info-label">Trạng thái</span>
                <span className="info-val">
                  <span className="badge">{profile.status}</span>
                </span>
              </div>
            </div>

            <button className="btn-logout" onClick={handleLogout}>
              <LogOut size={16} /> Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
