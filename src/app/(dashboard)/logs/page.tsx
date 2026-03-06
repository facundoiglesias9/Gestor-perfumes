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

    const getLogIcon = (type: LogEntry["type"]) => {
        switch (type) {
            case "error": return <ShieldAlert className="w-4 h-4" />;
            case "db": return <Database className="w-4 h-4" />;
            case "auth": return <UserIcon className="w-4 h-4" />;
            default: return <Info className="w-4 h-4" />;
        }
    };

    if (currentUser?.role !== "admin") {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800">
                    <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold">Acceso Denegado</h1>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header Compacto */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 dark:bg-black p-6 rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full -mr-10 -mt-10" />

                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Monitor className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                            Consola Técnica
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-bold uppercase tracking-wider">v2.0</span>
                        </h1>
                        <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Debug & Monitor System</p>
                    </div>
                </div>

                <div className="flex gap-2 relative z-10">
                    <button onClick={() => setLogs([])} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all flex items-center gap-2">
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        Limpiar Pantalla
                    </button>
                    <button onClick={() => window.location.reload()} className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 border border-indigo-500">
                        <RefreshCw className="w-3.5 h-3.5" />
                        Recargar App
                    </button>
                </div>
            </header>

            {/* Controles de Filtro */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-7 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Filtrar por mensaje, código de error o JSON..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none"
                    />
                </div>
                <div className="md:col-span-3 relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-10 text-sm font-bold appearance-none cursor-pointer outline-none focus:border-indigo-500 transition-all dark:text-white"
                    >
                        <option value="all">Todos los Niveles</option>
                        <option value="info">Info</option>
                        <option value="error">Error</option>
                        <option value="db">Database</option>
                        <option value="auth">Auth</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
                <div className="md:col-span-2 bg-indigo-600 rounded-2xl flex items-center justify-center p-3 text-white">
                    <span className="text-[10px] font-black tracking-widest uppercase">{filteredLogs.length} Registros</span>
                </div>
            </div>

            {/* Tabla de Logs */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[180px]">Hora Exacta</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[120px]">Nivel</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Evento / Descripción</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-[100px]">Data</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center text-slate-400 font-medium italic text-sm">
                                        No hay logs que coincidan con los filtros.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <React.Fragment key={log.id}>
                                        <tr className={`group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer ${log.type === 'error' ? 'bg-rose-50/20 dark:bg-rose-900/5' : ''}`}
                                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5 text-slate-300" />
                                                    <span className="text-sm font-black text-slate-700 dark:text-slate-300 tabular-nums">{log.timestamp}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight border ${log.type === 'error' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                        log.type === 'db' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                            log.type === 'auth' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                                'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                                                    }`}>
                                                    {getLogIcon(log.type)}
                                                    {log.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                                        {log.message}
                                                    </span>
                                                    {log.remote && (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-black text-[8px] font-black uppercase tracking-widest">
                                                            <Globe className="w-2.5 h-2.5" />
                                                            REMOTA
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                {log.details && (
                                                    <button className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-all">
                                                        {expandedId === log.id ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>

                                        {expandedId === log.id && log.details && (
                                            <tr className="bg-slate-900 dark:bg-black">
                                                <td colSpan={4} className="px-8 py-6">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                                            <Code className="w-3.5 h-3.5" />
                                                            Detalles Técnicos (Payload)
                                                        </div>
                                                        <pre className="p-6 bg-black rounded-2xl text-emerald-400 text-xs font-mono overflow-x-auto border border-white/5 shadow-inner leading-relaxed overflow-hidden">
                                                            {JSON.stringify(log.details, null, 2)}
                                                        </pre>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pt-4">
                Scenta Diagnostics • v2.0 • {new Date().toLocaleDateString()}
            </p>
        </div>
    );
}

import React from "react";
