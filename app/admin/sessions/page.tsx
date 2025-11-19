"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Lop {
  id: string;
  ten_lop: string;
}

interface HosoGV {
  nguoi_dung_id: string;
  ho_ten: string | null;
  ma_sinh_vien: string | null;
}

interface SessionRow {
  id: string;
  thoi_gian_bat_dau: string;
  thoi_gian_ket_thuc: string;
  mon?: { ten_mon: string };
}

const DEFAULT_QR_SECONDS = 20;

export default function AdminSessionsPage() {
  const [classes, setClasses] = useState<Lop[]>([]);
  const [teachers, setTeachers] = useState<HosoGV[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; ten_mon: string }[]>(
    []
  );

  const [lopId, setLopId] = useState<string | null>(null);
  const [monhocId, setMonhocId] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [onTimeMinutes, setOnTimeMinutes] = useState("15");
  const [lateMinutes, setLateMinutes] = useState("10");

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadClasses = async () => {
    const { data, error } = await supabase
      .from("lop")
      .select("id, ten_lop")
      .order("ten_lop", { ascending: true });
    if (!error && data) setClasses(data as Lop[]);
  };

  const loadTeachers = async () => {
    const { data, error } = await supabase
      .from("hoso")
      .select("nguoi_dung_id, ho_ten, ma_sinh_vien")
      .eq("vai_tro", "giangvien")
      .is("da_vo_hieu_hoa_luc", null)
      .order("ho_ten", { ascending: true });
    if (!error && data) setTeachers(data as HosoGV[]);
  };

  const loadSubjects = async () => {
    const { data, error } = await supabase
      .from("monhoc")
      .select("id, ten_mon")
      .order("ten_mon", { ascending: true });
    if (!error && data) setSubjects(data as { id: string; ten_mon: string }[]);
  };

  useEffect(() => {
    loadClasses();
    loadTeachers();
    loadSubjects();
  }, []);

  const loadSessions = async (lopId: string) => {
    setLoadingSessions(true);
    try {
      const { data, error } = await supabase
        .from("buoihoc")
        .select(
          "id, thoi_gian_bat_dau, thoi_gian_ket_thuc, monhoc:monhoc_id(ten_mon)"
        )
        .eq("lop_id", lopId)
        .order("thoi_gian_bat_dau", { ascending: false });

      if (error) throw error;
      setSessions((data as any[]) || []);
    } catch (e: any) {
      alert("Lỗi tải buổi học: " + (e.message || "Không thể tải."));
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSelectClass = (id: string) => {
    setLopId(id);
    setSessions([]);
    if (id) loadSessions(id);
  };

  const handleCreateSession = async () => {
    if (!lopId) {
      alert("Chọn lớp trước.");
      return;
    }
    if (!startAt || !endAt) {
      alert("Nhập thời gian bắt đầu và kết thúc.");
      return;
    }

    const t1 = new Date(startAt);
    const t2 = new Date(endAt);
    if (Number.isNaN(t1.getTime()) || Number.isNaN(t2.getTime())) {
      alert("Thời gian không hợp lệ.");
      return;
    }
    if (t2 <= t1) {
      alert("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }

    const onm = parseInt(onTimeMinutes || "0", 10);
    const tre = parseInt(lateMinutes || "0", 10);
    if (onm < 0 || tre < 0) {
      alert("Số phút phải >= 0.");
      return;
    }

    try {
      setCreating(true);

      const payload: any = {
        p_lop_id: lopId,
        p_thoi_gian_bat_dau: t1.toISOString(),
        p_thoi_gian_ket_thuc: t2.toISOString(),
        p_dung_gio_trong_phut: onm,
        p_tre_sau_phut: tre,
        p_monhoc_id: monhocId,
        p_giang_vien_id: teacherId,
        p_mo_tu: null,
        p_dong_den: null,
        p_qr_khoang_giay: DEFAULT_QR_SECONDS,
        p_phonghoc_id: null,
      };

      const { error } = await supabase.rpc("create_buoihoc", payload);
      if (error) throw error;

      alert("Đã tạo buổi học.");
      setMonhocId(null);
      setTeacherId(null);
      setStartAt("");
      setEndAt("");
      setOnTimeMinutes("15");
      setLateMinutes("10");
      if (lopId) loadSessions(lopId);
    } catch (e: any) {
      alert("Lỗi tạo buổi học: " + (e.message || "Không thể tạo."));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Quản lý buổi học</h1>
      <p style={{ color: "#9ca3af", marginBottom: 16 }}>
        Tạo buổi học mới và xem danh sách buổi theo lớp.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1.6fr)",
          gap: 24,
        }}
      >
        {/* Form tạo buổi*/}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #1f2937",
            padding: 16,
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Tạo buổi học</h2>

          <label style={{ fontSize: 13, color: "#9ca3af" }}>
            Lớp
            <select
              value={lopId || ""}
              onChange={(e) => handleSelectClass(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- Chọn lớp --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.ten_lop}
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 13, color: "#9ca3af" }}>
            Môn học (tuỳ chọn)
            <select
              value={monhocId || ""}
              onChange={(e) => setMonhocId(e.target.value || null)}
              style={inputStyle}
            >
              <option value="">Không gán</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ten_mon}
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 13, color: "#9ca3af" }}>
            Giảng viên (tuỳ chọn)
            <select
              value={teacherId || ""}
              onChange={(e) => setTeacherId(e.target.value || null)}
              style={inputStyle}
            >
              <option value="">Chưa gán GV</option>
              {teachers.map((t) => (
                <option key={t.nguoi_dung_id} value={t.nguoi_dung_id}>
                  {t.ho_ten || t.ma_sinh_vien || t.nguoi_dung_id}
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 13, color: "#9ca3af" }}>
            Bắt đầu
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={{ fontSize: 13, color: "#9ca3af" }}>
            Kết thúc
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              style={inputStyle}
            />
          </label>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
              marginBottom: 8,
            }}
          >
            <label style={{ fontSize: 13, color: "#9ca3af", flex: 1 }}>
              Đúng giờ (phút)
              <input
                value={onTimeMinutes}
                onChange={(e) => setOnTimeMinutes(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ fontSize: 13, color: "#9ca3af", flex: 1 }}>
              Trễ sau (phút)
              <input
                value={lateMinutes}
                onChange={(e) => setLateMinutes(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>

          <button
            onClick={handleCreateSession}
            disabled={creating}
            style={{
              marginTop: 8,
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
            {creating ? "Đang tạo..." : "Tạo buổi học"}
          </button>
        </div>

        {/* Danh sách buổi */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #1f2937",
            padding: 16,
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Buổi học của lớp</h2>
          {lopId ? (
            loadingSessions ? (
              <div>Đang tải...</div>
            ) : sessions.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: 13 }}>
                Chưa có buổi học cho lớp này.
              </div>
            ) : (
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#020617" }}>
                      <th style={thStyle}>Môn</th>
                      <th style={thStyle}>Bắt đầu</th>
                      <th style={thStyle}>Kết thúc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id} style={{ borderTop: "1px solid #111827" }}>
                        <td style={tdStyle}>
                          {(s as any).monhoc?.ten_mon || "—"}
                        </td>
                        <td style={tdStyle}>
                          {new Date(s.thoi_gian_bat_dau).toLocaleString()}
                        </td>
                        <td style={tdStyle}>
                          {new Date(s.thoi_gian_ket_thuc).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div style={{ color: "#9ca3af", fontSize: 13 }}>
              Chọn lớp ở bên trái để xem buổi.
            </div>
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
const tdStyle: React.CSSProperties = { padding: "6px 8px" };
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
