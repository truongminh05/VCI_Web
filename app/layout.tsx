import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./(providers)/AuthContext";

export const metadata: Metadata = {
  title: "VCI Attendance Admin",
  description: "Trang quản trị điểm danh VCI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
