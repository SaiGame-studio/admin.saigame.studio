"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function CoinTopUpRedirect() {
    const router = useRouter();
    useEffect(() => { router.replace("/admin/payments"); }, [router]);
    return null;
}
