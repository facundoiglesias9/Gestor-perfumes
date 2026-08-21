"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    Trash2, Search, Info, Database, ShieldAlert, AlertTriangle, 
    ChevronDown, ChevronUp, Activity, ShieldCheck, Bug, 
    Navigation, LogIn, Lock, CheckCircle2, ServerCrash, Eye
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";

type LogEntry = {
    id: string;
    timestamp: string;
    type: "info" | "error" | "db" | "auth" | "warn";
    message: string;
    details?: any;
};

export default function LogsPage() {
    const { currentUser } = useAppContext();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    // Load and Subscribe to Local Storage Logs
    useEffect(() => {
        const savedLogs = localStorage.getItem("system_logs");
        if (savedLogs) {
            try { setLogs(JSON.parse(savedLogs)); } catch (e) { }
        }

        // We listen to the global broadcast emitted from AppContext
        (window as any).__onNewLog = (log: LogEntry) => {
            setLogs(prev => [log, ...prev].slice(0, 500)); // Keep last 500
        };

        return () => {
            delete (window as any).__onNewLog;
        };
    }, []);

    const clearLogs = () => {
        if (window.confirm("¿Estás seguro que deseas limpiar el registro de auditoría? Toda la actividad previa se borrará localmente.")) {
            setLogs([]);
            localStorage.removeItem("system_logs");
        }
    };

    // Filter Logic
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const content = `${log.message} ${JSON.stringify(log.details || "")}`.toLowerCase();
            const search = searchTerm.toLowerCase();
            const matchesSearch = content.includes(search);
            const matchesCategory = filterCategory === "all" || log.type === filterCategory;
            return matchesSearch && matchesCategory;
        });
    }, [logs, searchTerm, filterCategory]);

    // KPI Counters
    const kpis = useMemo(() => {
        return {
            total: logs.length,
            info: logs.filter(l => l.type === "info").length,
            errors: logs.filter(l => l.type === "error" || l.type === "warn").length,
            auth: logs.filter(l => l.type === "auth").length,
            db: logs.filter(l => l.type === "db").length,
        };
    }, [logs]);

    // Visual Helpers
    const getLogVisuals = (log: LogEntry) => {
        // Special case for Navigation logs recorded as "info"
        if (log.type === "info" && log.message.toLowerCase().includes("navegando a")) {
            return {
                icon: Navigation,
                color: "text-blue-500 dark:text-blue-400",
                bg: "bg-blue-50 dark:bg-blue-500/10",
                border: "border-blue-200 dark:border-blue-500/20",
                label: "NAVEGACIÓN",
                stripe: "bg-blue-500"
            };
        }

        // Special case for Success vs Failed Login (Auth)
        if (log.type === "auth") {
            const isSuccess = log.message.toLowerCase().includes("exitoso");
            return {
                icon: isSuccess ? ShieldCheck : Lock,
                color: isSuccess ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400",
                bg: isSuccess ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-rose-50 dark:bg-rose-500/10",
                border: isSuccess ? "border-emerald-200 dark:border-emerald-500/20" : "border-rose-200 dark:border-rose-500/20",
                label: isSuccess ? "INGRESO OK" : "ING. DENEGADO",
                stripe: isSuccess ? "bg-emerald-500" : "bg-rose-500"
            };
        }

        // DB operations mapping
        if (log.type === "db") {
            const isError = log.message.toLowerCase().includes("error") || log.message.toLowerCase().includes("fallo");
            return {
                icon: isError ? ServerCrash : Database,
                color: isError ? "text-[#C9866F] dark:text-[#C9866F]" : "text-[#7D9878] dark:text-[#A3B69B]",
                bg: isError ? "bg-[#C9866F]/10" : "bg-[#7D9878]/10",
                border: isError ? "border-[#C9866F]/20" : "border-[#7D9878]/20",
                label: isError ? "DB ERROR" : "BASE DE DATOS",
                stripe: isError ? "bg-[#C9866F]" : "bg-[#7D9878]"
            };
        }

        switch (log.type) {
            case "error": return { icon: Bug, color: "text-[#C9866F] dark:text-[#C9866F]", bg: "bg-[#C9866F]/10", border: "border-[#C9866F]/20", label: "ERROR CRÍTICO", stripe: "bg-[#C9866F]" };
            case "warn": return { icon: AlertTriangle, color: "text-[#DAC4AA] dark:text-[#DAC4AA]", bg: "bg-[#DAC4AA]/10", border: "border-[#DAC4AA]/20", label: "ADVERTENCIA", stripe: "bg-[#DAC4AA]" };
            case "info":
            default:
                return { icon: CheckCircle2, color: "text-[#7D9878] dark:text-[#A3B69B]", bg: "bg-[#7D9878]/10", border: "border-[#7D9878]/20", label: "SISTEMA (OK)", stripe: "bg-[#7D9878]" };
        }
    };

    if (currentUser?.role !== "admin") {
        return (
            <div className="flex items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
                <div className="text-center p-12 bg-white dark:bg-[#242723] rounded-[2rem] border border-[#E6DFD5] dark:border-[#353B33] shadow-2xl">
                    <div className="w-24 h-24 bg-[#C9866F]/10 rounded-full flex items-center justify-center mx-auto mb-6 outline outline-8 outline-[#C9866F]/10">
                        <Lock className="w-10 h-10 text-[#C9866F]" />
                    </div>
                    <h1 className="text-3xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">Acceso Restringido</h1>
                    <p className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 mt-2 font-bold">La consola de sistema es exclusiva para administradores.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700 relative h-full flex flex-col">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-[#242723] p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-[#E6DFD5] dark:border-[#353B33] transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#7D9878] dark:text-[#A3B69B] text-xs font-bold tracking-widest uppercase mb-1 border border-[#E6DFD5] dark:border-[#353B33]">
                        <Activity className="w-3.5 h-3.5" />
                        Consola de Auditoría
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">
                        Logs
                    </h1>
                    <p className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 text-lg max-w-xl leading-relaxed font-medium">
                        Monitoreo en tiempo real. Visualizá quién entra, qué navega, el estado de la base de datos y cualquier anomalía.
                    </p>
                </div>

                <div className="flex gap-4">
                    <button onClick={clearLogs} className="flex items-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C] dark:text-[#F4EFEA] font-bold hover:bg-[#C9866F]/10 hover:text-[#C9866F] hover:border-[#C9866F]/30 transition-all active:scale-95">
                        <Trash2 className="w-5 h-5" />
                        VACIAR REGISTRO
                    </button>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 shrink-0">
                <div onClick={() => setFilterCategory('all')} className={`cursor-pointer transition-all border p-6 rounded-[2rem] shadow-sm flex items-center justify-between group ${filterCategory === 'all' ? 'bg-[#7D9878]/15 dark:bg-[#7D9878]/20 border-[#7D9878] scale-105' : 'bg-white dark:bg-[#242723] border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]'}`}>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 drop-shadow-sm mb-1.5">Todas las Clases</p>
                        <h3 className="text-3xl font-black text-[#2C2C2C] dark:text-white tabular-nums font-brand">{kpis.total}</h3>
                    </div>
                </div>
                <div onClick={() => setFilterCategory('info')} className={`cursor-pointer transition-all border p-6 rounded-[2rem] shadow-sm flex items-center justify-between group ${filterCategory === 'info' ? 'bg-[#7D9878]/15 dark:bg-[#7D9878]/20 border-[#7D9878] scale-105' : 'bg-white dark:bg-[#242723] border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]'}`}>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#7D9878] dark:text-[#A3B69B] drop-shadow-sm mb-1.5">Info / Navegación</p>
                        <h3 className="text-3xl font-black text-[#7D9878] dark:text-[#A3B69B] tabular-nums font-brand">{kpis.info}</h3>
                    </div>
                </div>
                <div onClick={() => setFilterCategory('error')} className={`cursor-pointer transition-all border p-6 rounded-[2rem] shadow-sm flex items-center justify-between group overflow-hidden relative ${filterCategory === 'error' || filterCategory === 'warn' ? 'bg-[#C9866F]/15 dark:bg-[#C9866F]/20 border-[#C9866F] scale-105' : 'bg-white dark:bg-[#242723] border-[#E6DFD5] dark:border-[#353B33] hover:border-[#C9866F]'}`}>
                    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl transition-colors ${kpis.errors > 0 ? 'bg-[#C9866F]/20' : 'bg-transparent'}`}></div>
                    <div className="relative z-10 w-full">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#C9866F] drop-shadow-sm mb-1.5 line-clamp-1">Errores Y Alertas</p>
                        <h3 className="text-3xl font-black text-[#C9866F] tabular-nums font-brand">{kpis.errors}</h3>
                    </div>
                </div>
                <div onClick={() => setFilterCategory('auth')} className={`cursor-pointer transition-all border p-6 rounded-[2rem] shadow-sm flex items-center justify-between group ${filterCategory === 'auth' ? 'bg-[#DAC4AA]/15 dark:bg-[#DAC4AA]/20 border-[#DAC4AA] scale-105' : 'bg-white dark:bg-[#242723] border-[#E6DFD5] dark:border-[#353B33] hover:border-[#DAC4AA]'}`}>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#DAC4AA] drop-shadow-sm mb-1.5">Autenticación</p>
                        <h3 className="text-3xl font-black text-[#DAC4AA] tabular-nums font-brand">{kpis.auth}</h3>
                    </div>
                </div>
                <div onClick={() => setFilterCategory('db')} className={`cursor-pointer transition-all border p-6 rounded-[2rem] shadow-sm flex items-center justify-between group ${filterCategory === 'db' ? 'bg-[#A3B69B]/15 dark:bg-[#A3B69B]/20 border-[#A3B69B] scale-105' : 'bg-white dark:bg-[#242723] border-[#E6DFD5] dark:border-[#353B33] hover:border-[#A3B69B]'}`}>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#A3B69B] drop-shadow-sm mb-1.5">Base de Datos</p>
                        <h3 className="text-3xl font-black text-[#A3B69B] tabular-nums font-brand">{kpis.db}</h3>
                    </div>
                </div>
            </div>

            {/* List & Filter Section */}
            <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col flex-1 min-h-[500px] overflow-hidden">
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-4 border-b border-[#E6DFD5] dark:border-[#353B33] bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 group-focus-within:text-[#7D9878] transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por usuario, error o detalle en formato texto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-3.5 pl-14 pr-6 text-[#2C2C2C] dark:text-[#F4EFEA] font-semibold focus:outline-none focus:border-[#7D9878] transition-all"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl px-6 py-3.5 text-sm font-black uppercase tracking-widest text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none appearance-none cursor-pointer"
                    >
                        <option value="all">TODAS LAS CLASES</option>
                        <option value="info">INFO / NAVEGACIÓN</option>
                        <option value="auth">AUTENTICACIÓN</option>
                        <option value="error">ERRORES GRAVES</option>
                        <option value="warn">ADVERTENCIAS</option>
                        <option value="db">BASE DE DATOS</option>
                    </select>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar bg-[#F9F6F0]/50 dark:bg-[#1B1D1A]">
                    {filteredLogs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 space-y-4">
                            <ShieldCheck className="w-16 h-16 opacity-30" />
                            <p className="font-bold text-lg">No hay registros para este filtro.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 pb-8">
                            {filteredLogs.map(log => {
                                const vis = getLogVisuals(log);
                                const Icon = vis.icon;
                                const isExpanded = expandedLogId === log.id;

                                // Format timestamp nicely
                                const timestampSplit = log.timestamp.split(', ');
                                const datePart = timestampSplit[0] && timestampSplit[0].includes('/') ? timestampSplit[0] : "";
                                const timePart = timestampSplit[1] || log.timestamp;

                                return (
                                    <div key={log.id} className="relative group bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-[1.25rem] shadow-sm hover:shadow-md transition-all overflow-hidden">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${vis.stripe}`} />
                                        
                                        <div 
                                            className={`p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 pl-6 cursor-pointer select-none`}
                                            onClick={() => log.details ? setExpandedLogId(isExpanded ? null : log.id) : null}
                                        >
                                            {/* Date / Time Column */}
                                            <div className="flex flex-col shrink-0 w-[140px]">
                                                <span className="text-[#2C2C2C] dark:text-[#F4EFEA] font-extrabold tabular-nums tracking-tight">{timePart}</span>
                                                <span className="text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 text-[10px] uppercase font-black tracking-widest">{datePart || "HOY"}</span>
                                            </div>

                                            {/* Badge Layout */}
                                            <div className="shrink-0 w-[150px]">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${vis.color} ${vis.bg} ${vis.border}`}>
                                                    <Icon className="w-3.5 h-3.5" />
                                                    {vis.label}
                                                </span>
                                            </div>

                                            {/* Message */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[#2C2C2C] dark:text-[#F4EFEA] font-bold text-sm leading-relaxed overflow-wrap break-word pr-4">
                                                    {log.message}
                                                </p>
                                            </div>

                                            {/* Expand action */}
                                            <div className="shrink-0 flex items-center justify-end w-[80px]">
                                                {log.details ? (
                                                    <div className={`p-2 rounded-xl transition-colors flex items-center gap-2 text-[10px] font-black tracking-widest uppercase ${isExpanded ? 'bg-[#7D9878]/20 text-[#7D9878] dark:text-[#A3B69B]' : 'text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:bg-[#7D9878]/10 hover:text-[#7D9878]'}`}>
                                                        <Eye className="w-4 h-4" />
                                                        DATA
                                                    </div>
                                                ) : (
                                                    <span className="text-[#2C2C2C]/30 dark:text-[#F4EFEA]/30 text-[10px] font-black tracking-widest uppercase items-center flex gap-1"><Info className="w-3.5 h-3.5"/> N/A</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Dropdown Payload JSON */}
                                        {isExpanded && log.details && (
                                            <div className="px-6 pb-6 pt-2 pl-6 md:pl-[330px] border-t border-[#E6DFD5] dark:border-[#353B33] bg-[#F9F6F0] dark:bg-[#1B1D1A] animate-in slide-in-from-top-2 duration-300">
                                                <div className="p-4 bg-[#1B1D1A] text-[#A3B69B] font-mono text-[11px] rounded-xl overflow-x-auto border border-[#353B33] shadow-inner">
                                                    <pre>{JSON.stringify(log.details, null, 2)}</pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
