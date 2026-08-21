import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#F9F6F0] dark:bg-[#1B1D1A]">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-[#7D9878]/20 border-t-[#7D9878] animate-spin"></div>
                    <Loader2 className="w-8 h-8 text-[#7D9878] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div className="flex flex-col items-center">
                    <p className="text-xl font-black text-[#7D9878] dark:text-[#A3B69B] animate-pulse font-brand">
                        Cargando Scenta
                    </p>
                    <p className="text-[10px] font-black text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest mt-1">
                        Un momento por favor...
                    </p>
                </div>
            </div>
        </div>
    );
}
