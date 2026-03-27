"use client";
import React, { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { motion } from "framer-motion";
import { Trophy, Send, Sparkles, Star, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function WholesalerApplicationPage() {
    const { currentUser, enviarSolicitudMayorista, solicitudPropia } = useAppContext();
    const [formData, setFormData] = useState({
        nombre: "",
        apellido: "",
        mail: "",
        celular: "",
        motivo: ""
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (currentUser?.email && !formData.mail) {
            setFormData(prev => ({ ...prev, mail: currentUser.email || "" }));
        }
    }, [currentUser, formData.mail]);

    const formatCelular = (value: string) => {
        const numbers = value.replace(/\D/g, "");
        const trimmed = numbers.slice(0, 10);
        if (trimmed.length <= 2) return trimmed;
        if (trimmed.length <= 6) return `${trimmed.slice(0, 2)} ${trimmed.slice(2)}`;
        return `${trimmed.slice(0, 2)} ${trimmed.slice(2, 6)}-${trimmed.slice(6)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === "celular") {
            setFormData(prev => ({ ...prev, [name]: formatCelular(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.nombre || !formData.apellido || !formData.mail || !formData.celular || !formData.motivo) {
            toast.error("Por favor completa los campos.");
            return;
        }

        setIsSubmitting(true);

        try {
            // Guardado automático en el Dashboard del Administrador
            const res = await enviarSolicitudMayorista({
                ...formData,
                celular: `+54 9 ${formData.celular}`
            });

            if (res.success) {
                setIsSuccess(true);
                toast.success("Solicitud enviada con éxito.");
            } else {
                toast.error("Error al enviar la solicitud.");
            }
        } catch (error) {
            toast.error("Fallo al conectar con el servidor.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isRejected = solicitudPropia?.estado === 'rechazada';
    const retryDate = isRejected ? new Date(solicitudPropia.fecha_reintento + "T23:59:59") : null;
    const canRetry = isRejected && retryDate && new Date() >= retryDate;

    if (isSuccess || (solicitudPropia && solicitudPropia.estado === 'pendiente')) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-8 max-w-2xl mx-auto min-h-[60vh]">
                <motion.div 
                    initial={{ scale: 0, rotate: -180 }} 
                    animate={{ scale: 1, rotate: 0 }} 
                    className="w-24 h-24 rounded-full bg-indigo-500/10 flex items-center justify-center border-4 border-indigo-500/20 shadow-xl shadow-indigo-500/5 relative"
                >
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                    <Sparkles className="w-10 h-10 text-indigo-500" />
                </motion.div>
                <div className="space-y-4">
                    <h2 className="text-4xl lg:text-5xl font-black text-slate-800 dark:text-white">Solicitud en Revisión</h2>
                    <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 italic">
                        <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            "Estamos evaluando tu solicitud, en breves un asesor se pondrá en contacto con vos."
                        </p>
                    </div>
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest pt-4">Equipo Scenta Perfumes</p>
                </div>
                <Link href="/minorista" className="px-10 py-5 rounded-3xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black shadow-2xl transition-all hover:scale-105 active:scale-95">
                    Ir a mi Panel
                </Link>
            </div>
        );
    }

    if (isRejected && !canRetry) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-8 max-w-3xl mx-auto min-h-[60vh]">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 rounded-full bg-rose-500/10 flex items-center justify-center border-4 border-rose-500/20 shadow-xl shadow-rose-500/5">
                    <XCircle className="w-12 h-12 text-rose-500" />
                </motion.div>
                <div className="space-y-6">
                    <h2 className="text-4xl lg:text-5xl font-black text-slate-800 dark:text-white leading-tight">Estado de Postulación</h2>
                    <div className="space-y-4">
                        <div className="p-8 rounded-[2.5rem] bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50">
                            <p className="text-rose-600 dark:text-rose-400 font-bold uppercase tracking-widest text-xs mb-4">Motivo del rechazo:</p>
                            <p className="text-xl text-slate-700 dark:text-slate-200 font-black italic">
                                "{solicitudPropia.motivo_rechazo}"
                            </p>
                        </div>
                        <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">
                                Podrás volver a solicitar ser mayorista el día: <br />
                                <span className="text-indigo-600 dark:text-indigo-400 text-2xl font-black">
                                    {new Date(solicitudPropia.fecha_reintento + "T00:00:00").toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
                <Link href="/minorista" className="px-10 py-5 rounded-3xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black shadow-2xl transition-all hover:scale-105 active:scale-95">
                    Entendido
                </Link>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-8 bg-slate-50 dark:bg-slate-950/20 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-10">
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
                    <h1 className="text-4xl lg:text-6xl font-black text-slate-800 dark:text-white leading-tight">
                        ¡Llevá tu negocio al <br className="hidden md:block" />
                        <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent animate-gradient-x">Nivel Mayorista</span>!
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Postulación para distribuidores minoristas</p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                    {/* Beneficios Card Premium */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-4 h-full">
                        <div className="h-full p-10 rounded-[2.5rem] bg-indigo-600 shadow-2xl relative overflow-hidden flex flex-col justify-between group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/20 transition-all duration-700" />
                            
                            <div className="relative z-10 space-y-8">
                                <h3 className="text-2xl font-black text-white leading-tight">Beneficios <br /> Exclusivos</h3>
                                <ul className="space-y-8">
                                    {[
                                        { icon: Sparkles, text: "Precios de fábrica directos", desc: "Margen de ganancia inigualable." },
                                        { icon: Star, text: "Stock Garantizado", desc: "Prioridad en insumos críticos." },
                                        { icon: Trophy, text: "Acceso VIP", desc: "Nuevas fragancias antes que nadie." },
                                    ].map((item, idx) => (
                                        <li key={idx} className="flex gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                                                <item.icon className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-base">{item.text}</p>
                                                <p className="text-indigo-100/60 text-xs font-medium">{item.desc}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="relative z-10 mt-12 p-6 rounded-3xl bg-white/10 border border-white/10 backdrop-blur-xl">
                                <p className="text-white/80 text-xs font-bold italic leading-relaxed">
                                    "Buscamos emprendedores comprometidos con la excelencia y la calidad de Scenta."
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Formulario Glassmorphism */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-8 h-full">
                        <div className="p-8 lg:p-12 rounded-[2.5rem] bg-white dark:bg-[#111827]/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 shadow-2xl relative">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Usuario del Sistema</label>
                                        <input type="text" value={currentUser?.username || "Cargando..."} disabled className="w-full h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-slate-400 font-bold opacity-70 text-sm cursor-not-allowed" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Mail de contacto</label>
                                        <input name="mail" value={formData.mail} onChange={handleChange} placeholder="nombre@ejemplo.com" required className="w-full h-14 px-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nombre</label>
                                        <input name="nombre" value={formData.nombre} onChange={handleChange} required className="w-full h-14 px-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Apellido</label>
                                        <input name="apellido" value={formData.apellido} onChange={handleChange} required className="w-full h-14 px-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Celular (WhatsApp)</label>
                                        <div className="relative">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm tracking-tight">+54 9</span>
                                            <input name="celular" value={formData.celular} onChange={handleChange} placeholder="11 1234-5678" required className="w-full h-14 pl-20 pr-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Contanos un poco de vos</label>
                                    <textarea name="motivo" value={formData.motivo} onChange={handleChange} rows={4} placeholder="¿Qué te motiva a ser parte de la red mayorista?" required className="w-full px-6 py-5 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white font-bold text-sm resize-none focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" />
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full h-16 rounded-2xl bg-slate-900 dark:bg-indigo-600 text-white font-black text-lg flex items-center justify-center gap-4 shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50">
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                            Enviando solicitud...
                                        </>
                                    ) : (
                                        <>
                                            Enviar Postulación
                                            <Send className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
