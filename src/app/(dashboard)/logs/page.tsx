"use client";

import { useState, useEffect } from "react";
import {
    Terminal,
    Trash2,
    RefreshCw,
    Search,
    AlertCircle,
    Info,
    Database,
    User as UserIcon,
    Filter
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";

type LogEntry = {
    id: string;
    timestamp: string;
    type: "info" | "error" | "db" | "auth";
    message: string;
    details?: any;
};

export default function LogsPage() {
    const { currentUser } = useAppContext();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<string>("all");

    useEffect(() => {
        // Intentar recuperar logs de localStorage
        const savedLogs = localStorage.getItem("system_logs");
        if (savedLogs) {
            try {
                setLogs(JSON.parse(savedLogs));
            } catch (e) {
                console.error("Error parsing logs", e);
            }
        }

        // Listener para errores globales (si se quisiera capturar errores de runtime)
        const handleError = (event: ErrorEvent) => {
            addLog("error", `Global Error: ${event.message}`, {
                filename: event.filename,
                lineno: event.lineno
            });
        };

        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
    }, []);

    const addLog = (type: LogEntry["type"], message: string, details?: any) => {
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleString(),
            type,
            message,
            details
        };

        setLogs(prev => {
            const updated = [newLog, ...prev].slice(0, 100); // Mantener últimos 100
            localStorage.setItem("system_logs", JSON.stringify(updated));
            return updated;
        });
    };

    const clearLogs = () => {
        if (window.confirm("¿Limpiar todos los logs?")) {
            setLogs([]);
            localStorage.removeItem("system_logs");
        }
    };

    // Mock de inyección de logs para testing
    const injectTestLogs = () => {
        addLog("info", "Inicio de sesión detectado", { user: currentUser?.username });
        addLog("db", "Consulta exitosa a tabla 'usuarios'", { rows: 1 });
        addLog("error", "Fallo al cargar imagen", { url: "/img/perfume.png" });
    };

    const filteredLogs = logs.filter(log => {
        const matchesPath = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            JSON.stringify(log.details || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === "all" || log.type === filterType;
        return matchesPath && matchesType;
    });

    const getLogIcon = (type: LogEntry["type"]) => {
        switch (type) {
            case "error": return <AlertCircle className="w-5 h-5 text-red-500" />;
            case "db": return <Database className="w-5 h-5 text-blue-500" />;
            case "auth": return <UserIcon className="w-5 h-5 text-purple-500" />;
            default: return <Info className="w-5 h-5 text-slate-400" />;
        }
    };

    if (currentUser?.role !== "admin") {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Acceso Denegado</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Sólo el administrador puede ver los registros del sistema.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <Terminal className="w-3.5 h-3.5" />
                        System Monitoring
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                        Logs del Sistema
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl font-medium">
                        Depuración en tiempo real y registro de actividad de la aplicación.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={injectTestLogs}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Test Log
                    </button>
                    <button
                        onClick={clearLogs}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                        Limpiar
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar en logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-medium"
                    />
                </div>
                <div className="flex items-center gap-2 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="flex-1 bg-transparent border-none focus:outline-none text-slate-900 dark:text-slate-50 font-bold text-sm h-full py-3"
                    >
                        <option value="all">Todos los Tipos</option>
                        <option value="info">Información</option>
                        <option value="error">Errores</option>
                        <option value="db">Base de Datos</option>
                        <option value="auth">Autenticación</option>
                    </select>
                </div>
                <div className="flex items-center justify-center p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-400 text-xs tracking-widest uppercase">
                    {filteredLogs.length} Entradas
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden min-h-[400px]">
                {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                        <Terminal className="w-12 h-12 mb-4 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-xs">No hay logs registrados</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredLogs.map((log) => (
                            <div key={log.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                <div className="flex gap-4 items-start">
                                    <div className="mt-1">{getLogIcon(log.type)}</div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                {log.type}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                {log.timestamp}
                                            </span>
                                        </div>
                                        <p className="text-slate-900 dark:text-slate-100 font-bold text-sm">
                                            {log.message}
                                        </p>
                                        {log.details && (
                                            <pre className="mt-3 p-4 bg-slate-950 rounded-xl text-blue-400 text-xs font-mono overflow-x-auto border border-white/5 shadow-inner">
                                                {JSON.stringify(log.details, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
