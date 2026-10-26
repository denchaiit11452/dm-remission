import LoginForm from "./LoginForm";
import { parseLogoutReason, type LogoutReason } from "@/lib/auth/constants";
import { getInitialLockoutStatus } from "./actions";
import "./login.css";

export const metadata = {
  title: "เข้าสู่ระบบ | DM Remission DCPH",
  description: "ระบบติดตามผู้ป่วยเบาหวานในโปรแกรม Remission โรงพยาบาลดอนเจดีย์",
};

const REASON_MESSAGES: Record<LogoutReason, string> = {
  timeout: "ออกจากระบบอัตโนมัติ เนื่องจากไม่มีการใช้งานเกิน 30 นาที กรุณาเข้าสู่ระบบอีกครั้ง",
  disabled: "บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
  noprofile: "ยังไม่พบโปรไฟล์ผู้ใช้ กรุณาติดต่อผู้ดูแลระบบ",
};

/* Droplet Icon with gradient or solid fill */
function DropletLogo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="dropGrad" x1="12" y1="8" x2="36" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00BFA6" />
          <stop offset="100%" stopColor="#0B5ED7" />
        </linearGradient>
      </defs>
      <path
        d="M24 6 C24 6 12 19 12 28.5 C12 35.1 17.4 40.5 24 40.5 C30.6 40.5 36 35.1 36 28.5 C36 19 24 6 24 6 Z"
        fill="url(#dropGrad)"
      />
      <ellipse cx="20" cy="22" rx="3" ry="6" transform="rotate(-30 20 22)" fill="white" opacity="0.35" />
    </svg>
  );
}

function SmallDropIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.8s4.2 4.5 4.2 7.4A4.2 4.2 0 0 1 8 13.4a4.2 4.2 0 0 1-4.2-4.2C3.8 6.3 8 1.8 8 1.8z"
        fill={color}
      />
    </svg>
  );
}

function ShieldCheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ChartTrendIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function HeartPulseIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const notice = reason ? REASON_MESSAGES[parseLogoutReason(reason)] : null;
  const initialLockout = await getInitialLockoutStatus();

  return (
    <div className="lp-root">
      <main className="lp-main">
        {/* ── Left Hero Section (Medical Photo + Brand Graphics) ────── */}
        <section className="lp-hero-section" aria-label="ข้อมูลแบรนด์ DM Remission">
          {/* Background photograph */}
          <div className="lp-hero-bg-container">
            <img
              src="/login-hero.jpg"
              alt="คณะแพทย์และพยาบาลโรงพยาบาลดอนเจดีย์"
              className="lp-hero-bg-img"
            />
            <div className="lp-hero-overlay-top" />
            <div className="lp-hero-overlay-right" />
          </div>

          {/* Top Brand Title & Pill Badge */}
          <div className="lp-hero-top">
            <div className="lp-hero-title-group">
              <h1 className="lp-hero-title">
                DM Remission <span className="lp-hero-title-teal">DCPH</span>
              </h1>
              <p className="lp-hero-subtitle">
                ติดตาม ดูแล ป้องกัน เพื่อการหายได้อย่างยั่งยืน
              </p>
            </div>
            <div className="lp-hero-badge">
              <span className="lp-hero-badge-icon">
                <ShieldCheckIcon size={14} />
              </span>
              <span>ระบบติดตามผู้ป่วยเบาหวานในโปรแกรม Remission</span>
            </div>
          </div>

          {/* Floating Medical Badges */}
          <div className="lp-floating-badge lp-floating-badge--drop" title="การติดตามระดับน้ำตาลในเลือด">
            <SmallDropIcon size={24} color="#0B5ED7" />
          </div>
          <div className="lp-floating-badge lp-floating-badge--chart" title="แนวโน้มสุขภาพและการฟื้นตัว">
            <ChartTrendIcon size={24} />
          </div>
          <div className="lp-floating-badge lp-floating-badge--heart" title="การดูแลหัวใจและสุขภาพองค์รวม">
            <HeartPulseIcon size={24} />
          </div>

          {/* Bottom Wave Graphic with Slogan */}
          <div className="lp-hero-wave-container">
            <svg
              className="lp-hero-wave-svg"
              viewBox="0 0 900 240"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="waveGradBack" x1="0" y1="0" x2="900" y2="240" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#00BFA6" stopOpacity="0.75" />
                  <stop offset="50%" stopColor="#0B5ED7" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#03459c" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="waveGradFront" x1="0" y1="50" x2="900" y2="240" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#00BFA6" stopOpacity="0.9" />
                  <stop offset="60%" stopColor="#0B5ED7" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#073b7d" stopOpacity="0.95" />
                </linearGradient>
              </defs>
              <path
                d="M0 120 C180 60 340 180 540 100 C680 40 780 140 900 90 L900 240 L0 240 Z"
                fill="url(#waveGradBack)"
              />
              <path
                d="M0 150 C200 90 320 200 500 130 C660 70 760 170 900 120 L900 240 L0 240 Z"
                fill="url(#waveGradFront)"
              />
            </svg>
          </div>

          <div className="lp-hero-bottom-slogan">
            <p className="lp-hero-slogan-text">
              ข้อมูลครบ ดูแลทันเวลา<br />
              <span className="lp-hero-slogan-sub">เพื่อสุขภาพที่ดีกว่า</span>
            </p>
          </div>
        </section>

        {/* ── Right Section (Login Card) ────────────────────────────── */}
        <section className="lp-form-section" aria-label="แบบฟอร์มเข้าสู่ระบบ">
          <div className="lp-card">
            {/* Brand Logo Header */}
            <div className="lp-card-header">
              <div className="lp-card-logo-icon">
                <img
                  src="/logo.png"
                  alt="โลโก้โรงพยาบาลสมเด็จพระยุพราช เด่นชัย"
                  className="lp-card-logo-img"
                />
              </div>
              <h2 className="lp-card-brand-title">
                DM Remission <span>DCPH</span>
              </h2>
              <p className="lp-card-brand-subtitle">
                ติดตาม ดูแล ป้องกัน เพื่อการหายได้อย่างยั่งยืน
              </p>
            </div>

            {/* Form Section Intro */}
            <div className="lp-card-intro">
              <h3 className="lp-card-title">เข้าสู่ระบบ</h3>
              <p className="lp-card-desc">สำหรับบุคลากรภายในโรงพยาบาลเท่านั้น</p>
            </div>

            {/* Logout / Session Notice if redirected */}
            {notice ? (
              <div role="status" className="lp-alert lp-alert--warning">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="lp-alert-icon">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M8 5v3.5M8 11v.01" />
                </svg>
                <span>{notice}</span>
              </div>
            ) : null}

            {/* Interactive Form */}
            <LoginForm initialLockout={initialLockout} />

            {/* PDPA Health Data Security Notice */}
            <div className="lp-pdpa-box">
              <div className="lp-pdpa-icon">
                <ShieldCheckIcon size={16} />
              </div>
              <p className="lp-pdpa-text">
                ข้อมูลสุขภาพของผู้ป่วยอยู่ภายใต้ PDPA<br />
                และมีการรักษาความปลอดภัยอย่างเข้มงวด
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Bottom Dark Status / Brand Bar ──────────────────────────── */}
      <footer className="lp-footer-bar">
        <div className="lp-footer-left">
          <span className="lp-footer-drop">
            <SmallDropIcon size={14} color="#00BFA6" />
          </span>
          <span className="lp-footer-brand-name">DM Remission DCPH</span>
          <span className="lp-footer-sep">|</span>
          <span>โรงพยาบาลสมเด็จพระยุพราชเด่นชัย</span>
        </div>
      </footer>
    </div>
  );
}
