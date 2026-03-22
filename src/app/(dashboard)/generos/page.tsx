"use client";

import { Search, Plus, Sparkles, Trash2, X, Edit2, Users, User, UserCheck, ChevronRight, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";
import { motion, AnimatePresence } from "framer-motion";

export default function GenerosPage() {
    const { generos, setGeneros, productos, setProductos } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [formData, setFormData] = useState({ name: "" });
    const [indexToDelete, setIndexToDelete] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newName = formData.name.trim();
        if (!newName) return;

        if (editingIndex !== null) {
            const oldName = generos[editingIndex];
            const updatedGeneros = [...generos];
            updatedGeneros[editingIndex] = newName;
            setGeneros(updatedGeneros);

            setProductos(productos.map(p => p.gender === oldName ? { ...p, gender: newName } : p));
            setEditingIndex(null);
        } else {
            if (!generos.includes(newName)) {
                setGeneros([newName, ...generos]);
            }
        }
        setFormData({ name: "" });
        setIsAddModalOpen(false);
    };

    const openEditModal = (name: string, index: number) => {
        setEditingIndex(index);
        setFormData({ name });
        setIsAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setEditingIndex(null);
        setFormData({ name: "" });
    };

    const confirmDelete = () => {
        if (indexToDelete !== null) {
            const filteredGeneros = generos.filter((_, idx) => idx !== indexToDelete);
            setGeneros(filteredGeneros);
            setIndexToDelete(null);
        }
    };

    const filteredGeneros = useMemo(() => {
        return generos.filter(name =>
            name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [generos, searchTerm]);

    const getGenderIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes("fem") || n.includes("mujer")) return <User className="w-8 h-8 rotate-[-10deg]" />;
        if (n.includes("masc") || n.includes("hombre")) return <UserCheck className="w-8 h-8 rotate-[10deg]" />;
        return <Users className="w-8 h-8" />;
    };

    const getGenderColor = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes("fem") || n.includes("mujer")) return "from-pink-500 to-rose-600 shadow-pink-500/20";
        if (n.includes("masc") || n.includes("hombre")) return "from-blue-500 to-indigo-600 shadow-blue-500/20";
        return "from-slate-500 to-slate-700 shadow-slate-500/20";
    };

    return (
        <div className="space-y-10 pb-20 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <header className="relative overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-8 md:p-12 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white dark:border-slate-800 transition-all duration-500">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black tracking-[0.2em] uppercase"
                        >
                            <Sparkles className="w-4 h-4" />
                            Segmentación de Aroma
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white leading-[0.9]"
                        >
                            Géneros
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors"
                        >
                            Configurá los perfiles de tus fragancias. Esto facilita el filtrado para tus clientes en el catálogo.
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center gap-4"
                    >
                        <div className="relative group w-full sm:w-80">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar géneros..."
                                className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-[2rem] py-4 pl-14 pr-8 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold"
                            />
                        </div>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 rounded-[2rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black hover:scale-[1.03] active:scale-95 transition-all shadow-xl group"
                        >
                            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" strokeWidth={3} />
                            Nuevo Género
                        </button>
                    </motion.div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                    {filteredGeneros.map((name, idx) => (
                        <motion.div
                            key={name}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: idx * 0.05 }}
                            className="group relative bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 hover:border-emerald-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_40px_80px_rgba(0,0,0,0.1)] transition-all duration-500"
                        >
                            <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0">
                                <button
                                    onClick={() => openEditModal(name, idx)}
                                    className="w-10 h-10 flex items-center justify-center bg-slate-100/10 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 rounded-xl backdrop-blur-md border border-white/5 transition-all"
                                    title="Editar nombre"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setIndexToDelete(idx)}
                                    className="w-10 h-10 flex items-center justify-center bg-slate-100/10 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl backdrop-blur-md border border-white/5 transition-all"
                                    title="Eliminar género"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-8">
                                <div className={`w-20 h-20 rounded-[2rem] bg-gradient-to-br ${getGenderColor(name)} flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform duration-500`}>
                                    {getGenderIcon(name)}
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-4xl font-black text-slate-900 dark:text-white leading-tight">
                                        {name}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-12 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                            <div className={`h-full bg-gradient-to-r ${getGenderColor(name)} w-full`}></div>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Segmento Perfilado</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-10 border-t border-slate-50 dark:border-slate-800">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
                                        <span className="text-sm font-black text-emerald-500 uppercase tracking-tighter">Disponible en App</span>
                                    </div>
                                    <div className="w-14 h-14 rounded-3xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                                        <ChevronRight className="w-7 h-7" strokeWidth={3} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filteredGeneros.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-32 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 rounded-[4rem] border-2 border-dashed border-slate-200 dark:border-slate-800"
                >
                    <Search className="w-20 h-20 text-slate-200 dark:text-slate-700 mb-6" />
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Sin resultados</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-bold">Probá ajustando la búsqueda.</p>
                </motion.div>
            )}

            <ConfirmModal
                isOpen={indexToDelete !== null}
                title="Eliminar Género"
                message="¿Confirmás la eliminación? Los productos no se borrarán, pero perderán su etiqueta de género."
                onConfirm={confirmDelete}
                onCancel={() => setIndexToDelete(null)}
            />

            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCloseModal}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        ></motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl w-full max-w-xl overflow-hidden"
                        >
                            <div className="p-12 pb-6 flex justify-between items-start">
                                <div className="space-y-2">
                                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                        {editingIndex !== null ? "Editar Perfil" : "Nuevo Género"}
                                    </h2>
                                    <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
                                        Aparecerá como opción de filtrado en todo el catálogo.
                                    </p>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleAddSubmit} className="p-12 space-y-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Título del Género</label>
                                    <input
                                        required
                                        autoFocus
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ name: e.target.value })}
                                        placeholder="Ej: Femenino, Masculino, Unisex..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-emerald-500 rounded-2xl py-6 px-8 text-slate-900 dark:text-white placeholder:text-slate-300 focus:outline-none transition-all font-black text-2xl"
                                    />
                                </div>

                                <button type="submit" className="w-full py-6 rounded-[2.5rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
                                    {editingIndex !== null ? "Guardar Cambios" : "Crear Género"}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
