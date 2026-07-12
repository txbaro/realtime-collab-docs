import React, { useState } from 'react'
import { Mail, Key, Lock, ArrowRight, ArrowLeft, X, CheckCircle2 } from 'lucide-react'

function ForgotPasswordModal({ onClose, showToast }) {
  const [step, setStep] = useState('EMAIL') // EMAIL -> OTP -> PASSWORD -> SUCCESS
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const API_URL = 'http://localhost:8080'

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      showToast("Vui lòng nhập địa chỉ email!", false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/request-password-otp?email=${encodeURIComponent(email.trim())}`, {
        method: 'POST'
      })

      const resText = await response.text()

      if (response.ok) {
        showToast("Mã OTP khôi phục mật khẩu đã được gửi đến email của bạn!", true)
        setStep('OTP')
      } else {
        showToast(resText || "Gửi mã OTP thất bại!", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ!", false)
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otpCode.trim()) {
      showToast("Vui lòng nhập mã OTP!", false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `${API_URL}/api/auth/verify-password-otp?email=${encodeURIComponent(email.trim())}&otp=${encodeURIComponent(otpCode.trim())}`,
        { method: 'POST' }
      )

      const resText = await response.text()

      if (response.ok) {
        showToast("Xác thực OTP thành công! Vui lòng nhập mật khẩu mới.", true)
        setStep('PASSWORD')
      } else {
        showToast(resText || "Mã OTP không đúng hoặc đã hết hạn!", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ!", false)
    } finally {
      setIsLoading(false)
    }
  }

  // Step 3: Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!newPassword) {
      showToast("Vui lòng nhập mật khẩu mới!", false)
      return
    }
    if (newPassword.length < 6) {
      showToast("Mật khẩu mới phải có tối thiểu 6 ký tự!", false)
      return
    }
    if (newPassword !== confirmPassword) {
      showToast("Xác nhận mật khẩu mới không khớp!", false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otpCode: otpCode.trim(),
          newPassword: newPassword
        })
      })

      const resText = await response.text()

      if (response.ok) {
        showToast("Đổi mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.", true)
        setStep('SUCCESS')
      } else {
        showToast(resText || "Lỗi đổi mật khẩu!", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ!", false)
    } finally {
      setIsLoading(false)
    }
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
        maxWidth: '420px',
        padding: '36px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        position: 'relative'
      }}>
        {/* Nút Đóng Modal */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--google-text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f3f4' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <X size={20} />
        </button>

        {/* Cột Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
          <Mail style={{ color: 'var(--google-blue)', width: '36px', height: '36px', marginBottom: '8px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '500', color: 'var(--google-text-dark)', margin: 0 }}>
            {step === 'EMAIL' && "Khôi phục mật khẩu"}
            {step === 'OTP' && "Xác minh OTP"}
            {step === 'PASSWORD' && "Đặt mật khẩu mới"}
            {step === 'SUCCESS' && "Hoàn thành!"}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--google-text-muted)', marginTop: '6px', textAlign: 'center', lineHeight: '1.4' }}>
            {step === 'EMAIL' && "Nhập email tài khoản của bạn để nhận mã xác minh OTP."}
            {step === 'OTP' && <>Một mã OTP đã được gửi đến email:<br /><strong>{email}</strong></>}
            {step === 'PASSWORD' && "Thiết lập mật khẩu mới cho tài khoản của bạn."}
            {step === 'SUCCESS' && "Tài khoản của bạn đã được đặt lại mật khẩu mới thành công."}
          </p>
        </div>

        {step === 'EMAIL' && (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="label">Địa chỉ email</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input 
                  type="email" 
                  placeholder="example@gmail.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  autoFocus
                />
              </div>
            </div>
            <button type="submit" className="btn-submit" disabled={isLoading} style={{ width: '100%' }}>
              {isLoading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : <>Gửi mã OTP <ArrowRight size={18} /></>}
            </button>
          </form>
        )}

        {step === 'OTP' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="label">Mã xác minh OTP</label>
              <div className="input-wrapper">
                <Key className="input-icon" size={18} />
                <input 
                  type="text" 
                  placeholder="Nhập mã OTP gồm 6 chữ số" 
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required 
                  autoFocus
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button" 
                className="btn-flat" 
                style={{ flex: 1, border: '1px solid var(--google-gray-border)', borderRadius: '4px', height: '42px', cursor: 'pointer' }}
                onClick={() => setStep('EMAIL')}
                disabled={isLoading}
              >
                <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Quay lại
              </button>
              <button type="submit" className="btn-submit" disabled={isLoading} style={{ flex: 1, margin: 0 }}>
                {isLoading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : <>Tiếp tục <ArrowRight size={16} /></>}
              </button>
            </div>
          </form>
        )}

        {step === 'PASSWORD' && (
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="label">Mật khẩu mới</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input 
                  type="password" 
                  placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required 
                  autoFocus
                />
              </div>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="label">Xác nhận mật khẩu mới</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input 
                  type="password" 
                  placeholder="Nhập lại mật khẩu mới" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required 
                />
              </div>
            </div>
            <button type="submit" className="btn-submit" disabled={isLoading} style={{ width: '100%', margin: 0 }}>
              {isLoading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : <>Xác nhận đổi mật khẩu <ArrowRight size={18} /></>}
            </button>
          </form>
        )}

        {step === 'SUCCESS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <CheckCircle2 size={48} style={{ color: '#1e8e3e', marginBottom: '8px' }} />
            <button 
              type="button" 
              className="btn-submit" 
              style={{ width: '100%', margin: 0 }}
              onClick={onClose}
            >
              Đăng nhập ngay
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ForgotPasswordModal
