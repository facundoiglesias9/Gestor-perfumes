"use client";

import { Search, Plus, Trash2, X, Edit2, Users as UsersIcon } from "lucide-react";
import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";

export default function ProveedoresPage() {
    const { proveedores, setProveedores,
        esencias, setEsencias,
        insumos, setInsumos, getNextId } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: "", contact: "" });
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingId) {
            const oldProvider = proveedores.find(p => p.id === editingId);
            const newName = formData.name;

            setProveedores(proveedores.map(p => p.id === editingId ? {
                ...p,
                name: newName,
                contact: formData.contact
            } : p));

            if (oldProvider) {
                // Cascade a Esencias
                setEsencias(esencias.map(esc => esc.provider === oldProvider.name ? { ...esc, provider: newName } : esc));
                // Cascade a Insumos
                setInsumos(insumos.map(ins => ins.provider === oldProvider.name ? { ...ins, provider: newName } : ins));
            }

            setEditingId(null);
        } else {
            setProveedores([
                {
                    id: getNextId(proveedores, "P-"),
                    name: formData.name,
                    contact: formData.contact
                },
                ...proveedores
            ]);
        }

        setFormData({ name: "", contact: "" });
        setIsAddModalOpen(false);
    };

    const openEditModal = (item: any) => {
        setEditingId(item.id);
        setFormData({
            name: item.name,
            contact: item.contact
        });
        setIsAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setEditingId(null);
        setFormData({ name: "", contact: "" });
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            setProveedores(proveedores.filter(c => c.id !== itemToDelete));
            setItemToDelete(null);
        }
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700 relative">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <UsersIcon className="w-3.5 h-3.5" />
                        Directorio
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Proveedores
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Gestioná la base de datos de tus proveedores de insumos y esencias.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-cyan-600 text-white font-bold hover:bg-cyan-700 hover:shadow-xl hover:shadow-cyan-600/20 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                        Nuevo Proveedor
                    </button>
                </div>
            </header>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden transition-colors duration-300 relative min-h-[400px] flex flex-col">
                <div className="p-6 md:p-8 flex flex-col sm:flex-row gap-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-cyan-500 dark:group-focus-within:text-cyan-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar proveedor..."
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-14 pr-6 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 dark:focus:border-cyan-500 transition-all font-semibold"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[30%]">Proveedor</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[30%] text-left">Contacto</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[20%] text-center">Productos</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[20%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {proveedores.map((prov, idx) => {
                                const productsCount =
                                    esencias.filter(e => e.provider === prov.name).length +
                                    insumos.filter(i => i.provider === prov.name).length;

                                return (
                                    <tr key={idx} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                                        <td className="px-8 py-6">
                                            <p className="text-slate-900 dark:text-slate-100 font-bold text-lg group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{prov.name}</p>
                                        </td>
                                        <td className="px-8 py-6 text-left">
                                            <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-sm border border-slate-200 dark:border-slate-700">
                                                {prov.contact}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-bold text-sm border border-cyan-100 dark:border-cyan-500/20">
                                                {productsCount} ítems
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openEditModal(prov)}
                                                    className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 rounded-xl transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => setItemToDelete(prov.id)}
                                                    className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Eliminar Proveedor"
                message="¿Estás seguro de que deseas eliminar este proveedor? Esto borrará el enlace a esencias o insumos asociados."
                onConfirm={confirmDelete}
                onCancel={() => setItemToDelete(null)}
            />

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                        <div className="p-8 pb-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">{editingId ? "Editar Proveedor" : "Nuevo Proveedor"}</h2>
                                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">{editingId ? "Actualizá los datos del distribuidor." : "Ingresá los datos del distribuidor."}</p>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddSubmit} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Nombre Comercial</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Aromas del Mundo S.A."
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 dark:focus:border-cyan-500 transition-all font-semibold"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Contacto / Teléfono</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.contact}
                                    onChange={e => setFormData({ ...formData, contact: e.target.value })}
                                    placeholder="Ej: juan@aromas.com o 11-4455-6677"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 dark:focus:border-cyan-500 transition-all font-semibold"
                                />
                            </div>

                            <button type="submit" className="w-full py-4 mt-4 rounded-2xl bg-cyan-600 text-white font-extrabold text-lg hover:bg-cyan-700 hover:shadow-xl hover:shadow-cyan-600/20 active:scale-[0.98] transition-all">
                                {editingId ? "Guardar Cambios" : "Cargar Proveedor"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
