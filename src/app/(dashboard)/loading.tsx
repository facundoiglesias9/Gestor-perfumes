import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-[#0f172a]">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-600 animate-spin"></div>
                    <Loader2 className="w-8 h-8 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div className="flex flex-col items-center">
                    <p className="text-xl font-black bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent animate-pulse">
                        Iniciando Scenta
                    </p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Cargando módulos y base de datos...
                    </p>
                </div>
            </div>
        </div>
    );
}
