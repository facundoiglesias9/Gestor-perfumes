"use client";

import { useState, useEffect } from "react";
import {
    Trash2,
    RefreshCw,
    Search,
    Info,
    Database,
    User as UserIcon,
    Filter,
    ChevronDown,
    Activity,
    History,
    ShieldAlert,
    Globe,
    Monitor,
    Maximize2,
    Minimize2,
    Clock,
    Code
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";

type LogEntry = {
    id: string;
    timestamp: string;
    type: "info" | "error" | "db" | "auth";
    message: string;
    details?: any;
    remote?: boolean;
};

export default function LogsPage() {
    const { currentUser } = useAppContext();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        const savedLogs = localStorage.getItem("system_logs");
        if (savedLogs) {
            try { setLogs(JSON.parse(savedLogs)); } catch (e) { }
        }

        const channel = supabase.channel('system_logs_broadcast', {
            config: { broadcast: { self: false } }
        })
            .on('broadcast', { event: 'new_log' }, (payload) => {
                const remoteLog: LogEntry = { ...payload.payload, remote: true };
                setLogs(prev => [remoteLog, ...prev].slice(0, 100));
            })
            .subscribe();

        (window as any).__onNewLog = (log: LogEntry) => {
            setLogs(prev => [log, ...prev].slice(0, 100));
        };

        return () => {
            supabase.removeChannel(channel);
            delete (window as any).__onNewLog;
        };
    }, []);

    const clearLogs = () => {
        if (window.confirm("¿Limpiar todos los logs?")) {
            setLogs([]);
            localStorage.removeItem("system_logs");
        }
    };

    const filteredLogs = logs.filter(log => {
        const content = `${log.message} ${JSON.stringify(log.details || "")}`.toLowerCase();
        const search = searchTerm.toLowerCase();
        const matchesSearch = content.includes(search);
        const matchesType = filterType === "all" || log.type === filterType;
        return matchesSearch && matchesType;
    });

    const getColorClass = (type: LogEntry["type"]) => {
        switch (type) {
            case "error": return "text-rose-500";
            case "db": return "text-purple-400";
            case "auth": return "text-amber-400";
            default: return "text-emerald-400";
        }
    };

    const getBorderClass = (type: LogEntry["type"]) => {
        switch (type) {
            case "error": return "border-l-rose-500/60";
            case "db": return "border-l-purple-400/60";
            case "auth": return "border-l-amber-400/60";
            default: return "border-l-emerald-400/30";
        }
    };

    if (currentUser?.role !== "admin") {
        return (
            <div className="flex items-center justify-center min-h-[60vh] font-mono">
                <div className="text-center p-12 bg-[#050505] rounded-xl border border-white/10 shadow-2xl">
                    <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-rose-500">FATAL: PERMISSION_DENIED</h1>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto h-[calc(100vh-8rem)] flex flex-col bg-[#050505] rounded-2xl border border-white/5 shadow-2xl overflow-hidden font-mono text-xs md:text-sm relative animate-in zoom-in-95 duration-500">
            {/* Window Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#111] border-b border-white/5 shrink-0 select-none">
                <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500 border border-black/50"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-500 border border-black/50"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500 border border-black/50"></div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold tracking-widest pl-2">
                        <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                        SCENTA_SYS_CONSOLE v2.2
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={clearLogs} className="text-slate-500 hover:text-white flex items-center gap-1.5 transition-colors" title="Limpiar Terminal">
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden md:inline text-[10px] uppercase tracking-wider">Clear</span>
                    </button>
                    <button onClick={() => window.location.reload()} className="text-slate-500 hover:text-white flex items-center gap-1.5 transition-colors" title="Reiniciar App">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="hidden md:inline text-[10px] uppercase tracking-wider">Reboot</span>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-3 p-4 border-b border-white/5 shrink-0 bg-[#0a0a0a]">
                <div className="flex-1 relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 font-bold select-none">{">"}</span>
                    <input
                        type="text"
                        placeholder="grep search_term..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-emerald-400 placeholder-slate-700 focus:outline-none focus:border-indigo-500/50 transition-all focus:ring-1 focus:ring-indigo-500/50"
                        spellCheck="false"
                    />
                </div>
                <div className="flex gap-3">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-black border border-white/10 rounded-lg py-2.5 px-4 text-indigo-400 outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
                    >
                        <option value="all">--all-levels</option>
                        <option value="info">--info</option>
                        <option value="error">--error</option>
                        <option value="db">--database</option>
                        <option value="auth">--auth</option>
                    </select>
                    <div className="bg-black px-4 py-2.5 rounded-lg border border-white/10 flex items-center justify-center text-slate-500 text-xs font-bold select-none whitespace-nowrap">
                        ROWS: {filteredLogs.length}
                    </div>
                </div>
            </div>

            {/* Terminal Screen */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-1.5 scroll-smooth">
                {/* Cabecera de columnas para mantener orden absoluto */}
                {filteredLogs.length > 0 && (
                    <div className="flex items-center gap-4 px-3 pb-2 text-[10px] font-black tracking-widest text-slate-600 uppercase mb-2 border-b border-white/5 select-none">
                        <span className="w-[180px]">DATE & TIME</span>
                        <span className="w-[60px]">LEVEL</span>
                        <span className="flex-1 pl-4">PROCESS / MESSAGE</span>
                        <span className="w-[60px] text-right">PAYLOAD</span>
                    </div>
                )}

                {filteredLogs.length === 0 ? (
                    <div className="text-slate-700 italic">No stdout.</div>
                ) : (
                    filteredLogs.map(log => {
                        // Viejo log: "20:33:13". Nuevo log: "21/03/2026, 20:33:13"
                        const isOldLog = !log.timestamp.includes('/');
                        const formattedTimestamp = isOldLog ? `[--/--/----, ${log.timestamp}]` : `[${log.timestamp}]`;

                        return (
                            <div key={log.id} className={`group hover:bg-white-[0.03] px-3 py-2 rounded-r transition-colors break-words flex flex-col border-l-2 ${getBorderClass(log.type)} bg-gradient-to-r from-white/[0.02] to-transparent`}>
                                <div
                                    className={`flex items-start md:items-center gap-4 ${log.details ? 'cursor-pointer' : ''}`}
                                    onClick={() => log.details && setExpandedId(expandedId === log.id ? null : log.id)}
                                >
                                    <span className="text-slate-500 shrink-0 select-none w-[180px] opacity-80 tabular-nums">
                                        {formattedTimestamp}
                                    </span>
                                    <span className={`shrink-0 w-[60px] font-black uppercase tracking-wider select-none ${getColorClass(log.type)}`}>
                                        {log.type}
                                    </span>
                                    <span className={`flex-1 border-l border-white/10 pl-4 py-0.5 ${log.type === 'error' ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                                        {log.message}
                                    </span>
                                    {log.details && (
                                        <span className="text-slate-600 shrink-0 w-[60px] text-right hover:text-white transition-colors select-none font-bold text-[10px]">
                                            {expandedId === log.id ? "CLOSE" : "DATA"}
                                        </span>
                                    )}
                                </div>

                                {/* Expanded JSON */}
                                {expandedId === log.id && log.details && (
                                    <div className="ml-[272px] mt-3 mb-2 p-4 bg-black border border-white/10 rounded-lg text-indigo-300 text-xs overflow-x-auto shadow-inner">
                                        <pre>{JSON.stringify(log.details, null, 2)}</pre>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}

                {/* Blinking Cursor */}
                <div className="pt-4 px-3 flex items-center gap-2 text-slate-500 select-none">
                    <span>root@scenta-admin:~#</span>
                    <div className="w-2.5 h-4 bg-slate-500 animate-pulse"></div>
                </div>
            </div>
        </div>
    );
}

import React from "react";
