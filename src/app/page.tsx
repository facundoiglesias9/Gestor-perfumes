"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { Loader2 } from "lucide-react";

export default function HomePage() {
    const { currentUser, mounted } = useAppContext();
    const router = useRouter();

    useEffect(() => {
        if (!mounted) return;
        if (currentUser) {
            router.replace("/lista-precios");
        } else {
            router.replace("/login");
        }
    }, [currentUser, mounted, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F9F6F0] dark:bg-[#1B1D1A]">
            <div className="text-center space-y-4">
                <Loader2 className="w-10 h-10 text-[#7D9878] animate-spin mx-auto" />
                <p className="text-xs font-black text-[#7D9878] dark:text-[#A3B69B] uppercase tracking-widest animate-pulse font-brand">
                    Accediendo a Scenta...
                </p>
            </div>
        </div>
    );
}
