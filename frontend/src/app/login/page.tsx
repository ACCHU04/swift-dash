"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3, Eye, EyeOff, ArrowRight,
  Sparkles, TrendingUp, Database, Zap,
} from "lucide-react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

const googleProvider = new GoogleAuthProvider();

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/");
    });
    return () => unsubscribe();
  }, [router]);

  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/");
    } catch (err: any) {
      const msg = err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password"
        ? "Invalid email or password."
        : err?.code === "auth/user-not-found"
        ? "No account found with this email."
        : err?.code === "auth/too-many-requests"
        ? "Too many attempts. Please try again later."
        : "Login failed. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.replace("/");
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        setError("Google sign-in failed. Please try again.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const stats = [
    { icon: TrendingUp, label: "Revenue tracked", value: "$2.4M+" },
    { icon: Database, label: "Data points", value: "1M+" },
    { icon: Zap, label: "Queries answered", value: "50K+" },
  ];

  return (
    <div className="login-shell">
      {/* ── Left: Form ── */}
      <div className="login-form-side">
        <div className="login-form-inner">

          <div className="login-logo">
            <div className="login-logo-icon">
              <BarChart3 size={20} color="#fff" />
            </div>
            <span className="login-logo-text">AI Dashboard</span>
          </div>

          <div className="login-heading">
            <h1>Welcome back</h1>
            <p>Sign in to access your analytics workspace</p>
          </div>

          {/* Google Button */}
          <button
            type="button"
            className="login-google-btn"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading || isSubmitting}
          >
            {isGoogleLoading ? (
              <span className="login-spinner" style={{ borderTopColor: "#4285F4" }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            {isGoogleLoading ? "Signing in..." : "Continue with Google"}
          </button>

          <div className="login-divider">
            <span />
            <p>or sign in with email</p>
            <span />
          </div>

          <form onSubmit={handleEmailSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <div className="login-field-header">
                <label htmlFor="password">Password</label>
                <a href="/forgot-password" className="login-forgot">Forgot password?</a>
              </div>
              <div className="login-password-wrap">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-submit" disabled={isSubmitting || isGoogleLoading}>
              {isSubmitting ? <span className="login-spinner" /> : <>Sign in <ArrowRight size={15} /></>}
            </button>
          </form>

          <p className="login-signup">
            Don&apos;t have an account?{" "}
            <a href="/register">Create one free</a>
          </p>
        </div>
      </div>

      {/* ── Right: Visual ── */}
      <div className="login-visual-side">
        <div className="login-visual-inner">
          <div className="login-visual-badge">
            <Sparkles size={13} />
            AI-powered analytics
          </div>
          <h2 className="login-visual-heading">
            Turn questions into<br />
            <span>instant insights</span>
          </h2>
          <p className="login-visual-sub">
            Ask anything about your data in plain English. Get interactive charts,
            SQL-backed answers, and executive summaries in seconds.
          </p>
          <div className="login-stats">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="login-stat">
                <div className="login-stat-icon"><Icon size={14} /></div>
                <div>
                  <p className="login-stat-value">{value}</p>
                  <p className="login-stat-label">{label}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="login-demo">
            <div className="login-demo-msg user">Show monthly revenue by region</div>
            <div className="login-demo-msg assistant">
              <span className="login-demo-dot" />
              Generated 3 charts · 6 insights · confidence 94%
            </div>
            <div className="login-demo-msg user">Switch to donut chart</div>
            <div className="login-demo-msg assistant">
              <span className="login-demo-dot" />
              Converted to donut view instantly
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .login-shell { display:flex; height:100vh; width:100%; overflow:hidden; position:relative; z-index:1; }
        .login-form-side { width:46%; min-width:400px; display:flex; align-items:center; justify-content:center; padding:48px 40px; border-right:1px solid rgba(255,255,255,0.07); background:rgba(5,8,24,0.6); backdrop-filter:blur(12px); overflow-y:auto; }
        .login-form-inner { width:100%; max-width:380px; display:flex; flex-direction:column; gap:22px; }
        .login-logo { display:flex; align-items:center; gap:10px; }
        .login-logo-icon { width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg,#7c3aed,#4f46e5); display:flex; align-items:center; justify-content:center; box-shadow:0 0 20px rgba(124,58,237,0.4); }
        .login-logo-text { font-family:"Syne",sans-serif; font-size:16px; font-weight:700; color:#f1f5f9; letter-spacing:-0.3px; }
        .login-heading h1 { font-family:"Syne",sans-serif; font-size:26px; font-weight:700; color:#f1f5f9; margin:0 0 6px; letter-spacing:-0.5px; }
        .login-heading p { font-size:14px; color:#64748b; margin:0; }
        .login-google-btn { display:flex; align-items:center; justify-content:center; gap:10px; width:100%; padding:11px 16px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:10px; color:#cbd5e1; font-size:14px; font-weight:500; font-family:"DM Sans",sans-serif; cursor:pointer; transition:background 0.2s,border-color 0.2s; }
        .login-google-btn:hover:not(:disabled) { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.2); }
        .login-google-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .login-divider { display:flex; align-items:center; gap:12px; }
        .login-divider span { flex:1; height:1px; background:rgba(255,255,255,0.07); }
        .login-divider p { font-size:12px; color:#475569; white-space:nowrap; margin:0; }
        .login-form { display:flex; flex-direction:column; gap:16px; }
        .login-field { display:flex; flex-direction:column; gap:7px; }
        .login-field-header { display:flex; justify-content:space-between; align-items:center; }
        .login-field label { font-size:13px; font-weight:500; color:#94a3b8; }
        .login-field input { width:100%; padding:10px 14px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.09); border-radius:9px; color:#f1f5f9; font-size:14px; font-family:"DM Sans",sans-serif; outline:none; transition:border-color 0.2s,box-shadow 0.2s; box-sizing:border-box; }
        .login-field input::placeholder { color:#334155; }
        .login-field input:focus { border-color:rgba(124,58,237,0.6); box-shadow:0 0 0 3px rgba(124,58,237,0.12); }
        .login-forgot { font-size:12px; color:#7c3aed; text-decoration:none; transition:color 0.2s; }
        .login-forgot:hover { color:#a78bfa; }
        .login-password-wrap { position:relative; }
        .login-password-wrap input { padding-right:42px; }
        .login-eye { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:#475569; cursor:pointer; padding:2px; display:flex; align-items:center; }
        .login-eye:hover { color:#94a3b8; }
        .login-error { font-size:13px; color:#fca5a5; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); border-radius:8px; padding:10px 14px; margin:0; }
        .login-submit { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:12px; background:linear-gradient(135deg,#7c3aed,#4f46e5); border:none; border-radius:10px; color:#fff; font-size:14px; font-weight:600; font-family:"DM Sans",sans-serif; cursor:pointer; transition:opacity 0.2s,transform 0.15s; box-shadow:0 4px 20px rgba(124,58,237,0.35); }
        .login-submit:hover:not(:disabled) { opacity:0.9; transform:translateY(-1px); }
        .login-submit:disabled { opacity:0.6; cursor:not-allowed; }
        .login-spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.7s linear infinite; display:inline-block; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .login-signup { text-align:center; font-size:13px; color:#475569; margin:0; }
        .login-signup a { color:#7c3aed; text-decoration:none; font-weight:500; }
        .login-signup a:hover { color:#a78bfa; }
        .login-visual-side { flex:1; display:flex; align-items:center; justify-content:center; padding:48px 56px; position:relative; overflow:hidden; }
        .login-visual-side::before { content:""; position:absolute; inset:0; background:radial-gradient(ellipse 600px 500px at 70% 30%,rgba(124,58,237,0.18),transparent 65%),radial-gradient(ellipse 400px 350px at 20% 80%,rgba(6,182,212,0.12),transparent 60%); pointer-events:none; }
        .login-visual-inner { position:relative; z-index:1; max-width:460px; display:flex; flex-direction:column; gap:24px; }
        .login-visual-badge { display:inline-flex; align-items:center; gap:6px; padding:5px 12px; background:rgba(124,58,237,0.15); border:1px solid rgba(124,58,237,0.3); border-radius:100px; color:#a78bfa; font-size:12px; font-weight:500; width:fit-content; }
        .login-visual-heading { font-family:"Syne",sans-serif; font-size:38px; font-weight:800; color:#f1f5f9; line-height:1.15; letter-spacing:-1px; margin:0; }
        .login-visual-heading span { background:linear-gradient(90deg,#7c3aed,#06b6d4); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .login-visual-sub { font-size:15px; color:#64748b; line-height:1.65; margin:0; }
        .login-stats { display:flex; gap:16px; flex-wrap:wrap; }
        .login-stat { display:flex; align-items:center; gap:10px; padding:12px 16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:12px; flex:1; min-width:120px; }
        .login-stat-icon { width:30px; height:30px; border-radius:8px; background:rgba(124,58,237,0.18); border:1px solid rgba(124,58,237,0.25); display:flex; align-items:center; justify-content:center; color:#a78bfa; flex-shrink:0; }
        .login-stat-value { font-family:"Syne",sans-serif; font-size:15px; font-weight:700; color:#f1f5f9; margin:0; }
        .login-stat-label { font-size:11px; color:#475569; margin:0; }
        .login-demo { display:flex; flex-direction:column; gap:8px; padding:18px; background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:14px; }
        .login-demo-msg { font-size:13px; padding:9px 14px; border-radius:10px; width:fit-content; max-width:85%; line-height:1.45; }
        .login-demo-msg.user { background:rgba(124,58,237,0.22); border:1px solid rgba(124,58,237,0.3); color:#c4b5fd; align-self:flex-end; margin-left:auto; }
        .login-demo-msg.assistant { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:#94a3b8; display:flex; align-items:center; gap:8px; }
        .login-demo-dot { width:7px; height:7px; border-radius:50%; background:#34d399; flex-shrink:0; box-shadow:0 0 6px rgba(52,211,153,0.5); }
        @media (max-width:768px) { .login-visual-side { display:none; } .login-form-side { width:100%; min-width:unset; border-right:none; } }
      `}</style>
    </div>
  );
}
