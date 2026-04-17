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
                color: isError ? "text-rose-500 dark:text-rose-400" : "text-purple-500 dark:text-purple-400",
                bg: isError ? "bg-rose-50 dark:bg-rose-500/10" : "bg-purple-50 dark:bg-purple-500/10",
                border: isError ? "border-rose-200 dark:border-rose-500/20" : "border-purple-200 dark:border-purple-500/20",
                label: isError ? "DB ERROR" : "BASE DE DATOS",
                stripe: isError ? "bg-rose-500" : "bg-purple-500"
            };
        }

        switch (log.type) {
            case "error": return { icon: Bug, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", border: "border-rose-200 dark:border-rose-500/20", label: "ERROR CRÍTICO", stripe: "bg-rose-600" };
            case "warn": return { icon: AlertTriangle, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/20", label: "ADVERTENCIA", stripe: "bg-amber-500" };
            case "info":
            default:
                return { icon: CheckCircle2, color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20", label: "SISTEMA (OK)", stripe: "bg-emerald-500" };
        }
    };

    if (currentUser?.role !== "admin") {
        return (
            <div className="flex items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
                <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl">
                    <div className="w-24 h-24 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 outline outline-8 outline-rose-50/50 dark:outline-rose-500/5">
                        <Lock className="w-10 h-10 text-rose-500" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-slate-50">Acceso Restringido</h1>
                    <p className="text-slate-500 mt-2 font-bold">La consola de sistema es exclusiva para administradores.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700 relative h-full flex flex-col">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold tracking-widest uppercase mb-1 border border-slate-200 dark:border-slate-700">
                        <Activity className="w-3.5 h-3.5" />
                        Consola de Auditoría
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                        Logs
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium">
                        Monitoreo en tiempo real. Visualizá quién entra, qué navega, el estado de la base de datos y cualquier anomalía.
                    </p>
                </div>

                <div className="flex gap-4">
                    <button onClick={clearLogs} className="flex items-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:border-rose-500/30 transition-all active:scale-95">
                        <Trash2 className="w-5 h-5" />
                        VACIAR REGISTRO
                    </button>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 shrink-0">
                <div onClick={() => setFilterCategory('all')} className={`cursor-pointer transition-all border p-6 rounded-[2rem] shadow-sm flex items-center justify-between group ${filterCategory === 'all' ? 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 scale-105' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 drop-shadow-sm mb-1.5">Todas las Clases</p>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{kpis.total}</h3>
                    </div>
                </div>
                <div onClick={() => setFilterCategory('info')} className={`cursor-pointer transition-all border p-6 rounded-[2rem] shadow-sm flex items-center justify-between group ${filterCategory === 'info' ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30 scale-105' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'}`}>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 drop-shadow-sm mb-1.5">Info / Navegación</p>
                        <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400 tabular-nums">{kpis.info}</h3>
                    </div>
                </div>
                <div onClick={() => setFilterCategory('error')} className={`cursor-pointer transition-all border p-6 rounded-[2rem] shadow-sm flex items-center justify-between group overflow-hidden relative ${filterCategory === 'error' || filterCategory === 'warn' ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30 scale-105' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-800'}`}>
                    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl transition-colors ${kpis.errors > 0 ? 'bg-rose-100 dark:bg-rose-500/20' : 'bg-transparent'}`}></div>
                    <div className="relative z-10 w-full">
                        <p className="text-[9px] font-black uppercase tracking-widest text-rose-500 drop-shadow-sm mb-1.5 line-clamp-1">Errores Y Alertas</p>
                        <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400 tabular-nums">{kpis.errors}</h3>
                    </div>
                </div>
                <div onClick={() => setFilterCategory('auth')} className={`cursor-pointer transition-all border p-6 rounded-[2rem] shadow-sm flex items-center justify-between group ${filterCategory === 'auth' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 scale-105' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-800'}`}>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 drop-shadow-sm mb-1.5">Autenticación</p>
                        <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums">{kpis.auth}</h3>
                    </div>
                </div>
                <div onClick={() => setFilterCategory('db')} className={`cursor-pointer transition-all border p-6 rounded-[2rem] shadow-sm flex items-center justify-between group ${filterCategory === 'db' ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/30 scale-105' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-800'}`}>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-purple-500 drop-shadow-sm mb-1.5">Base de Datos</p>
                        <h3 className="text-3xl font-black text-purple-600 dark:text-purple-400 tabular-nums">{kpis.db}</h3>
                    </div>
                </div>
            </div>

            {/* List & Filter Section */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col flex-1 min-h-[500px] overflow-hidden">
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por usuario, error o detalle en formato texto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-14 pr-6 text-slate-900 dark:text-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-3.5 text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500/20 appearance-none cursor-pointer"
                    >
                        <option value="all">TODAS LAS CLASES</option>
                        <option value="info">INFO / NAVEGACIÓN</option>
                        <option value="auth">AUTENTICACIÓN</option>
                        <option value="error">ERRORES GRAVES</option>
                        <option value="warn">ADVERTENCIAS</option>
                        <option value="db">BASE DE DATOS</option>
                    </select>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar bg-slate-50/50 dark:bg-black/20">
                    {filteredLogs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-4">
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
                                    <div key={log.id} className="relative group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.25rem] shadow-sm hover:shadow-md transition-all overflow-hidden">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${vis.stripe}`} />
                                        
                                        <div 
                                            className={`p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 pl-6 cursor-pointer select-none`}
                                            onClick={() => log.details ? setExpandedLogId(isExpanded ? null : log.id) : null}
                                        >
                                            {/* Date / Time Column */}
                                            <div className="flex flex-col shrink-0 w-[140px]">
                                                <span className="text-slate-900 dark:text-slate-100 font-extrabold tabular-nums tracking-tight">{timePart}</span>
                                                <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-black tracking-widest">{datePart || "HOY"}</span>
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
                                                <p className="text-slate-700 dark:text-slate-300 font-bold text-sm leading-relaxed overflow-wrap break-word pr-4">
                                                    {log.message}
                                                </p>
                                            </div>

                                            {/* Expand action */}
                                            <div className="shrink-0 flex items-center justify-end w-[80px]">
                                                {log.details ? (
                                                    <div className={`p-2 rounded-xl transition-colors flex items-center gap-2 text-[10px] font-black tracking-widest uppercase ${isExpanded ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                                        <Eye className="w-4 h-4" />
                                                        DATA
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 dark:text-slate-700/50 text-[10px] font-black tracking-widest uppercase items-center flex gap-1"><Info className="w-3.5 h-3.5"/> N/A</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Dropdown Payload JSON */}
                                        {isExpanded && log.details && (
                                            <div className="px-6 pb-6 pt-2 pl-6 md:pl-[330px] border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 animate-in slide-in-from-top-2 duration-300">
                                                <div className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto border border-slate-800 shadow-inner">
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
