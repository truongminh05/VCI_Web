"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../(providers)/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Nếu đã đăng nhập và là admin -> vào thẳng /admin
  React.useEffect(() => {
    if (user && role === "quantri") {
      router.replace("/admin");
    }
  }, [user, role, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        alert("Đăng nhập thất bại: " + error.message);
      } else {
        // AuthContext sẽ tự tải lại profile -> redirect ở useEffect phía trên
      }
    } catch (err: any) {
      alert("Lỗi đăng nhập: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#020617",
          borderRadius: 16,
          border: "1px solid #1f2937",
          padding: 24,
          color: "white",
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>
          VCI Attendance - Admin
        </h1>
        <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 24 }}>
          Đăng nhập tài khoản quản trị để tiếp tục
        </p>

        <form onSubmit={handleLogin}>
          <label style={{ fontSize: 13, color: "#9ca3af" }}>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                marginTop: 4,
                marginBottom: 16,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #374151",
                background: "#020617",
                color: "white",
              }}
            />
          </label>

          <label style={{ fontSize: 13, color: "#9ca3af" }}>
            Mật khẩu
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                marginTop: 4,
                marginBottom: 24,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #374151",
                background: "#020617",
                color: "white",
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 9999,
              border: "none",
              background: "#4f46e5",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
