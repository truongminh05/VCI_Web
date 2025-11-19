"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./(providers)/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (role === "quantri") router.replace("/admin");
    else router.replace("/login");
  }, [user, role, loading, router]);

  return null;
}
