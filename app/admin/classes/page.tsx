"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from "xlsx";

interface LopRow {
  id: string;
  ten_lop: string;
  ma_lop: string | null;
  monhoc_id: string | null;
  monhoc?: { ten_mon: string; ma_mon: string };
}

interface RosterItem {
  id: string; // auth user id hoặc "imp:<id>"
  ho_ten: string;
  ma_sinh_vien: string;
  noAccount?: boolean; // true nếu từ dangky_import
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<LopRow[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selected, setSelected] = useState<LopRow | null>(null);

  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // form tạo lớp
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [monhocId, setMonhocId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);

  // thêm SV đã có tài khoản
  const [newStudentCode, setNewStudentCode] = useState("");
  // import Excel
  const [importing, setImporting] = useState(false);

  // ====== LOAD LỚP + MÔN ======
  const loadClasses = async () => {
    setLoadingClasses(true);
    try {
      const { data, error } = await supabase
        .from("lop")
        .select(
          "id, ten_lop, ma_lop, monhoc_id, monhoc:monhoc_id(ten_mon, ma_mon)"
        )
        .order("ten_lop", { ascending: true });

      if (error) throw error;
      setClasses((data as any[]) || []);
    } catch (e: any) {
      alert("Lỗi tải danh sách lớp: " + (e.message || "Không thể tải."));
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadSubjects = async () => {
    const { data, error } = await supabase
      .from("monhoc")
      .select("id, ten_mon, ma_mon")
      .order("ma_mon", { ascending: true });
    if (!error && data) {
      setSubjects(
        data.map((s: any) => ({
          id: s.id,
          name: `${s.ma_mon} - ${s.ten_mon}`,
        }))
      );
    }
  };

  useEffect(() => {
    loadClasses();
    loadSubjects();
  }, []);

  // ====== TẠO LỚP ======
  const handleCreateClass = async () => {
    const ten = name.trim();
    const ma = code.trim();
    if (!ten) {
      alert("Vui lòng nhập Tên lớp.");
      return;
    }

    try {
      const payload: any = {
        ten_lop: ten,
        ma_lop: ma || null,
        monhoc_id: monhocId,
      };
      const { error } = await supabase.from("lop").insert(payload);
      if (error) throw error;

      alert("Đã tạo lớp.");
      setName("");
      setCode("");
      setMonhocId(null);
      loadClasses();
    } catch (e: any) {
      alert("Lỗi tạo lớp: " + (e.message || "Không thể tạo."));
    }
  };

  // ====== LOAD DANH SÁCH SV CỦA LỚP ======
  const openRoster = async (lop: LopRow) => {
    setSelected(lop);
    setRoster([]);
    setLoadingRoster(true);

    try {
      // a) SV đã có tài khoản -> từ dangky
      const { data: enrolls, error: e1 } = await supabase
        .from("dangky")
        .select("sinh_vien_id")
        .eq("lop_id", lop.id);

      if (e1) throw e1;
      const ids = (enrolls || []).map((x: any) => x.sinh_vien_id);

      let rosterAccounts: RosterItem[] = [];
      if (ids.length) {
        const { data: profiles, error: e2 } = await supabase
          .from("hoso")
          .select("nguoi_dung_id, ho_ten, ma_sinh_vien")
          .in("nguoi_dung_id", ids);
        if (e2) throw e2;

        rosterAccounts = (profiles || []).map((p: any) => ({
          id: p.nguoi_dung_id,
          ho_ten: p.ho_ten || "(Chưa có tên)",
          ma_sinh_vien: p.ma_sinh_vien || "",
        }));
      }

      // b) SV import Excel (chưa có tài khoản) -> từ dangky_import
      const { data: improts, error: e3 } = await supabase
        .from("dangky_import")
        .select("id, ho_ten, ma_sinh_vien")
        .eq("lop_id", lop.id)
        .order("created_at", { ascending: true });

      if (e3) throw e3;

      const rosterImported: RosterItem[] = (improts || []).map((r: any) => ({
        id: `imp:${r.id}`,
        ho_ten: r.ho_ten,
        ma_sinh_vien: r.ma_sinh_vien || "",
        noAccount: true,
      }));

      const merged = [...rosterAccounts, ...rosterImported].sort((a, b) =>
        a.ho_ten.localeCompare(b.ho_ten, "vi")
      );
      setRoster(merged);
    } catch (e: any) {
      alert("Lỗi tải danh sách sinh viên: " + (e.message || "Không thể tải."));
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleSelectClass = (id: string) => {
    const lop = classes.find((c) => c.id === id) || null;
    if (lop) openRoster(lop);
    else {
      setSelected(null);
      setRoster([]);
    }
  };

  // ====== THÊM SV ĐÃ CÓ TÀI KHOẢN (Dựa vào ma_sinh_vien) ======
  const handleAddStudentByCode = async () => {
    if (!selected?.id) {
      alert("Chọn lớp trước.");
      return;
    }
    const code = newStudentCode.trim();
    if (!code) {
      alert("Nhập mã sinh viên.");
      return;
    }
    try {
      // tìm user theo ma_sinh_vien (không phân biệt hoa thường)
      const { data: user, error } = await supabase
        .from("hoso")
        .select("nguoi_dung_id")
        .ilike("ma_sinh_vien", code)
        .maybeSingle();

      if (error) throw error;
      if (!user) {
        alert("Không tìm thấy sinh viên với mã này.");
        return;
      }

      // dùng RPC giống app để thêm vào dangky
      const { error: e2 } = await supabase.rpc("admin_add_student_to_class", {
        p_lop_id: selected.id,
        p_sinh_vien_id: user.nguoi_dung_id,
      });
      if (e2) throw e2;

      alert("Đã thêm sinh viên vào lớp.");
      setNewStudentCode("");
      openRoster(selected);
    } catch (e: any) {
      alert("Lỗi thêm sinh viên: " + (e.message || "Không thể thêm."));
    }
  };

  // ====== XÓA SV KHỎI LỚP (CHỈ SV CÓ TÀI KHOẢN) ======
  const handleRemoveStudent = async (item: RosterItem) => {
    if (!selected?.id) return;
    if (item.noAccount) {
      alert(
        "Sinh viên import Excel hiện đang lưu ở bảng dangky_import. Nếu muốn xoá, xử lý theo nghiệp vụ riêng (hoặc bổ sung RPC admin_remove_import_row)."
      );
      return;
    }
    if (!confirm(`Xoá "${item.ho_ten}" khỏi lớp ${selected.ten_lop}?`)) return;

    try {
      const { error } = await supabase.rpc("admin_remove_student_from_class", {
        p_lop_id: selected.id,
        p_sinh_vien_id: item.id,
      });
      if (error) throw error;
      alert("Đã xoá khỏi lớp.");
      openRoster(selected);
    } catch (e: any) {
      alert("Lỗi xoá: " + (e.message || "Không thể xoá."));
    }
  };

  // ====== IMPORT TỪ EXCEL => BẢNG dangky_import ======
  const handleExcelImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selected?.id) {
      alert("Chọn lớp trước khi import.");
      e.target.value = "";
      return;
    }

    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const workbook = XLSX.read(buf, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
      });

      const payload: any[] = [];

      for (const row of rows) {
        // cố gắng map theo nhiều tên cột phổ biến
        const name =
          row.ho_ten ||
          row["ho_ten"] ||
          row["Họ tên"] ||
          row["Họ Tên"] ||
          row["Ho ten"] ||
          row["Ho_ten"] ||
          row["Ten"];

        const code =
          row.ma_sinh_vien ||
          row["ma_sinh_vien"] ||
          row["Mã sinh viên"] ||
          row["Mã SV"] ||
          row["Ma sinh vien"] ||
          row["Ma SV"];

        if (!name && !code) continue; // bỏ dòng trống

        payload.push({
          lop_id: selected.id,
          ho_ten: name || "",
          ma_sinh_vien: code || null,
        });
      }

      if (!payload.length) {
        alert(
          "File Excel không có dữ liệu hợp lệ. Cần ít nhất cột Họ tên và/hoặc Mã sinh viên."
        );
        e.target.value = "";
        return;
      }

      const { error } = await supabase.from("dangky_import").insert(payload);
      if (error) throw error;

      alert(`Đã import ${payload.length} dòng từ Excel.`);
      await openRoster(selected);

      e.target.value = "";
    } catch (err: any) {
      console.error("[ExcelImport] error", err);
      alert("Lỗi import Excel: " + (err.message || "Không thể xử lý file."));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Quản lý lớp</h1>
      <p style={{ color: "#9ca3af", marginBottom: 16 }}>
        Tạo lớp, gán môn và quản lý danh sách sinh viên (tài khoản + import
        Excel).
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1.7fr)",
          gap: 24,
        }}
      >
        {/* Danh sách lớp + form tạo */}
        <div>
          <div
            style={{
              borderRadius: 12,
              border: "1px solid #1f2937",
              overflow: "hidden",
              marginBottom: 16,
              maxHeight: 380,
              overflowY: "auto",
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
                  <th style={thStyle}>Tên lớp</th>
                  <th style={thStyle}>Mã lớp</th>
                  <th style={thStyle}>Môn</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => handleSelectClass(c.id)}
                    style={{
                      borderTop: "1px solid #111827",
                      background:
                        selected?.id === c.id ? "#111827" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <td style={tdStyle}>{c.ten_lop}</td>
                    <td style={tdStyle}>{c.ma_lop || "—"}</td>
                    <td style={tdStyle}>
                      {c.monhoc
                        ? `${c.monhoc.ma_mon} - ${c.monhoc.ten_mon}`
                        : "—"}
                    </td>
                  </tr>
                ))}
                {classes.length === 0 && !loadingClasses && (
                  <tr>
                    <td style={tdStyle} colSpan={3}>
                      Chưa có lớp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Form tạo lớp */}
          <div
            style={{
              borderRadius: 12,
              border: "1px solid #1f2937",
              padding: 16,
            }}
          >
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>Tạo lớp mới</h2>
            <label style={{ fontSize: 13, color: "#9ca3af" }}>
              Tên lớp
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={{ fontSize: 13, color: "#9ca3af" }}>
              Mã lớp
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={{ fontSize: 13, color: "#9ca3af" }}>
              Môn học
              <select
                value={monhocId || ""}
                onChange={(e) => setMonhocId(e.target.value || null)}
                style={{
                  ...inputStyle,
                  padding: "7px 9px",
                }}
              >
                <option value="">Chưa gán môn</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={handleCreateClass}
              style={{
                marginTop: 8,
                padding: "8px 16px",
                borderRadius: 9999,
                border: "none",
                background: "#22c55e",
                color: "black",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Tạo lớp
            </button>
          </div>
        </div>

        {/* Roster: danh sách SV + thêm + import Excel */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #1f2937",
            padding: 16,
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>
            Danh sách sinh viên {selected ? `- ${selected.ten_lop}` : ""}
          </h2>
          {selected ? (
            <>
              {/* Thêm SV bằng mã SV */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 12,
                  flexWrap: "wrap",
                }}
              >
                <input
                  placeholder="Nhập mã sinh viên để thêm"
                  value={newStudentCode}
                  onChange={(e) => setNewStudentCode(e.target.value)}
                  style={{
                    ...inputStyle,
                    maxWidth: 260,
                    marginBottom: 0,
                  }}
                />
                <button
                  onClick={handleAddStudentByCode}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 9999,
                    border: "none",
                    background: "#4f46e5",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Thêm vào lớp
                </button>
              </div>

              {/* Import Excel */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: "#9ca3af" }}>
                  Import từ Excel
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelImport}
                    disabled={importing}
                    style={{
                      display: "block",
                      marginTop: 4,
                      fontSize: 12,
                      color: "#e5e7eb",
                    }}
                  />
                </label>
                <p
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                    marginTop: 4,
                  }}
                >
                  File nên có cột "Họ tên" và "Mã sinh viên". Các dòng không có
                  dữ liệu sẽ được bỏ qua.
                </p>
              </div>

              {/* Bảng SV */}
              <div
                style={{
                  maxHeight: 320,
                  overflowY: "auto",
                  borderRadius: 8,
                  border: "1px solid #111827",
                }}
              >
                {loadingRoster ? (
                  <div style={{ padding: 12 }}>Đang tải...</div>
                ) : roster.length === 0 ? (
                  <div style={{ padding: 12 }}>Chưa có sinh viên.</div>
                ) : (
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
                        <th style={thStyle}>Nguồn</th>
                        <th style={thStyle}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((r) => (
                        <tr
                          key={r.id}
                          style={{ borderTop: "1px solid #111827" }}
                        >
                          <td style={tdStyle}>{r.ho_ten}</td>
                          <td style={tdStyle}>{r.ma_sinh_vien}</td>
                          <td style={tdStyle}>
                            {r.noAccount ? "Import Excel" : "Tài khoản"}
                          </td>
                          <td style={tdStyle}>
                            {!r.noAccount && (
                              <button
                                onClick={() => handleRemoveStudent(r)}
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
                                Xoá khỏi lớp
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div style={{ color: "#9ca3af", fontSize: 13 }}>
              Chọn một lớp ở bảng bên trái để xem danh sách sinh viên.
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
