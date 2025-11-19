"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface LopRow {
  id: string;
  ten_lop: string;
  ma_lop: string | null;
}

interface BulkCreatedUser {
  ho_ten: string;
  ma_sinh_vien: string;
  email: string;
  password: string;
}

export default function StudentAccountsPage() {
  const [classes, setClasses] = useState<LopRow[]>([]);
  const [bulkClassId, setBulkClassId] = useState<string>("");
  const [bulkEmailDomain, setBulkEmailDomain] = useState<string>("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkCreatedUser[]>([]);

  // Tải danh sách lớp
  const loadClasses = async () => {
    const { data, error } = await supabase
      .from("lop")
      .select("id, ten_lop, ma_lop")
      .order("ten_lop", { ascending: true });

    if (!error && data) {
      setClasses(data as LopRow[]);
    } else if (error) {
      alert("Lỗi tải danh sách lớp: " + (error.message || "Không thể tải."));
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  // Gọi Edge Function tạo tài khoản hàng loạt
  const handleBulkCreate = async () => {
    if (!bulkClassId) {
      alert("Vui lòng chọn lớp.");
      return;
    }
    const domain = bulkEmailDomain.trim();
    if (!domain) {
      alert("Vui lòng nhập email domain (vd: sv.truongminh.dev).");
      return;
    }
    if (domain.includes("@")) {
      alert("Chỉ nhập phần domain, KHÔNG gồm @. Ví dụ: sv.truongminh.dev");
      return;
    }

    try {
      setBulkLoading(true);
      setBulkResult([]);

      const { data, error } = await supabase.functions.invoke("admin_users", {
        body: {
          action: "bulk_from_class",
          lop_id: bulkClassId,
          email_domain: domain,
        },
      });

      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("unauthenticated")) {
          throw new Error("Bạn cần đăng nhập.");
        }
        if (msg.includes("forbidden")) {
          throw new Error("Chỉ tài khoản quản trị mới được tạo hàng loạt.");
        }
        throw new Error(error.message);
      }

      const created = ((data as any)?.created || []) as BulkCreatedUser[];

      if (!created.length) {
        alert(
          "Không có sinh viên nào cần tạo tài khoản (có thể tất cả đã có tài khoản)."
        );
        setBulkResult([]);
      } else {
        setBulkResult(created);
        alert(`Đã tạo ${created.length} tài khoản.`);
      }
    } catch (e: any) {
      alert(e.message || "Không thể tạo tài khoản hàng loạt.");
    } finally {
      setBulkLoading(false);
    }
  };

  // Copy bảng kết quả ra clipboard
  const handleCopyResult = async () => {
    if (!bulkResult.length) return;

    const header = "Họ tên\tMã SV\tEmail\tMật khẩu";
    const lines = bulkResult.map(
      (u) => `${u.ho_ten}\t${u.ma_sinh_vien}\t${u.email}\t${u.password}`
    );
    const text = [header, ...lines].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      alert("Đã copy danh sách tài khoản vào clipboard.");
    } catch {
      alert("Không thể copy, bạn hãy chọn & copy thủ công trong bảng.");
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>
        Tài khoản sinh viên (tạo hàng loạt + mật khẩu)
      </h1>
      <p style={{ color: "#9ca3af", marginBottom: 16 }}>
        Trang riêng để admin tạo tài khoản hàng loạt cho sinh viên dựa trên danh
        sách import Excel (bảng <code>dangky_import</code>) và quản lý bộ tài
        khoản/mật khẩu để cấp cho sinh viên.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.4fr)",
          gap: 24,
        }}
      >
        {/* Cột trái: Chọn lớp + tạo tài khoản hàng loạt */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #1f2937",
            padding: 16,
            height: "fit-content",
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>
            Tạo tài khoản hàng loạt
          </h2>
          <p
            style={{
              fontSize: 12,
              color: "#9ca3af",
              marginBottom: 12,
              lineHeight: 1.5,
            }}
          >
            Hệ thống sẽ:
            <br />• Tìm các sinh viên trong <code>dangky_import</code> của lớp
            được chọn mà <b>chưa có tài khoản</b>.
            <br />• Tạo tài khoản Supabase (Auth) + bản ghi <code>
              hoso
            </code>{" "}
            với vai trò <b>sinh viên</b>.
            <br />• Tự động thêm vào bảng <code>dangky</code> (tham gia lớp).
            <br />• Sinh mật khẩu random và hiển thị trong bảng bên phải.
          </p>

          <label
            style={{
              display: "block",
              fontSize: 13,
              color: "#9ca3af",
              marginBottom: 8,
            }}
          >
            Chọn lớp
            <select
              value={bulkClassId}
              onChange={(e) => {
                setBulkClassId(e.target.value);
                setBulkResult([]);
              }}
              style={inputStyle}
            >
              <option value="">-- Chọn lớp --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.ten_lop}
                  {c.ma_lop ? ` (${c.ma_lop})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label
            style={{
              display: "block",
              fontSize: 13,
              color: "#9ca3af",
              marginBottom: 8,
            }}
          >
            Email domain (KHÔNG gồm @)
            <input
              value={bulkEmailDomain}
              onChange={(e) => setBulkEmailDomain(e.target.value)}
              style={inputStyle}
              placeholder="vd: sv.truongminh.dev"
            />
          </label>

          <button
            onClick={handleBulkCreate}
            disabled={bulkLoading}
            style={{
              marginTop: 8,
              padding: "8px 16px",
              borderRadius: 9999,
              border: "none",
              background: "#f97316",
              color: "black",
              fontWeight: 600,
              cursor: "pointer",
              opacity: bulkLoading ? 0.7 : 1,
            }}
          >
            {bulkLoading ? "Đang tạo hàng loạt..." : "Tạo tài khoản hàng loạt"}
          </button>
        </div>

        {/* Cột phải: Bảng tài khoản + mật khẩu vừa tạo */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #1f2937",
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <h2 style={{ fontSize: 18 }}>Danh sách tài khoản vừa tạo</h2>
            <button
              onClick={handleCopyResult}
              disabled={!bulkResult.length}
              style={{
                padding: "6px 12px",
                borderRadius: 9999,
                border: "none",
                background: bulkResult.length ? "#4f46e5" : "#374151",
                color: "white",
                fontSize: 13,
                cursor: bulkResult.length ? "pointer" : "default",
              }}
            >
              Copy bảng
            </button>
          </div>

          {bulkResult.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>
              Chưa có dữ liệu. Hãy chọn lớp, nhập domain và bấm{" "}
              <b>“Tạo tài khoản hàng loạt”</b>. Các tài khoản vừa tạo sẽ hiện ở
              đây để bạn lưu/ cấp cho sinh viên.
            </p>
          ) : (
            <>
              <div
                style={{
                  maxHeight: 360,
                  overflowY: "auto",
                  borderRadius: 8,
                  border: "1px solid #111827",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#020617" }}>
                      <th style={thStyle}>Họ tên</th>
                      <th style={thStyle}>Mã SV</th>
                      <th style={thStyle}>Email</th>
                      <th style={thStyle}>Mật khẩu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResult.map((u, idx) => (
                      <tr key={idx} style={{ borderTop: "1px solid #111827" }}>
                        <td style={tdStyle}>{u.ho_ten}</td>
                        <td style={tdStyle}>{u.ma_sinh_vien}</td>
                        <td style={tdStyle}>{u.email}</td>
                        <td style={tdStyle}>{u.password}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  marginTop: 6,
                  lineHeight: 1.5,
                }}
              >
                Gợi ý:
                <br />• Sau khi tạo, bạn có thể <b>copy bảng</b> rồi dán vào
                Excel / Google Sheets để lưu trữ.
                <br />• Khi cấp tài khoản cho sinh viên, yêu cầu sinh viên{" "}
                <b>đăng nhập và đổi mật khẩu</b> ngay lần đầu.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "1px solid #1f2937",
};

const tdStyle: React.CSSProperties = {
  padding: "6px 8px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 4,
  marginBottom: 8,
  padding: "7px 9px",
  borderRadius: 8,
  border: "1px solid #374151",
  background: "#020617",
  color: "white",
  fontSize: 14,
};
