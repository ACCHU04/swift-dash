"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BarChart3, Eye, EyeOff } from "lucide-react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/");
    } catch (err: any) {
      const msg =
        err?.code === "auth/email-already-in-use"
          ? "An account with this email already exists."
          : err?.code === "auth/invalid-email"
          ? "Please enter a valid email address."
          : err?.code === "auth/weak-password"
          ? "Password is too weak. Use at least 6 characters."
          : "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md" style={{
        background: "rgba(5,8,24,0.7)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 36,
        backdropFilter: "blur(12px)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}>
            <BarChart3 size={18} color="#fff" />
          </div>
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>
            AI Dashboard
          </span>
        </div>

        <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 24, fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px", letterSpacing: "-0.5px" }}>
          Create account
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>
          Start analysing your data in minutes
        </p>

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#94a3b8" }}>Email address</label>
            <input
              type="email" required autoComplete="email"
              placeholder="you@company.com" value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#94a3b8" }}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"} required autoComplete="new-password"
                placeholder="At least 6 characters" value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: 42 }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center" }}
                aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#94a3b8" }}>Confirm password</label>
            <input
              type={showPassword ? "text" : "password"} required autoComplete="new-password"
              placeholder="Re-enter your password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: "#fca5a5", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", margin: 0 }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={isLoading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, marginTop: 4, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "DM Sans, sans-serif", cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.6 : 1, boxShadow: "0 4px 20px rgba(124,58,237,0.35)" }}>
            {isLoading ? <Spinner /> : (<>Create Account <ArrowRight size={14} /></>)}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13, color: "#475569", marginTop: 24 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#7c3aed", textDecoration: "none", fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 9, color: "#f1f5f9", fontSize: 14,
  fontFamily: "DM Sans, sans-serif", outline: "none", boxSizing: "border-box",
};

function Spinner() {
  return <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />;
}
