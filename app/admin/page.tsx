"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<{
    students: number;
    teachers: number;
    classes: number;
    sessions: number;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ count: sv }, { count: gv }, { count: lop }, { count: buoi }] =
        await Promise.all([
          supabase
            .from("hoso")
            .select("nguoi_dung_id", { count: "exact", head: true })
            .eq("vai_tro", "sinhvien"),
          supabase
            .from("hoso")
            .select("nguoi_dung_id", { count: "exact", head: true })
            .eq("vai_tro", "giangvien"),
          supabase.from("lop").select("id", { count: "exact", head: true }),
          supabase.from("buoihoc").select("id", { count: "exact", head: true }),
        ]);

      setStats({
        students: sv ?? 0,
        teachers: gv ?? 0,
        classes: lop ?? 0,
        sessions: buoi ?? 0,
      });
    };
    load();
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Tổng quan</h1>
      <p style={{ color: "#9ca3af", marginBottom: 24 }}>
        Thống kê nhanh hệ thống điểm danh VCI.
      </p>
      {stats ? (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            ["Sinh viên", stats.students],
            ["Giảng viên", stats.teachers],
            ["Lớp học", stats.classes],
            ["Buổi học", stats.sessions],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                flex: "0 0 200px",
                background: "#020617",
                borderRadius: 12,
                border: "1px solid #1f2937",
                padding: 16,
              }}
            >
              <div style={{ fontSize: 13, color: "#9ca3af" }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div>Đang tải...</div>
      )}
    </div>
  );
}
