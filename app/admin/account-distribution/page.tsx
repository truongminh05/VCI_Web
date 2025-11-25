"use client";

import React, { useEffect, useMemo, useState } from "react";

const SHEET_URL = process.env.NEXT_PUBLIC_SHEET_WEBHOOK_URL!;
// = chính là URL Web App Google Script (exec)

interface SheetAccountRow {
  id: number;
  created_at: string | null;
  lop_id: string;
  lop_ten: string;
  ho_ten: string;
  ma_sinh_vien: string;
  email: string;
  password: string;
  assigned: boolean; // true = đã phát
}

export default function AccountDistributionPage() {
  const [rows, setRows] = useState<SheetAccountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lopFilter, setLopFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // ====== TẢI DỮ LIỆU TỪ GOOGLE SHEET ======
  useEffect(() => {
    const fetchData = async () => {
      if (!SHEET_URL) {
        setError("Chưa cấu hình NEXT_PUBLIC_GSHEET_SYNC_URL");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(SHEET_URL, { cache: "no-store" });
        const json = await res.json();
        if (!json.ok) {
          throw new Error(json.error || "Lỗi đọc Google Sheet");
        }
        setRows(json.rows || []);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Không thể tải dữ liệu từ Google Sheet.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ====== LỌC THEO LỚP + TÌM KIẾM ======
  const classes = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => {
      const key = r.lop_id || r.lop_ten;
      const label = r.lop_ten || r.lop_id;
      if (key && !m.has(key)) m.set(key, label);
    });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (lopFilter && r.lop_id !== lopFilter && r.lop_ten !== lopFilter) {
        return false;
      }
      if (search) {
        const term = search.toLowerCase();
        if (
          !(
            r.ma_sinh_vien.toLowerCase().includes(term) ||
            r.ho_ten.toLowerCase().includes(term) ||
            r.email.toLowerCase().includes(term)
          )
        ) {
          return false;
        }
      }
      return true;
    });
  }, [rows, lopFilter, search]);

  const assigned = filtered.filter((r) => r.assigned);
  const notAssigned = filtered.filter((r) => !r.assigned);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold mb-1">
          Phát tài khoản cho sinh viên
        </h1>
        <p className="text-sm text-slate-400">
          Đọc dữ liệu từ Google Sheet. Cột &quot;Đã phát&quot; trong Sheet là
          checkbox để đánh dấu đã cấp tài khoản cho sinh viên.
        </p>
      </div>

      {/* BỘ LỌC */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Lớp
          </label>
          <select
            value={lopFilter}
            onChange={(e) => setLopFilter(e.target.value)}
            className="min-w-[200px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Tất cả lớp</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Tìm theo tên / MSSV / email
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nhập từ khóa..."
            className="w-[260px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
        </div>

        <div className="text-xs text-slate-500 ml-auto">
          {loading
            ? "Đang tải từ Google Sheet..."
            : `${filtered.length} dòng ( ${assigned.length} đã phát, ${notAssigned.length} chưa phát )`}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 border border-red-700/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* HAI BẢNG: CHƯA PHÁT & ĐÃ PHÁT */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* CHƯA PHÁT */}
        <div className="border border-slate-800 rounded-xl bg-slate-950/80 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <span className="text-sm font-semibold text-amber-300">
              Chưa phát tài khoản ({notAssigned.length})
            </span>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="min-w-full text-xs text-slate-100">
              <thead className="bg-slate-900 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left">Lớp</th>
                  <th className="px-3 py-2 text-left">Mã SV</th>
                  <th className="px-3 py-2 text-left">Họ tên</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Mật khẩu tạm</th>
                </tr>
              </thead>
              <tbody>
                {notAssigned.map((r) => (
                  <tr
                    key={`${r.ma_sinh_vien}-${r.email}`}
                    className="border-t border-slate-800"
                  >
                    <td className="px-3 py-1.5">{r.lop_ten || r.lop_id}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {r.ma_sinh_vien}
                    </td>
                    <td className="px-3 py-1.5">{r.ho_ten}</td>
                    <td className="px-3 py-1.5">{r.email}</td>
                    <td className="px-3 py-1.5 font-mono text-[11px]">
                      {r.password}
                    </td>
                  </tr>
                ))}
                {!notAssigned.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-3 text-center text-slate-500 text-xs"
                    >
                      Không có sinh viên nào chưa phát tài khoản trong bộ lọc
                      hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ĐÃ PHÁT */}
        <div className="border border-slate-800 rounded-xl bg-slate-950/80 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-300">
              Đã phát tài khoản ({assigned.length})
            </span>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="min-w-full text-xs text-slate-100">
              <thead className="bg-slate-900 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left">Lớp</th>
                  <th className="px-3 py-2 text-left">Mã SV</th>
                  <th className="px-3 py-2 text-left">Họ tên</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Đã phát lúc</th>
                </tr>
              </thead>
              <tbody>
                {assigned.map((r) => (
                  <tr
                    key={`${r.ma_sinh_vien}-${r.email}`}
                    className="border-t border-slate-800"
                  >
                    <td className="px-3 py-1.5">{r.lop_ten || r.lop_id}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {r.ma_sinh_vien}
                    </td>
                    <td className="px-3 py-1.5">{r.ho_ten}</td>
                    <td className="px-3 py-1.5">{r.email}</td>
                    <td className="px-3 py-1.5 text-[11px] text-slate-400">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleString("vi-VN")
                        : ""}
                    </td>
                  </tr>
                ))}
                {!assigned.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-3 text-center text-slate-500 text-xs"
                    >
                      Chưa có sinh viên nào được đánh dấu đã phát tài khoản.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
