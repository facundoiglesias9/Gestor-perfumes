"use client";
import React, { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
    UserPlus, Search, Phone, Mail, Clock, CheckCircle2, 
    XCircle, Trash2, ArrowRight, MessageCircle, UserCheck, 
    Calendar, Sparkles 
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import { toast } from "sonner";

export default function SolicitudesMinoristasPage() {
    const { 
        solicitudesMinoristas, 
        fetchSolicitudesMinoristas, 
        currentUser, 
        eliminarSolicitudMinorista, 
        aprobarSolicitudMinorista, 
        rechazarSolicitudMinorista 
    } = useAppContext();

    const [searchTerm, setSearchTerm] = useState("");
    const [idToDelete, setIdToDelete] = useState<number | null>(null);
    const [requestToReject, setRequestToReject] = useState<any | null>(null);
    const [rejectionData, setRejectionData] = useState({ motivo: "", fecha: "" });

    useEffect(() => {
        if (currentUser?.role === "admin") {
            fetchSolicitudesMinoristas();
        }
    }, [currentUser]);

    const filtered = solicitudesMinoristas.filter(s => 
        (s.nombre?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (s.username?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (s.mail?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    if (currentUser?.role !== "admin") {
        return <div className="p-20 text-center font-bold text-slate-400">Acceso restingido.</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 min-h-screen animate-in fade-in duration-500 bg-slate-50/20 dark:bg-[#0f172a]/20">
            {/* Header section compacta */}
            <div className="relative overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 border border-slate-200/50 dark:border-slate-800/50 shadow-xl shadow-slate-900/5 transition-all">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px]" />
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black tracking-widest uppercase border border-indigo-500/10">
                            <Sparkles className="w-3 h-3" />
                            Gestión Minoristas
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                            Solicitudes <span className="text-indigo-500">Recibidas</span>
                        </h1>
                    </div>

                    <div className="w-full md:w-80 group relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Buscar aspirante..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-14 pl-14 pr-6 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 transition-all shadow-lg"
                        />
                    </div>
                </div>
            </div>

            {/* Listado de Solicitudes Compacto */}
            <div className="grid grid-cols-1 gap-5">
                <AnimatePresence mode="popLayout">
                    {filtered.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-20 text-center bg-white/30 dark:bg-slate-900/30 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                           <UserPlus className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                           <p className="text-slate-400 font-bold">No hay solicitudes pendientes.</p>
                        </motion.div>
                    ) : (
                        filtered.map((solicitud, idx) => (
                            <motion.div 
                                key={solicitud.id || idx}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group"
                            >
                                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-900/5 hover:border-indigo-500/30 transition-all" >
                                    <div className="flex flex-col lg:flex-row gap-6 items-center">
                                        
                                        {/* Avatar e Identidad Compacto */}
                                        <div className="flex items-center gap-5 min-w-[240px]">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-500/20">
                                                {solicitud.nombre?.charAt(0) || "U"}
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">
                                                    {solicitud.nombre} {solicitud.apellido}
                                                </h3>
                                                <span className="inline-block px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-200/50 dark:border-slate-700/50">
                                                    @{solicitud.username}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Datos de Contacto */}
                                        <div className="flex flex-col sm:flex-row gap-6 flex-1 w-full lg:w-auto xl:divide-x dark:divide-slate-800">
                                            <div className="space-y-2 pr-6">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-bold">
                                                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                                    {solicitud.celular}
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-bold">
                                                    <Mail className="w-3.5 h-3.5 text-indigo-500" />
                                                    {solicitud.mail}
                                                </div>
                                            </div>

                                            <div className="flex-1 lg:px-6 space-y-1">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ring-offset-emerald-50">
                                                    <MessageCircle className="w-3 h-3" />
                                                    Mensaje Recibido ({new Date(solicitud.created_at).toLocaleDateString()})
                                                </p>
                                                <p className="text-sm text-slate-700 dark:text-slate-200 font-medium italic line-clamp-2">
                                                    "{solicitud.motivo}"
                                                </p>
                                            </div>
                                        </div>

                                        {/* Acciones una al lado de la otra y con iconos para WhatsApp/Limpieza */}
                                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 lg:pl-6">
                                            <div className="flex h-12 rounded-xl overflow-hidden shadow-lg shadow-indigo-600/10 border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
                                                <button 
                                                    onClick={() => aprobarSolicitudMinorista(solicitud.id, solicitud.user_id)}
                                                    className="px-6 h-full bg-slate-50 dark:bg-slate-900 hover:bg-emerald-500 hover:text-white text-emerald-500 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                                >
                                                    <UserCheck className="w-3.5 h-3.5" />
                                                    Aceptar
                                                </button>
                                                <button 
                                                    onClick={() => setRequestToReject(solicitud)}
                                                    className="px-6 h-full bg-slate-50 dark:bg-slate-900 hover:bg-rose-500 hover:text-white text-rose-500 text-[10px] font-black uppercase tracking-widest transition-all border-l border-slate-200 dark:border-slate-700"
                                                >
                                                    Rechazar
                                                </button>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => window.open(`https://wa.me/${solicitud.celular.replace(/\D/g, "")}`, "_blank")}
                                                    className="w-12 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                                    title="WhatsApp"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .04 5.391.033 12.03c0 2.123.555 4.194 1.608 6.046L0 23.974l6.095-1.599a11.8 11.8 0 005.95 1.599h.005c6.635 0 12.022-5.393 12.03-12.034a11.83 11.83 0 00-3.15-8.384z"/>
                                                    </svg>
                                                </button>
                                                <button 
                                                    onClick={() => setIdToDelete(solicitud.id)}
                                                    className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 border border-slate-200/50 dark:border-slate-700/50 transition-all flex items-center justify-center"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Modales Compactos */}
            <ConfirmModal 
                isOpen={idToDelete !== null}
                title="¿Eliminar Registro?"
                message="Esta acción borrará la solicitud definitivamente de la base de datos."
                onConfirm={() => {
                    if (idToDelete) eliminarSolicitudMinorista(idToDelete);
                    setIdToDelete(null);
                }}
                onCancel={() => setIdToDelete(null)}
            />

            <AnimatePresence>
                {requestToReject && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
                            className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md space-y-6"
                        >
                            <div className="text-center space-y-2">
                               <h3 className="text-2xl font-black text-slate-800 dark:text-white">Rechazar Solicitud</h3>
                               <p className="text-xs font-bold text-slate-400 uppercase">Aspirante: {requestToReject.nombre}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Motivo</label>
                                    <textarea 
                                        rows={2}
                                        value={rejectionData.motivo}
                                        onChange={(e) => setRejectionData({ ...rejectionData, motivo: e.target.value })}
                                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold resize-none outline-none focus:border-rose-500/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Fecha de Reintento</label>
                                    <input 
                                        type="date" 
                                        value={rejectionData.fecha}
                                        onChange={(e) => setRejectionData({ ...rejectionData, fecha: e.target.value })}
                                        className="w-full h-12 px-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setRequestToReject(null)}
                                    className="flex-1 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={() => {
                                        if (!rejectionData.motivo || !rejectionData.fecha) return toast.error("Cargá todos los datos");
                                        rechazarSolicitudMinorista(requestToReject.id, rejectionData.motivo, rejectionData.fecha);
                                        setRequestToReject(null);
                                        setRejectionData({ motivo: "", fecha: "" });
                                    }}
                                    className="flex-2 h-12 px-6 rounded-xl bg-rose-500 text-white font-black text-xs uppercase"
                                >
                                    Confirmar Rechazo
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
