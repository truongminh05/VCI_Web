"use client";

import React, { Key, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface LopRow {
  id: string;
  ten_lop: string;
  ma_lop: string | null;
}

interface BuoiRow {
  id: string;
  thoi_gian_bat_dau: string;
}

interface ExportRow {
  [x: string]: Key | null | undefined;
  buoihoc_id: string;
  lop_id: string;
  ten_lop: string;
  ma_lop: string | null;
  monhoc_id: string | null;
  ten_mon: string | null;
  ma_mon: string | null;
  sv_ho_ten: string;
  sv_ma_sinh_vien: string;
  thoi_gian_bat_dau: string;
  thoi_gian_ket_thuc: string;
  trang_thai_full: string; // <= mới
  checkin_luc: string | null;
}

export default function AttendanceReportPage() {
  const [classes, setClasses] = useState<LopRow[]>([]);
  const [sessions, setSessions] = useState<BuoiRow[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [rows, setRows] = useState<ExportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ========== TẢI DANH SÁCH LỚP ==========
  const loadClasses = async () => {
    const { data, error } = await supabase
      .from("lop")
      .select("id, ten_lop, ma_lop")
      .order("ten_lop", { ascending: true });

    if (error) {
      console.error(error);
      alert("Lỗi tải danh sách lớp");
      return;
    }
    setClasses(data as LopRow[]);
  };

  useEffect(() => {
    loadClasses();
  }, []);

  // ========== TẢI BUỔI HỌC KHI CHỌN LỚP ==========
  const loadSessions = async (lopId: string) => {
    if (!lopId) {
      setSessions([]);
      setSelectedSession("");
      return;
    }
    const { data, error } = await supabase
      .from("buoihoc")
      .select("id, thoi_gian_bat_dau")
      .eq("lop_id", lopId)
      .order("thoi_gian_bat_dau", { ascending: false });

    if (error) {
      console.error(error);
      alert("Lỗi tải danh sách buổi học");
      return;
    }
    setSessions(data as BuoiRow[]);
    setSelectedSession(""); // mặc định “tất cả buổi của lớp”
  };

  const handleClassChange = (lopId: string) => {
    setSelectedClass(lopId);
    loadSessions(lopId);
    setRows([]);
  };

  // ========== LẤY DỮ LIỆU BÁO CÁO ==========
  const fetchReport = async () => {
    if (!selectedClass) {
      alert("Vui lòng chọn lớp.");
      return;
    }

    try {
      setLoading(true);
      setRows([]);

      if (selectedSession) {
        // ===== TRƯỜNG HỢP 1: chọn CỤ THỂ 1 buổi → dùng v_diemdanh_lop_buoi =====
        const { data, error } = await supabase
          .from("v_diemdanh_lop_buoi")
          .select(
            "diemdanh_id, buoihoc_id, lop_id, ten_lop, ma_lop, monhoc_id, ten_mon, ma_mon, sv_ho_ten, sv_ma_sinh_vien, thoi_gian_bat_dau, thoi_gian_ket_thuc, trang_thai_full, checkin_luc"
          )
          .eq("lop_id", selectedClass)
          .eq("buoihoc_id", selectedSession)
          .order("sv_ma_sinh_vien", { ascending: true });

        if (error) throw error;
        setRows((data as ExportRow[]) || []);
      } else {
        // ===== TRƯỜNG HỢP 2: không chọn buổi → có thể giữ lại cách cũ theo khoảng ngày
        // (tuỳ bạn, có thể vẫn dùng v_diemdanh_export như trước)
        alert(
          "Để báo cáo đầy đủ cả đúng giờ / trễ / vắng, hãy chọn 1 buổi cụ thể."
        );
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Không thể tải dữ liệu báo cáo.");
    } finally {
      setLoading(false);
    }
  };

  // ========== XUẤT EXCEL ==========
  const exportToExcel = async () => {
    if (!rows.length) {
      alert("Không có dữ liệu để xuất. Hãy bấm 'Xem báo cáo' trước.");
      return;
    }

    try {
      setExporting(true);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("BaoCaoDiemDanh");

      // ===== 1) Định nghĩa cột =====
      worksheet.columns = [
        { header: "Lớp", key: "lop", width: 25 },
        { header: "Mã lớp", key: "ma_lop", width: 12 },
        { header: "Môn", key: "mon", width: 22 },
        { header: "Mã SV", key: "ma_sv", width: 10 },
        { header: "Họ tên SV", key: "ho_ten_sv", width: 25 },
        { header: "Trạng thái", key: "trang_thai", width: 12 },
        { header: "Thời gian điểm danh", key: "checkin", width: 24 },
        { header: "Bắt đầu buổi", key: "bat_dau", width: 22 },
        { header: "Kết thúc buổi", key: "ket_thuc", width: 22 },
      ];

      // ===== 2) Style header =====
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF111827" }, // xanh đậm
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };

      // ===== 3) Thêm dữ liệu + tô màu so le =====
      rows.forEach((r, index) => {
        const excelRow = worksheet.addRow({
          lop: r.ten_lop,
          ma_lop: r.ma_lop ?? "",
          mon: r.ten_mon ?? "",
          ma_sv: r.sv_ma_sinh_vien,
          ho_ten_sv: r.sv_ho_ten,
          trang_thai: r.trang_thai_full,
          checkin: r.checkin_luc
            ? new Date(r.checkin_luc).toLocaleString("vi-VN")
            : "",
          bat_dau: new Date(r.thoi_gian_bat_dau).toLocaleString("vi-VN"),
          ket_thuc: new Date(r.thoi_gian_ket_thuc).toLocaleString("vi-VN"),
        });

        // index: 0 là dòng dữ liệu đầu tiên (Excel row 2)
        const isEven = index % 2 === 0; // để so le
        const fillColor = isEven ? "FFF9FAFB" : "FFE5E7EB"; // 2 màu xám rất nhạt

        excelRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: fillColor },
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FF111827" } },
            bottom: { style: "thin", color: { argb: "FF111827" } },
          };
        });
      });

      // Auto filter cho header
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: worksheet.columns.length },
      };

      // ===== 4) Ghi file và tải về =====
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const lopName =
        classes.find((c) => c.id === selectedClass)?.ten_lop || "lop";
      const fileName = `bao_cao_diemdanh_${lopName.replace(/\s+/g, "_")}.xlsx`;

      saveAs(blob, fileName);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Không thể xuất Excel.");
    } finally {
      setExporting(false);
    }
  };

  type SheetRow = {
    Lớp: string;
    "Mã lớp": string;
    Môn: string;
    "Mã SV": string;
    "Họ tên SV": string;
    "Trạng thái": string;
    "Thời gian điểm danh": string;
    "Bắt đầu buổi": string;
    "Kết thúc buổi": string;
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Báo cáo điểm danh</h1>
      <p className="text-sm text-slate-400 mb-4">
        Chọn lớp, buổi học và khoảng ngày để xem báo cáo và xuất ra file Excel.
      </p>

      {/* BỘ LỌC */}
      <div className="mb-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Lớp
          </label>
          <select
            value={selectedClass}
            onChange={(e) => handleClassChange(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">-- Chọn lớp --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.ten_lop}
                {c.ma_lop ? ` (${c.ma_lop})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Buổi học
          </label>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            disabled={!sessions.length}
          >
            <option value="">Tất cả buổi của lớp</option>
            {sessions.map((b) => (
              <option key={b.id} value={b.id}>
                {new Date(b.thoi_gian_bat_dau).toLocaleString("vi-VN")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Từ ngày
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Đến ngày
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
        </div>
      </div>

      {/* NÚT HÀNH ĐỘNG */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={fetchReport}
          disabled={loading}
          className="inline-flex items-center rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-400 disabled:opacity-70"
        >
          {loading ? "Đang tải..." : "Xem báo cáo"}
        </button>

        <button
          onClick={exportToExcel}
          disabled={exporting || !rows.length}
          className="inline-flex items-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-emerald-400 disabled:opacity-60"
        >
          {exporting ? "Đang xuất..." : "Xuất Excel"}
        </button>

        {rows.length > 0 && (
          <span className="text-xs text-slate-400">
            {rows.length} dòng điểm danh.
          </span>
        )}
      </div>

      {/* BẢNG XEM TRƯỚC */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
        <div className="max-h-[420px] overflow-auto">
          <table className="min-w-full text-xs text-slate-100">
            <thead className="bg-slate-900 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">Lớp</th>
                <th className="px-3 py-2 text-left">Mã lớp</th>
                <th className="px-3 py-2 text-left">Môn</th>
                <th className="px-3 py-2 text-left">Mã SV</th>
                <th className="px-3 py-2 text-left">Họ tên SV</th>
                <th className="px-3 py-2 text-left">Trạng thái</th>
                <th className="px-3 py-2 text-left">Checkin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.diemdanh_id ?? `${r.buoihoc_id}-${r.sv_ma_sinh_vien}`} // ✅ fallback
                  className="border-t border-slate-800"
                >
                  <td className="px-3 py-1.5">{r.ten_lop}</td>
                  <td className="px-3 py-1.5">{r.ma_lop}</td>
                  <td className="px-3 py-1.5">{r.ten_mon}</td>
                  <td className="px-3 py-1.5">{r.sv_ma_sinh_vien}</td>
                  <td className="px-3 py-1.5">{r.sv_ho_ten}</td>
                  <td className="px-3 py-1.5 capitalize">
                    {r.trang_thai_full}
                  </td>
                  <td className="px-3 py-1.5">
                    {r.checkin_luc
                      ? new Date(r.checkin_luc).toLocaleString("vi-VN")
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
