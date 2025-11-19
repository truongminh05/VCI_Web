"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Role = "sinhvien" | "giangvien" | "quantri" | null;

interface Hoso {
  nguoi_dung_id: string;
  ho_ten: string | null;
  ma_sinh_vien: string | null;
  vai_tro: Role;
  ngay_sinh: string | null;
  gioi_tinh: string | null;
  que_quan: string | null;
  so_dien_thoai: string | null;
}

interface AuthContextValue {
  loading: boolean;
  user: any | null;
  hoso: Hoso | null;
  role: Role;
  refreshHoso: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [hoso, setHoso] = useState<Hoso | null>(null);
  const [role, setRole] = useState<Role>(null);

  const loadSessionAndProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.log("[Auth] getSession error", error.message);

      const session = data?.session ?? null;
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data: h, error: hErr } = await supabase
          .from("hoso")
          .select(
            "nguoi_dung_id, ho_ten, ma_sinh_vien, vai_tro, ngay_sinh, gioi_tinh, que_quan, so_dien_thoai"
          )
          .eq("nguoi_dung_id", session.user.id)
          .maybeSingle();

        if (hErr) {
          console.log("[Auth] load hoso error", hErr.message);
          setHoso(null);
          setRole(null);
        } else {
          setHoso(h as Hoso);
          setRole((h?.vai_tro as Role) ?? null);
        }
      } else {
        setHoso(null);
        setRole(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessionAndProfile();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        setHoso(null);
        setRole(null);
      } else {
        loadSessionAndProfile();
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshHoso = async () => {
    if (!user?.id) return;
    const { data: h, error } = await supabase
      .from("hoso")
      .select(
        "nguoi_dung_id, ho_ten, ma_sinh_vien, vai_tro, ngay_sinh, gioi_tinh, que_quan, so_dien_thoai"
      )
      .eq("nguoi_dung_id", user.id)
      .maybeSingle();
    if (!error && h) {
      setHoso(h as Hoso);
      setRole((h.vai_tro as Role) ?? null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setHoso(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{ loading, user, hoso, role, refreshHoso, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
