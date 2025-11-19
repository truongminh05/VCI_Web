"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Subject {
  id: string;
  ma_mon: string;
  ten_mon: string;
}

export default function AdminSubjectsPage() {
  const [items, setItems] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("monhoc")
        .select("id, ma_mon, ten_mon")
        .order("ma_mon", { ascending: true });
      if (error) throw error;
      setItems((data as Subject[]) || []);
    } catch (e: any) {
      alert("Lỗi tải môn học: " + (e.message || "Không thể tải dữ liệu."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setCode("");
    setName("");
  };

  const startEdit = (s: Subject) => {
    setEditingId(s.id);
    setCode(s.ma_mon);
    setName(s.ten_mon);
  };

  const handleSave = async () => {
    if (!code.trim() || !name.trim()) {
      alert("Nhập đầy đủ mã môn và tên môn.");
      return;
    }

    try {
      const payload = {
        ma_mon: code.trim(),
        ten_mon: name.trim(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("monhoc")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("monhoc").insert(payload);
        if (error) throw error;
      }

      alert("Đã lưu môn học.");
      resetForm();
      load();
    } catch (e: any) {
      alert("Lỗi lưu môn học: " + (e.message || "Không thể lưu."));
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Quản lý môn học</h1>
      <p style={{ color: "#9ca3af", marginBottom: 16 }}>
        Tạo và chỉnh sửa danh sách môn học dùng cho lớp và buổi học.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
          gap: 24,
        }}
      >
        {/* Danh sách */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #1f2937",
            overflow: "hidden",
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
                <th style={thStyle}>Mã môn</th>
                <th style={thStyle}>Tên môn</th>
                <th style={thStyle}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid #111827" }}>
                  <td style={tdStyle}>{s.ma_mon}</td>
                  <td style={tdStyle}>{s.ten_mon}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => startEdit(s)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 9999,
                        border: "none",
                        background: "#4b5563",
                        color: "white",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr>
                  <td style={tdStyle} colSpan={3}>
                    Chưa có môn học.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Form tạo / sửa */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #1f2937",
            padding: 16,
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>
            {editingId ? "Sửa môn học" : "Thêm môn học"}
          </h2>

          <label style={{ fontSize: 13, color: "#9ca3af" }}>
            Mã môn
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={{ fontSize: 13, color: "#9ca3af" }}>
            Tên môn
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </label>

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button
              onClick={handleSave}
              style={{
                padding: "8px 16px",
                borderRadius: 9999,
                border: "none",
                background: "#22c55e",
                color: "black",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Lưu
            </button>
            {editingId && (
              <button
                onClick={resetForm}
                style={{
                  padding: "8px 14px",
                  borderRadius: 9999,
                  border: "none",
                  background: "#374151",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Huỷ
              </button>
            )}
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
  marginBottom: 12,
  padding: "7px 9px",
  borderRadius: 8,
  border: "1px solid #374151",
  background: "#020617",
  color: "white",
};
