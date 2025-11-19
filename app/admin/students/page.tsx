"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Profile {
  nguoi_dung_id: string;
  ho_ten: string | null;
  ma_sinh_vien: string | null;
  vai_tro: "sinhvien" | "giangvien" | "quantri";
  ngay_sinh: string | null;
  gioi_tinh: string | null;
  que_quan: string | null;
  so_dien_thoai: string | null;
}

interface ClassInfo {
  ten_lop: string;
  ma_lop: string | null;
}

interface AttendanceRow {
  id: string;
  trang_thai: string;
  checkin_luc: string;
  lop_ten: string | null;
  mon_ten: string | null;
}

export default function AdminStudentsPage() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [saving, setSaving] = useState(false);

  // form edit
  const [editHoTen, setEditHoTen] = useState("");
  const [editNgaySinh, setEditNgaySinh] = useState(""); // yyyy-MM-dd
  const [editQueQuan, setEditQueQuan] = useState("");
  const [editSdt, setEditSdt] = useState("");

  const resetState = () => {
    setProfile(null);
    setClassInfo(null);
    setAttendance([]);
  };

  const loadProfile = async () => {
    const kw = keyword.trim();
    if (!kw) {
      alert("Nhập mã sinh viên / giảng viên để tra cứu.");
      return;
    }
    setLoading(true);
    resetState();
    try {
      // tìm theo ma_sinh_vien (không phân biệt hoa thường)
      const { data: h, error } = await supabase
        .from("hoso")
        .select(
          "nguoi_dung_id, ho_ten, ma_sinh_vien, vai_tro, ngay_sinh, gioi_tinh, que_quan, so_dien_thoai"
        )
        .ilike("ma_sinh_vien", kw)
        .maybeSingle();

      if (error) throw error;
      if (!h) {
        alert("Không tìm thấy người dùng với mã này.");
        return;
      }

      const p = h as Profile;
      setProfile(p);

      // fill form edit
      setEditHoTen(p.ho_ten ?? "");
      setEditQueQuan(p.que_quan ?? "");
      setEditSdt(p.so_dien_thoai ?? "");
      setEditNgaySinh(
        p.ngay_sinh ? new Date(p.ngay_sinh).toISOString().slice(0, 10) : ""
      );

      // Nếu là sinh viên: lấy lớp + điểm danh
      if (p.vai_tro === "sinhvien") {
        const { data: dk, error: dkErr } = await supabase
          .from("dangky")
          .select("lop:lop_id(ten_lop, ma_lop)")
          .eq("sinh_vien_id", p.nguoi_dung_id)
          .maybeSingle();

        if (!dkErr && dk?.lop) {
          // Normalize lop which may be returned as an array or an object
          const lop = Array.isArray(dk.lop) ? dk.lop[0] : dk.lop;
          if (lop) {
            setClassInfo({
              ten_lop: lop.ten_lop,
              ma_lop: lop.ma_lop,
            });
          }
        }

        const { data: dd, error: ddErr } = await supabase
          .from("diemdanh")
          .select(
            `
            id,
            trang_thai,
            checkin_luc,
            buoihoc:buoihoc_id(
              thoi_gian_bat_dau,
              lop:lop_id(ten_lop),
              mon:monhoc_id(ten_mon)
            )
          `
          )
          .eq("sinh_vien_id", p.nguoi_dung_id)
          .order("checkin_luc", { ascending: false })
          .limit(20);

        if (!ddErr && dd) {
          const rows: AttendanceRow[] = dd.map((row: any) => ({
            id: row.id,
            trang_thai: row.trang_thai,
            checkin_luc: row.checkin_luc,
            lop_ten: row.buoihoc?.lop?.ten_lop ?? null,
            mon_ten: row.buoihoc?.mon?.ten_mon ?? null,
          }));
          setAttendance(rows);
        }
      }

      // Nếu là giảng viên: có thể sau này bạn lấy giảng dạy / buổi phụ trách tương tự
    } catch (err: any) {
      console.error("[AdminStudents] loadProfile error", err);
      alert("Lỗi tra cứu: " + (err.message || "Không thể tra cứu."));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const payload = {
        ho_ten: editHoTen || null,
        que_quan: editQueQuan || null,
        so_dien_thoai: editSdt || null,
        ngay_sinh: editNgaySinh || null, // yyyy-MM-dd, Postgres date nhận được
      };

      const { data, error } = await supabase
        .from("hoso")
        .update(payload)
        .eq("nguoi_dung_id", profile.nguoi_dung_id)
        .select("nguoi_dung_id")
        .maybeSingle();

      console.log("[AdminStudents] update hoso =", { data, error });

      if (error) throw error;
      if (!data) {
        alert(
          "Không cập nhật được. Kiểm tra lại quyền hoặc RLS trên bảng hoso."
        );
        return;
      }

      alert("Đã cập nhật thông tin cá nhân.");
      setProfile({ ...profile, ...payload });
    } catch (err: any) {
      console.error("[AdminStudents] handleSave error", err);
      alert("Lỗi lưu: " + (err.message || "Không thể lưu dữ liệu."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>
        Tra cứu sinh viên / giảng viên
      </h1>
      <p style={{ color: "#9ca3af", marginBottom: 16 }}>
        Nhập mã sinh viên / giảng viên để xem và chỉnh sửa thông tin.
      </p>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder="Ví dụ: SV001, GV001..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{
            flex: "0 0 260px",
            maxWidth: 320,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #374151",
            background: "#020617",
            color: "white",
          }}
        />
        <button
          onClick={loadProfile}
          disabled={loading}
          style={{
            padding: "8px 16px",
            borderRadius: 9999,
            border: "none",
            background: "#4f46e5",
            color: "white",
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Đang tra cứu..." : "Tra cứu"}
        </button>
      </div>

      {profile && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
            gap: 24,
          }}
        >
          {/* Thông tin cá nhân + edit */}
          <div
            style={{
              background: "#020617",
              borderRadius: 16,
              border: "1px solid #1f2937",
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Thông tin cá nhân</h2>
            <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
              Vai trò:{" "}
              <strong>
                {profile.vai_tro === "sinhvien"
                  ? "Sinh viên"
                  : profile.vai_tro === "giangvien"
                  ? "Giảng viên"
                  : "Quản trị"}
              </strong>{" "}
              · Mã: <strong>{profile.ma_sinh_vien || "Chưa có mã"}</strong>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ fontSize: 13, color: "#9ca3af" }}>
                Họ tên
                <input
                  value={editHoTen}
                  onChange={(e) => setEditHoTen(e.target.value)}
                  style={inputStyle}
                />
              </label>

              <label style={{ fontSize: 13, color: "#9ca3af" }}>
                Ngày sinh
                <input
                  type="date"
                  value={editNgaySinh}
                  onChange={(e) => setEditNgaySinh(e.target.value)}
                  style={inputStyle}
                />
              </label>

              <label style={{ fontSize: 13, color: "#9ca3af" }}>
                Quê quán
                <input
                  value={editQueQuan}
                  onChange={(e) => setEditQueQuan(e.target.value)}
                  style={inputStyle}
                />
              </label>

              <label style={{ fontSize: 13, color: "#9ca3af" }}>
                Số điện thoại
                <input
                  value={editSdt}
                  onChange={(e) => setEditSdt(e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                marginTop: 20,
                padding: "9px 18px",
                borderRadius: 9999,
                border: "none",
                background: "#22c55e",
                color: "black",
                fontWeight: 600,
                cursor: "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>

          {/* Lớp & điểm danh (cho sinh viên) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {profile.vai_tro === "sinhvien" && (
              <>
                <div
                  style={{
                    background: "#020617",
                    borderRadius: 16,
                    border: "1px solid #1f2937",
                    padding: 16,
                  }}
                >
                  <h3 style={{ fontSize: 16, marginBottom: 8 }}>Lớp học</h3>
                  {classInfo ? (
                    <div style={{ fontSize: 14 }}>
                      {classInfo.ten_lop}{" "}
                      {classInfo.ma_lop ? `(${classInfo.ma_lop})` : ""}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "#9ca3af" }}>
                      Chưa có thông tin lớp (chưa đăng ký / chưa import).
                    </div>
                  )}
                </div>

                <div
                  style={{
                    background: "#020617",
                    borderRadius: 16,
                    border: "1px solid #1f2937",
                    padding: 16,
                    maxHeight: 320,
                    overflow: "auto",
                  }}
                >
                  <h3 style={{ fontSize: 16, marginBottom: 8 }}>
                    Lịch sử điểm danh (20 gần nhất)
                  </h3>
                  {attendance.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#9ca3af" }}>
                      Chưa có dữ liệu điểm danh.
                    </div>
                  ) : (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 12,
                      }}
                    >
                      <thead>
                        <tr style={{ borderBottom: "1px solid #1f2937" }}>
                          <th style={{ textAlign: "left", padding: "4px 6px" }}>
                            Lớp
                          </th>
                          <th style={{ textAlign: "left", padding: "4px 6px" }}>
                            Môn
                          </th>
                          <th style={{ textAlign: "left", padding: "4px 6px" }}>
                            Thời gian
                          </th>
                          <th style={{ textAlign: "left", padding: "4px 6px" }}>
                            Trạng thái
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.map((row) => (
                          <tr
                            key={row.id}
                            style={{ borderBottom: "1px solid #111827" }}
                          >
                            <td style={{ padding: "4px 6px" }}>
                              {row.lop_ten || "—"}
                            </td>
                            <td style={{ padding: "4px 6px" }}>
                              {row.mon_ten || "—"}
                            </td>
                            <td style={{ padding: "4px 6px" }}>
                              {new Date(row.checkin_luc).toLocaleString()}
                            </td>
                            <td style={{ padding: "4px 6px" }}>
                              {row.trang_thai}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 4,
  padding: "7px 9px",
  borderRadius: 8,
  border: "1px solid #374151",
  background: "#020617",
  color: "white",
  fontSize: 14,
};
