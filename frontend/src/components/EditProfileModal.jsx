import React, { useState } from 'react'
import { User, Lock, Mail, Key, Trash, AlertTriangle, X, ShieldAlert, Check } from 'lucide-react'

function EditProfileModal({ profile, token, onClose, showToast, onProfileUpdated, onLogout }) {
  const [firstname, setFirstname] = useState(profile.firstname || '')
  const [lastname, setLastname] = useState(profile.lastname || '')
  const [isLoading, setIsLoading] = useState(false)

  // States for Deactivate workflow
  const [showDeactivateOtp, setShowDeactivateOtp] = useState(false)
  const [deactivateOtp, setDeactivateOtp] = useState('')
  const [isDeactivatingLoading, setIsDeactivatingLoading] = useState(false)

  // States for Delete workflow
  const [showDeleteOtp, setShowDeleteOtp] = useState(false)
  const [deleteOtp, setDeleteOtp] = useState('')
  const [isDeletingLoading, setIsDeletingLoading] = useState(false)

  // States for Change Password workflow
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [isChangePwLoading, setIsChangePwLoading] = useState(false)
  const [pwOtp, setPwOtp] = useState('')
  const [isPwOtpRequested, setIsPwOtpRequested] = useState(false)
  const [isPwOtpVerified, setIsPwOtpVerified] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  const API_URL = 'http://localhost:8080'

  // Update name info
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!firstname.trim() || !lastname.trim()) {
      showToast("Họ và tên không được để trống!", false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstname: firstname.trim(),
          lastname: lastname.trim()
        })
      })

      if (response.ok) {
        showToast("Cập nhật thông tin cá nhân thành công!", true)
        onProfileUpdated(firstname.trim(), lastname.trim())
        onClose()
      } else {
        const errorText = await response.text()
        showToast(errorText || "Cập nhật thất bại!", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ!", false)
    } finally {
      setIsLoading(false)
    }
  }

  // Deactivate: request OTP
  const handleRequestDeactivateOtp = async () => {
    setIsDeactivatingLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/request-deactivate-otp`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const resText = await response.text()

      if (response.ok) {
        showToast("Mã OTP vô hiệu hóa tài khoản đã được gửi về email của bạn!", true)
        setShowDeactivateOtp(true)
        setShowDeleteOtp(false)
      } else {
        showToast(resText || "Yêu cầu gửi OTP thất bại!", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ!", false)
    } finally {
      setIsDeactivatingLoading(false)
    }
  }

  // Deactivate: confirm OTP
  const handleConfirmDeactivate = async (e) => {
    e.preventDefault()
    if (!deactivateOtp.trim()) {
      showToast("Vui lòng nhập mã OTP vô hiệu hóa!", false)
      return
    }

    setIsDeactivatingLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/deactivate-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: profile.email,
          otpCode: deactivateOtp.trim()
        })
      })

      if (response.ok) {
        showToast("Tài khoản của bạn đã được vô hiệu hóa tạm thời. Đang đăng xuất...", true)
        setTimeout(() => {
          onLogout()
          onClose()
        }, 1500)
      } else {
        const errorText = await response.text()
        showToast(errorText || "Xác nhận vô hiệu hóa thất bại!", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ!", false)
    } finally {
      setIsDeactivatingLoading(false)
    }
  }

  // Delete: request OTP
  const handleRequestDeleteOtp = async () => {
    if (!window.confirm("CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn tài khoản của bạn khỏi hệ thống và không thể khôi phục! Bạn có chắc chắn muốn tiếp tục?")) {
      return
    }

    setIsDeletingLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/request-delete-otp`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const resText = await response.text()

      if (response.ok) {
        showToast("CẢNH BÁO: Mã OTP xác nhận xóa tài khoản vĩnh viễn đã được gửi đến email của bạn!", true)
        setShowDeleteOtp(true)
        setShowDeactivateOtp(false)
      } else {
        showToast(resText || "Yêu cầu gửi OTP thất bại!", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ!", false)
    } finally {
      setIsDeletingLoading(false)
    }
  }

  // Delete: confirm OTP
  const handleConfirmDelete = async (e) => {
    e.preventDefault()
    if (!deleteOtp.trim()) {
      showToast("Vui lòng nhập mã OTP xác nhận xóa tài khoản!", false)
      return
    }

    setIsDeletingLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          otpCode: deleteOtp.trim()
        })
      })

      if (response.ok) {
        showToast("Tài khoản của bạn đã được xóa vĩnh viễn. Tự động chuyển hướng đăng xuất...", true)
        setTimeout(() => {
          onLogout()
          onClose()
        }, 1500)
      } else {
        const errorText = await response.text()
        showToast(errorText || "Mã OTP xác nhận xóa tài khoản không đúng!", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ!", false)
    } finally {
      setIsDeletingLoading(false)
    }
  }

  // Change PW Step 1: Request OTP
  const handleRequestPwOtp = async () => {
    setIsChangePwLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/request-password-otp`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const resText = await response.text()

      if (response.ok) {
        showToast("Mã OTP đổi mật khẩu đã được gửi về email của bạn!", true)
        setIsPwOtpRequested(true)
      } else {
        showToast(resText || "Yêu cầu gửi OTP thất bại!", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ!", false)
    } finally {
      setIsChangePwLoading(false)
    }
  }

  // Change PW Step 2: Verify OTP
  const handleVerifyPwOtp = async (e) => {
    e.preventDefault()
    if (!pwOtp.trim()) {
      showToast("Vui lòng nhập mã OTP!", false)
      return
    }

    setIsChangePwLoading(true)
    try {
      const response = await fetch(
        `${API_URL}/api/auth/verify-password-otp?email=${encodeURIComponent(profile.email)}&otp=${encodeURIComponent(pwOtp.trim())}`,
        { method: 'POST' }
      )

      const resText = await response.text()

      if (response.ok) {
        showToast("Xác thực OTP thành công! Vui lòng thiết lập mật khẩu mới.", true)
        setIsPwOtpVerified(true)
      } else {
        showToast(resText || "Mã OTP không chính xác hoặc đã hết hạn!", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ!", false)
    } finally {
      setIsChangePwLoading(false)
    }
  }

  // Change PW Step 3: Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!oldPassword) {
      showToast("Vui lòng nhập mật khẩu cũ!", false)
      return
    }
    if (!newPassword) {
      showToast("Vui lòng nhập mật khẩu mới!", false)
      return
    }
    if (newPassword.length < 6) {
      showToast("Mật khẩu mới phải có tối thiểu 6 ký tự!", false)
      return
    }
    if (newPassword !== confirmNewPassword) {
      showToast("Xác nhận mật khẩu mới không khớp!", false)
      return
    }

    setIsChangePwLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword: oldPassword,
          newPassword: newPassword,
          otpCode: pwOtp.trim()
        })
      })

      const resText = await response.text()

      if (response.ok) {
        showToast("Đổi mật khẩu thành công!", true)
        // Reset states
        setShowChangePassword(false)
        setIsPwOtpRequested(false)
        setIsPwOtpVerified(false)
        setPwOtp('')
        setOldPassword('')
        setNewPassword('')
        setConfirmNewPassword('')
      } else {
        showToast(resText || "Đổi mật khẩu thất bại!", false)
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ!", false)
    } finally {
      setIsChangePwLoading(false)
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
        maxWidth: '460px',
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
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

        {/* Tiêu đề popup */}
        <div style={{ textAlign: 'left' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '500', color: 'var(--google-text-dark)', margin: 0 }}>
            Thông tin cá nhân
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--google-text-muted)', marginTop: '4px' }}>
            Xem và chỉnh sửa thông tin hồ sơ của bạn, hoặc quản lý trạng thái tài khoản.
          </p>
        </div>

        {/* 1. Form cập nhật thông tin cá nhân */}
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderBottom: '1px solid var(--google-gray-border)', paddingBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label className="label">Họ</label>
              <div className="input-wrapper">
                <User className="input-icon" size={18} />
                <input 
                  type="text" 
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  placeholder="Họ của bạn"
                  required 
                />
              </div>
            </div>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label className="label">Tên</label>
              <div className="input-wrapper">
                <User className="input-icon" size={18} />
                <input 
                  type="text" 
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  placeholder="Tên của bạn"
                  required 
                />
              </div>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="label">Địa chỉ email</label>
            <div className="input-wrapper" style={{ opacity: 0.7 }}>
              <Mail className="input-icon" size={18} />
              <input 
                type="email" 
                value={profile.email} 
                disabled 
                style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-submit" 
            disabled={isLoading}
            style={{ 
              alignSelf: 'flex-end', 
              width: 'auto', 
              padding: '10px 24px', 
              margin: 0,
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isLoading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : <><Check size={16} /> Lưu thay đổi</>}
          </button>
        </form>

        {/* 1b. Phần đổi mật khẩu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--google-gray-border)', paddingBottom: '24px', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--google-text-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={16} style={{ color: 'var(--google-blue)' }} /> Đổi mật khẩu tài khoản
            </h4>
            {!showChangePassword && (
              <button 
                type="button"
                onClick={() => {
                  setShowChangePassword(true)
                  handleRequestPwOtp()
                }}
                className="btn-flat"
                style={{ fontSize: '13px', color: 'var(--google-blue)', padding: 0, height: 'auto', fontWeight: '500', cursor: 'pointer' }}
              >
                Đổi mật khẩu?
              </button>
            )}
          </div>

          {showChangePassword && (
            <div style={{ background: '#f8f9fa', border: '1px solid var(--google-gray-border)', borderRadius: '6px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!isPwOtpVerified ? (
                /* Step 1: Nhập OTP */
                <form onSubmit={handleVerifyPwOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '11.5px', color: 'var(--google-text-muted)', margin: 0, lineHeight: '1.4' }}>
                    {isPwOtpRequested ? `Mã OTP đã được gửi về email của bạn. Vui lòng nhập OTP để tiếp tục:` : `Đang gửi mã OTP đến email...`}
                  </p>
                  {isPwOtpRequested && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div className="input-wrapper" style={{ flex: 1 }}>
                        <Key className="input-icon" size={14} />
                        <input 
                          type="text" 
                          value={pwOtp} 
                          onChange={(e) => setPwOtp(e.target.value)} 
                          placeholder="Nhập mã OTP đổi mật khẩu" 
                          required 
                          style={{ padding: '8px 10px 8px 32px', fontSize: '13px' }}
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={isChangePwLoading}
                        style={{ 
                          fontSize: '12px', 
                          padding: '8px 14px', 
                          background: 'var(--google-blue)', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer' 
                        }}
                      >
                        {isChangePwLoading ? "Đang xử lý..." : "Tiếp tục"}
                      </button>
                    </div>
                  )}
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowChangePassword(false)
                      setIsPwOtpRequested(false)
                      setPwOtp('')
                    }}
                    className="btn-flat"
                    style={{ fontSize: '11px', alignSelf: 'flex-start', padding: 0, height: 'auto', marginTop: '4px', cursor: 'pointer' }}
                  >
                    Hủy bỏ
                  </button>
                </form>
              ) : (
                /* Step 2: Form đổi mật khẩu */
                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label" style={{ fontSize: '12px' }}>Mật khẩu cũ</label>
                    <div className="input-wrapper">
                      <Lock className="input-icon" size={14} />
                      <input 
                        type="password" 
                        value={oldPassword} 
                        onChange={(e) => setOldPassword(e.target.value)} 
                        placeholder="Nhập mật khẩu hiện tại" 
                        required 
                        style={{ padding: '8px 10px 8px 32px', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label" style={{ fontSize: '12px' }}>Mật khẩu mới</label>
                    <div className="input-wrapper">
                      <Lock className="input-icon" size={14} />
                      <input 
                        type="password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" 
                        required 
                        style={{ padding: '8px 10px 8px 32px', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label" style={{ fontSize: '12px' }}>Xác nhận mật khẩu mới</label>
                    <div className="input-wrapper">
                      <Lock className="input-icon" size={14} />
                      <input 
                        type="password" 
                        value={confirmNewPassword} 
                        onChange={(e) => setConfirmNewPassword(e.target.value)} 
                        placeholder="Nhập lại mật khẩu mới" 
                        required 
                        style={{ padding: '8px 10px 8px 32px', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowChangePassword(false)
                        setIsPwOtpRequested(false)
                        setIsPwOtpVerified(false)
                        setPwOtp('')
                        setOldPassword('')
                        setNewPassword('')
                        setConfirmNewPassword('')
                      }}
                      style={{ 
                        flex: 1,
                        fontSize: '12px', 
                        padding: '8px 14px', 
                        background: 'white', 
                        color: 'var(--google-text-dark)', 
                        border: '1px solid var(--google-gray-border)', 
                        borderRadius: '4px', 
                        cursor: 'pointer' 
                      }}
                    >
                      Hủy
                    </button>
                    <button 
                      type="submit" 
                      disabled={isChangePwLoading}
                      style={{ 
                        flex: 1,
                        fontSize: '12px', 
                        padding: '8px 14px', 
                        background: 'var(--google-blue)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer' 
                      }}
                    >
                      {isChangePwLoading ? "Đang lưu..." : "Đổi mật khẩu"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* 2. Khu vực quản lý tài khoản nhạy cảm (Danger Zone) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#b06000', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={16} /> Thiết lập bảo mật tài khoản
          </h4>

          {/* Vô hiệu hóa tài khoản */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff9e6', border: '1px solid #ffe89e', borderRadius: '6px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#b06000', margin: 0 }}>Vô hiệu hóa tài khoản tạm thời</p>
                <p style={{ fontSize: '11px', color: '#855100', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                  Tài khoản sẽ bị ẩn đi. Bạn có thể khôi phục lại khi đăng nhập hoặc liên hệ quản trị viên.
                </p>
              </div>
              {!showDeactivateOtp && (
                <button 
                  type="button" 
                  onClick={handleRequestDeactivateOtp} 
                  disabled={isDeactivatingLoading}
                  style={{ 
                    fontSize: '11.5px', 
                    padding: '6px 12px', 
                    background: '#fbbc05', 
                    color: '#202124',
                    border: '1px solid #d99c00',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isDeactivatingLoading ? "Đang gửi..." : "Vô hiệu hóa"}
                </button>
              )}
            </div>

            {showDeactivateOtp && (
              <form onSubmit={handleConfirmDeactivate} style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <div className="input-wrapper" style={{ flex: 1 }}>
                  <Key className="input-icon" size={14} />
                  <input 
                    type="text" 
                    value={deactivateOtp} 
                    onChange={(e) => setDeactivateOtp(e.target.value)} 
                    placeholder="Nhập OTP vô hiệu hóa" 
                    required 
                    style={{ padding: '8px 10px 8px 32px', fontSize: '13px' }}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isDeactivatingLoading}
                  style={{ 
                    fontSize: '12px', 
                    padding: '8px 14px', 
                    background: '#d99c00', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: 'pointer' 
                  }}
                >
                  {isDeactivatingLoading ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </form>
            )}
          </div>

          {/* Xóa tài khoản vĩnh viễn */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fce8e6', border: '1px solid #fad2cf', borderRadius: '6px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#c5221f', margin: 0 }}>Xóa tài khoản vĩnh viễn</p>
                <p style={{ fontSize: '11px', color: '#a51d1a', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                  Xóa toàn bộ thông tin cá nhân và quyền truy cập tài liệu. Hành động này **không thể khôi phục**.
                </p>
              </div>
              {!showDeleteOtp && (
                <button 
                  type="button" 
                  onClick={handleRequestDeleteOtp} 
                  disabled={isDeletingLoading}
                  style={{ 
                    fontSize: '11.5px', 
                    padding: '6px 12px', 
                    background: '#ea4335', 
                    color: 'white',
                    border: '1px solid #d93025',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isDeletingLoading ? "Đang gửi..." : "Xóa vĩnh viễn"}
                </button>
              )}
            </div>

            {showDeleteOtp && (
              <form onSubmit={handleConfirmDelete} style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <div className="input-wrapper" style={{ flex: 1 }}>
                  <Key className="input-icon" size={14} />
                  <input 
                    type="text" 
                    value={deleteOtp} 
                    onChange={(e) => setDeleteOtp(e.target.value)} 
                    placeholder="Nhập OTP xác nhận xóa" 
                    required 
                    style={{ padding: '8px 10px 8px 32px', fontSize: '13px', border: '1px solid #ea4335' }}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isDeletingLoading}
                  style={{ 
                    fontSize: '12px', 
                    padding: '8px 14px', 
                    background: '#c5221f', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: 'pointer' 
                  }}
                >
                  {isDeletingLoading ? "Đang xóa..." : "Xác nhận"}
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}

export default EditProfileModal
