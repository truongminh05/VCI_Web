"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image"; // Import component Image của Next.js
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../(providers)/AuthContext";
import logoImg from "../../public/logo-vci.png";

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
          maxWidth: 400,
          background: "#0f172a", // Màu nền thẻ sáng hơn nền chung một chút
          borderRadius: 16,
          border: "1px solid #1f2937",
          padding: 32,
          color: "white",
          boxShadow:
            "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", // Thêm bóng đổ
        }}
      >
        {/* PHẦN LOGO & TIÊU ĐỀ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          {/* Logo container */}
          <div
            style={{
              width: 80,
              height: 80,
              position: "relative",
              marginBottom: 16,
              background: "white", // Nền trắng cho logo nếu logo trong suốt
              borderRadius: "50%", // Bo tròn logo
              padding: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Đảm bảo bạn đã lưu file ảnh tên logo.png vào thư mục public */}
            <img
              src={logoImg.src}
              alt="VCI Logo"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            VCI Attendance
          </h1>
          <p style={{ fontSize: 14, color: "#9ca3af" }}>
            Cổng quản trị hệ thống
          </p>
        </div>

        {/* FORM ĐĂNG NHẬP */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 13,
                color: "#9ca3af",
                display: "block",
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@vci.edu.vn"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #374151",
                background: "#020617",
                color: "white",
                outline: "none",
                fontSize: 15,
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                fontSize: 13,
                color: "#9ca3af",
                display: "block",
                marginBottom: 6,
              }}
            >
              Mật khẩu
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #374151",
                background: "#020617",
                color: "white",
                outline: "none",
                fontSize: 15,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 9999,
              border: "none",
              background: "#4f46e5", // Màu tím chủ đạo
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "opacity 0.2s",
              fontSize: 15,
            }}
          >
            {loading ? "Đang xác thực..." : "Đăng nhập"}
          </button>
        </form>
      </div>

      {/* Footer nhỏ (tuỳ chọn) */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          fontSize: 12,
          color: "#4b5563",
        }}
      >
        © 2025 VCI Attendance System
      </div>
    </div>
  );
}
