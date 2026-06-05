"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/libs/tts/auth/authApi";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) router.replace("/account");
    else router.replace("/login");
  }, [router]);

  return null;
}
