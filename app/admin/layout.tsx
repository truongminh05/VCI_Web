"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../(providers)/AuthContext";
import logoImg from "../../public/logo-vci.png";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user, role, signOut, hoso } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || role !== "quantri") {
      router.replace("/login");
    }
  }, [loading, user, role, router]);

  if (loading || !user || role !== "quantri") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        display: "flex",
      }}
    >
      {/* sidebar */}
      <aside
        style={{
          width: 240,
          borderRight: "1px solid #1f2937",
          padding: 16,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {/* Logo: Bỏ nền trắng, thêm bo tròn 50% để đảm bảo ảnh luôn tròn */}
          <img
            src={logoImg.src}
            alt="VCI Logo"
            style={{
              width: 30, // Tăng kích thước một chút cho cân đối
              height: 30,
              objectFit: "cover", // Giúp ảnh lấp đầy khung tròn
              borderRadius: "50%", // Cắt ảnh thành hình tròn (nếu ảnh gốc là hình vuông)
            }}
          />

          {/* Chữ VCI Admin */}
          <h2
            style={{
              fontSize: 18,
              margin: 0,
              lineHeight: "1",
              fontWeight: 600,
            }}
          >
            VCI Admin
          </h2>
        </div>
        <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 24 }}>
          {hoso?.ho_ten || user.email} <br />
          <span style={{ fontSize: 12, color: "#6b7280" }}>Quản trị viên</span>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => router.push("/admin")} style={navBtnStyle}>
            Tổng quan
          </button>

          <button
            onClick={() => router.push("/admin/students")}
            style={navBtnStyle}
          >
            Tra cứu SV / GV
          </button>

          <button
            onClick={() => router.push("/admin/users")}
            style={navBtnStyle}
          >
            Quản lý tài khoản
          </button>

          {/* TRANG MỚI: tài khoản sinh viên + tạo hàng loạt */}
          <button
            onClick={() => router.push("/admin/student-accounts")}
            style={navBtnStyle}
          >
            Tài khoản sinh viên
          </button>

          <button
            onClick={() => router.push("/admin/classes")}
            style={navBtnStyle}
          >
            Quản lý lớp
          </button>

          <button
            onClick={() => router.push("/admin/subjects")}
            style={navBtnStyle}
          >
            Quản lý môn học
          </button>

          <button
            onClick={() => router.push("/admin/sessions")}
            style={navBtnStyle}
          >
            Quản lý buổi học
          </button>
          <button
            onClick={() => router.push("/admin/attendance-report")}
            style={navBtnStyle}
          >
            Báo cáo điểm danh
          </button>
        </nav>

        <div style={{ marginTop: 32 }}>
          <button
            onClick={signOut}
            style={{
              ...navBtnStyle,
              background: "transparent",
              border: "1px solid #4b5563",
              color: "#e5e7eb",
            }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* main */}
      <main
        style={{
          flex: 1,
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        {children}
      </main>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderRadius: 8,
  border: "none",
  background: "#111827",
  color: "#e5e7eb",
  cursor: "pointer",
  fontSize: 14,
};
