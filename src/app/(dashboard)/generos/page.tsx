"use client";

import { Search, Plus, Sparkles, Trash2, X, Edit2 } from "lucide-react";
import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";

export default function GenerosPage() {
    const { generos, setGeneros, productos, setProductos } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [formData, setFormData] = useState({ name: "" });
    const [indexToDelete, setIndexToDelete] = useState<number | null>(null);

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newName = formData.name.trim();
        if (!newName) return;

        if (editingIndex !== null) {
            const oldName = generos[editingIndex];
            const updatedGeneros = [...generos];
            updatedGeneros[editingIndex] = newName;
            setGeneros(updatedGeneros);

            // Cascade update in products
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

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700 relative">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Configurador
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Géneros de Fragancias
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Definí los géneros disponibles para tus productos y segmentá tu catálogo.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/20 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                        Nuevo Género
                    </button>
                </div>
            </header>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden transition-colors duration-300 relative min-h-[400px] flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[80%]">Nombre</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[20%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {generos.map((name, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                                    <td className="px-8 py-6">
                                        <p className="text-slate-900 dark:text-slate-100 font-bold text-lg group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{name}</p>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => openEditModal(name, idx)}
                                                className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/10 rounded-xl transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => setIndexToDelete(idx)}
                                                className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmModal
                isOpen={indexToDelete !== null}
                title="Eliminar Género"
                message="¿Estás seguro de que deseas eliminar este género? No se eliminarán los productos, pero quedarán sin género asignado."
                onConfirm={confirmDelete}
                onCancel={() => setIndexToDelete(null)}
            />

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
                        <div className="p-8 pb-6 flex justify-between items-center">
                            <h2 className="text-2xl font-black">{editingIndex !== null ? "Editar Género" : "Nuevo Género"}</h2>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="p-8 pt-0 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Nombre</label>
                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ name: e.target.value })}
                                    placeholder="Ej: Unisex"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500 transition-all"
                                />
                            </div>
                            <button type="submit" className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black text-lg hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">
                                {editingIndex !== null ? "Guardar Cambios" : "Crear Género"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
