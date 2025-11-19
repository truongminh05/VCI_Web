"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Role = "sinhvien" | "giangvien" | "quantri";
type CodeStatus = "idle" | "checking" | "available" | "taken" | "error";

interface HosoRow {
  nguoi_dung_id: string;
  ho_ten: string | null;
  vai_tro: Role;
  ma_sinh_vien: string | null;
  tao_luc: string | null;
}

const ROLES: { key: Role; label: string }[] = [
  { key: "sinhvien", label: "Sinh viên" },
  { key: "giangvien", label: "Giảng viên" },
  { key: "quantri", label: "Quản trị" },
];

export default function AdminUsersPage() {
  // ===== DANH SÁCH USER =====
  const [items, setItems] = useState<HosoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");

  const load = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("hoso")
        .select("nguoi_dung_id, ho_ten, vai_tro, ma_sinh_vien, tao_luc")
        .is("da_vo_hieu_hoa_luc", null)
        .order("tao_luc", { ascending: false });

      if (roleFilter !== "all") {
        q = q.eq("vai_tro", roleFilter);
      }

      const { data, error } = await q;
      if (error) throw error;
      setItems((data as HosoRow[]) || []);
    } catch (e: any) {
      alert("Lỗi tải người dùng: " + (e.message || "Không thể tải."));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [roleFilter]);

  const disableUser = async (row: HosoRow) => {
    if (
      !confirm(
        `Vô hiệu hóa tài khoản "${row.ho_ten || row.ma_sinh_vien || ""}"?`
      )
    )
      return;
    try {
      const { error } = await supabase
        .from("hoso")
        .update({ da_vo_hieu_hoa_luc: new Date().toISOString() })
        .eq("nguoi_dung_id", row.nguoi_dung_id);

      if (error) throw error;
      alert("Đã vô hiệu hóa tài khoản.");
      load();
    } catch (e: any) {
      alert("Lỗi: " + (e.message || "Không thể vô hiệu hóa."));
    }
  };

  // ===== FORM TẠO TÀI KHOẢN ĐƠN LẺ =====
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("sinhvien");

  const [code, setCode] = useState("");
  const [codeStatus, setCodeStatus] = useState<CodeStatus>("idle");
  const [codeMsg, setCodeMsg] = useState("");

  const [creating, setCreating] = useState(false);

  const validateSingle = () => {
    const em = email.trim().toLowerCase();
    const pw = password.trim();
    const fn = fullName.trim();

    if (!em || !/^\S+@\S+\.\S+$/.test(em)) {
      alert("Vui lòng nhập email hợp lệ.");
      return null;
    }
    if (!pw || pw.length < 6) {
      alert("Mật khẩu tối thiểu 6 ký tự.");
      return null;
    }
    if (!fn) {
      alert("Vui lòng nhập Họ tên.");
      return null;
    }
    if (!ROLES.find((r) => r.key === role)) {
      alert("Vai trò không hợp lệ.");
      return null;
    }
    return { em, pw, fn };
  };

  const isCodeTaken = async (ma: string): Promise<boolean> => {
    if (!ma) return false;
    try {
      // ưu tiên RPC nếu có
      const { data, error } = await supabase.rpc(
        "admin_check_code_available_v2",
        { p_code: ma }
      );
      if (!error && data && typeof (data as any).available === "boolean") {
        return !(data as any).available;
      }

      // fallback: đếm trong hoso
      const { count, error: e2 } = await supabase
        .from("hoso")
        .select("nguoi_dung_id", { count: "exact", head: true })
        .eq("ma_sinh_vien", ma);
      if (e2) throw e2;
      return (count || 0) > 0;
    } catch {
      return false;
    }
  };

  const handleCodeBlur = async () => {
    const normalized = (code || "").trim().toUpperCase();
    if (!normalized) {
      setCodeStatus("idle");
      setCodeMsg("");
      return;
    }
    try {
      setCodeStatus("checking");
      setCodeMsg("Đang kiểm tra…");
      const taken = await isCodeTaken(normalized);
      if (taken) {
        setCodeStatus("taken");
        setCodeMsg(`Mã đã tồn tại: ${normalized}`);
      } else {
        setCodeStatus("available");
        setCodeMsg(`Mã khả dụng: ${normalized}`);
      }
    } catch (e: any) {
      setCodeStatus("error");
      setCodeMsg(e?.message || "Không kiểm tra được trùng mã.");
    }
  };

  const resetSingleForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setRole("sinhvien");
    setCode("");
    setCodeStatus("idle");
    setCodeMsg("");
  };

  const createSingleUser = async () => {
    const v = validateSingle();
    if (!v) return;
    const { em, pw, fn } = v;
    const maSV = (code || "").trim().toUpperCase() || null;

    if (codeStatus === "checking") {
      alert("Đang kiểm tra mã, vui lòng đợi xíu.");
      return;
    }

    if (maSV && codeStatus === "idle") {
      try {
        setCodeStatus("checking");
        const taken = await isCodeTaken(maSV);
        if (taken) {
          setCodeStatus("taken");
          setCodeMsg(`Mã đã tồn tại: ${maSV}`);
          alert("Mã sinh viên/giảng viên đã tồn tại. Vui lòng dùng mã khác.");
          return;
        } else {
          setCodeStatus("available");
          setCodeMsg(`Mã khả dụng: ${maSV}`);
        }
      } catch (e: any) {
        setCodeStatus("error");
        setCodeMsg(e?.message || "Không kiểm tra được trùng mã.");
      }
    }

    if (codeStatus === "taken") {
      alert("Mã sinh viên/giảng viên đã tồn tại. Vui lòng dùng mã khác.");
      return;
    }

    try {
      setCreating(true);

      const { data, error } = await supabase.functions.invoke("admin_users", {
        body: {
          action: "create",
          email: em,
          password: pw,
          full_name: fn,
          vai_tro: role,
          ma_sinh_vien: maSV,
        },
      });

      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("unauthenticated"))
          throw new Error("Bạn cần đăng nhập.");
        if (msg.includes("forbidden"))
          throw new Error(
            "Chỉ tài khoản 'quản trị' mới được phép tạo người dùng."
          );
        if (msg.includes("email") && msg.includes("exist"))
          throw new Error("Email đã tồn tại.");
        throw new Error(error.message);
      }

      const newUserId = (data as any)?.user_id;
      if (!newUserId) {
        throw new Error("Hàm tạo tài khoản không trả về user_id.");
      }

      alert("Đã tạo tài khoản người dùng.");
      resetSingleForm();
      load();
    } catch (e: any) {
      alert(e.message || "Không thể tạo tài khoản.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Quản lý tài khoản</h1>
      <p style={{ color: "#9ca3af", marginBottom: 20 }}>
        Danh sách người dùng hệ thống và form tạo tài khoản đơn lẻ (SV / GV /
        Quản trị). Chức năng tạo tài khoản hàng loạt đã được tách sang trang{" "}
        <b>Tài khoản sinh viên</b>.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1.1fr)",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        {/* ===== CỘT TRÁI: DANH SÁCH USER ===== */}
        <div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as "all" | Role)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 9999,
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "white",
                  fontSize: 14,
                }}
              >
                <option value="all">Tất cả vai trò</option>
                <option value="sinhvien">Sinh viên</option>
                <option value="giangvien">Giảng viên</option>
                <option value="quantri">Quản trị</option>
              </select>

              <button
                onClick={load}
                disabled={loading}
                style={{
                  padding: "6px 14px",
                  borderRadius: 9999,
                  border: "none",
                  background: "#4f46e5",
                  color: "white",
                  cursor: "pointer",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  opacity: loading ? 0.8 : 1,
                }}
              >
                {loading ? "Đang tải..." : "Làm mới"}
              </button>
            </div>

            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Tổng: {items.length} tài khoản
            </span>
          </div>

          <div
            style={{
              borderRadius: 12,
              border: "1px solid #1f2937",
              overflow: "hidden",
              maxHeight: 480,
              overflowY: "auto",
              background: "#020617",
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
                <tr style={{ background: "#030712" }}>
                  <th style={thStyle}>Họ tên</th>
                  <th style={thStyle}>Mã</th>
                  <th style={thStyle}>Vai trò</th>
                  <th style={thStyle}>Tạo lúc</th>
                  <th style={thStyle}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={row.nguoi_dung_id}
                    style={{ borderTop: "1px solid #111827" }}
                  >
                    <td style={tdStyle}>{row.ho_ten || "(Chưa có tên)"}</td>
                    <td style={tdStyle}>{row.ma_sinh_vien || "—"}</td>
                    <td style={tdStyle}>{row.vai_tro}</td>
                    <td style={tdStyle}>
                      {row.tao_luc
                        ? new Date(row.tao_luc).toLocaleString()
                        : "—"}
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => disableUser(row)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 9999,
                          border: "none",
                          background: "#b91c1c",
                          color: "white",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        Vô hiệu hóa
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && !loading && (
                  <tr>
                    <td style={tdStyle} colSpan={5}>
                      Không có dữ liệu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== CỘT PHẢI: FORM TẠO ĐƠN LẺ ===== */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #1f2937",
            padding: 18,
            background: "#020617",
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>
            Tạo tài khoản đơn lẻ
          </h2>
          <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>
            Dùng khi cần tạo lẻ từng tài khoản (SV / GV / Quản trị). Thông tin
            này đồng bộ với Supabase Auth và bảng{" "}
            <code style={{ fontSize: 11 }}>hoso</code>.
          </p>

          <label style={labelStyle}>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="vd: ten@example.com"
            />
          </label>

          <label style={labelStyle}>
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="Tối thiểu 6 ký tự"
            />
          </label>

          <label style={labelStyle}>
            Họ tên
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={inputStyle}
              placeholder="Họ tên đầy đủ"
            />
          </label>

          <label style={labelStyle}>
            Vai trò
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              style={inputStyle}
            >
              {ROLES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            Mã sinh viên / giảng viên (tùy chọn)
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setCodeStatus("idle");
                setCodeMsg("");
              }}
              onBlur={handleCodeBlur}
              style={inputStyle}
              placeholder="VD: SV001, GV001..."
            />
          </label>
          {codeMsg && (
            <p
              style={{
                fontSize: 12,
                marginTop: -4,
                marginBottom: 10,
                color:
                  codeStatus === "taken"
                    ? "#f97373"
                    : codeStatus === "available"
                    ? "#4ade80"
                    : "#9ca3af",
              }}
            >
              {codeMsg}
            </p>
          )}

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              onClick={createSingleUser}
              disabled={creating}
              style={{
                padding: "8px 16px",
                borderRadius: 9999,
                border: "none",
                background: "#22c55e",
                color: "black",
                fontWeight: 600,
                cursor: "pointer",
                opacity: creating ? 0.7 : 1,
              }}
            >
              {creating ? "Đang tạo..." : "Tạo tài khoản"}
            </button>
            <button
              type="button"
              onClick={resetSingleForm}
              style={{
                padding: "8px 14px",
                borderRadius: 9999,
                border: "none",
                background: "#374151",
                color: "white",
                cursor: "pointer",
              }}
            >
              Xoá form
            </button>
          </div>
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

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#9ca3af",
  display: "block",
  marginBottom: 4,
};
