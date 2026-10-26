"use client";

import { useActionState, useState, useEffect } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

function UserIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="lp-spinner" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M10 2a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

type LoginFormProps = {
  initialLockout?: {
    isLocked: boolean;
    lockedUntil?: number;
  };
};

export default function LoginForm({ initialLockout }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Target timestamp in ms when the lockout ends
  const effectiveLockedUntil = state.lockedUntil ?? initialLockout?.lockedUntil ?? null;

  // Remaining seconds calculated from client Date.now() vs lockedUntil timestamp
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (effectiveLockedUntil) {
      return Math.max(0, Math.ceil((effectiveLockedUntil - Date.now()) / 1000));
    }
    return 0;
  });

  // Keep remainingSeconds in sync whenever effectiveLockedUntil changes
  useEffect(() => {
    if (effectiveLockedUntil) {
      const diff = Math.max(0, Math.ceil((effectiveLockedUntil - Date.now()) / 1000));
      setRemainingSeconds(diff);
    } else {
      setRemainingSeconds(0);
    }
  }, [effectiveLockedUntil]);

  // Real-time countdown timer
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      if (effectiveLockedUntil) {
        const diff = Math.max(0, Math.ceil((effectiveLockedUntil - Date.now()) / 1000));
        setRemainingSeconds(diff);
      } else {
        setRemainingSeconds((prev) => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, effectiveLockedUntil]);

  const isLocked = (state.isLocked || (initialLockout?.isLocked ?? false)) && remainingSeconds > 0;

  // Format MM:SS
  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <form action={formAction} className="lp-form" noValidate>
        {/* Username / Email field */}
        <div className="lp-field">
          <span className="lp-field-icon">
            <UserIcon />
          </span>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            defaultValue={state.email ?? ""}
            key={state.email}
            placeholder="ชื่อผู้ใช้ หรือ อีเมล"
            className="lp-input"
            disabled={pending || isLocked}
          />
        </div>

        {/* Password field */}
        <div className="lp-field">
          <span className="lp-field-icon">
            <LockIcon />
          </span>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="รหัสผ่าน"
            className="lp-input lp-input--password"
            disabled={pending || isLocked}
          />
          <button
            type="button"
            className="lp-password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            tabIndex={-1}
            disabled={isLocked}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>

        {/* Remember me option */}
        <div className="lp-form-options">
          <label className="lp-checkbox-label">
            <input
              type="checkbox"
              name="remember"
              className="lp-checkbox"
              defaultChecked
              disabled={isLocked}
            />
            <span>จดจำการเข้าสู่ระบบ</span>
          </label>
        </div>

        {/* Countdown lockout alert or regular error message */}
        {isLocked ? (
          <div role="alert" className="lp-alert lp-alert--error lp-lockout-banner">
            <div className="lp-lockout-icon">
              <ClockIcon />
            </div>
            <div className="lp-lockout-content">
              <div className="lp-lockout-title">
                เข้าสู่ระบบไม่ถูกต้องครบ 3 ครั้ง
              </div>
              <div className="lp-lockout-desc">
                ระบบระงับการเข้าใช้งานชั่วคราว กรุณารอเวลาถอยหลัง
              </div>
              <div className="lp-lockout-timer">
                สามารถลองใหม่ได้ในอีก: <strong>{formatCountdown(remainingSeconds)} นาที</strong>
              </div>
            </div>
          </div>
        ) : state.error ? (
          <div role="alert" className="lp-alert lp-alert--error">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="lp-alert-icon">
              <circle cx="8" cy="8" r="6" />
              <path d="M8 5v3.5M8 11v.01" />
            </svg>
            <span>{state.error}</span>
          </div>
        ) : null}

        {/* Submit button */}
        <button
          type="submit"
          disabled={pending || isLocked}
          className="lp-btn-submit"
        >
          {pending ? (
            <>
              <Spinner />
              กำลังเข้าสู่ระบบ...
            </>
          ) : isLocked ? (
            <>
              <ClockIcon />
              รอเวลา {formatCountdown(remainingSeconds)}
            </>
          ) : (
            <>
              เข้าสู่ระบบ
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="lp-btn-arrow">
                <path d="M4 10h12M11 5l5 5-5 5" />
              </svg>
            </>
          )}
        </button>

        {/* Forgot password link */}
        <div className="lp-forgot-link-wrap">
          <button
            type="button"
            className="lp-forgot-link"
            onClick={() => setShowForgotModal(true)}
          >
            ลืมรหัสผ่าน ?
          </button>
        </div>
      </form>

      {/* Forgot Password Help Dialog */}
      {showForgotModal && (
        <div className="lp-modal-backdrop" onClick={() => setShowForgotModal(false)}>
          <div className="lp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lp-modal-icon">
              <LockIcon />
            </div>
            <h3 className="lp-modal-title">ลืมรหัสผ่าน</h3>
            <p className="lp-modal-desc">
              ระบบนี้เป็นระบบเฉพาะสำหรับบุคลากรทางการแพทย์ หากท่านลืมรหัสผ่านหรือต้องการรีเซ็ตสิทธิ์การเข้าใช้งาน กรุณาติดต่อ<strong>กลุ่มงานเทคโนโลยีสารสนเทศทางการแพทย์ (IT) โรงพยาบาลสมเด็จพระยุพราชเด่นชัย</strong>
            </p>
            <button
              type="button"
              className="lp-modal-btn"
              onClick={() => setShowForgotModal(false)}
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}
    </>
  );
}
