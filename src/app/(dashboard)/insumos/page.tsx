"use client";

import { Search, Plus, Filter, Layers, Trash2, X, Edit2 } from "lucide-react";
import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";

export default function InsumosPage() {
    const { insumos, setInsumos, categorias, proveedores, bases, setBases, productos, setProductos, getNextId } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        category: "",
        provider: "",
        cost: "",
        qty: "",
        unit: "un." // Default a unidades
    });

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingId) {
            const oldInsumo = insumos.find(i => i.id === editingId);
            const nameChanged = oldInsumo && oldInsumo.name !== formData.name;

            setInsumos(insumos.map(i => i.id === editingId ? {
                ...i,
                name: formData.name,
                category: formData.category,
                provider: formData.provider,
                cost: parseFloat(formData.cost),
                qty: parseFloat(formData.qty),
                unit: formData.unit
            } : i));

            if (nameChanged) {
                const updatedBases = bases.map(base => {
                    const hasComponent = base.components.some(c => c.type === "Insumo" && c.id === editingId);
                    if (!hasComponent) return base;
                    return {
                        ...base,
                        components: base.components.map(c =>
                            c.type === "Insumo" && c.id === editingId ? { ...c, name: formData.name } : c
                        )
                    };
                });
                setBases(updatedBases);

                const updatedProductos = productos.map(prod => {
                    const hasComponent = prod.components.some(c => c.type === "Insumo" && c.id === editingId);
                    if (!hasComponent) return prod;
                    return {
                        ...prod,
                        components: prod.components.map(c =>
                            c.type === "Insumo" && c.id === editingId ? { ...c, name: formData.name } : c
                        )
                    };
                });
                setProductos(updatedProductos);
            }

            setEditingId(null);
        } else {
            setInsumos([
                {
                    id: getNextId(insumos, "I-"),
                    name: formData.name,
                    category: formData.category,
                    provider: formData.provider,
                    cost: parseFloat(formData.cost),
                    qty: parseFloat(formData.qty),
                    stock: 0, // Inicia sin stock, se carga por inventario
                    unit: formData.unit
                },
                ...insumos
            ]);
        }

        setFormData({ name: "", category: "", provider: "", cost: "", qty: "", unit: "un." });
        setIsAddModalOpen(false);
    };

    const openEditModal = (item: any) => {
        setEditingId(item.id);
        setFormData({
            name: item.name,
            category: item.category,
            provider: item.provider,
            cost: item.cost.toString(),
            qty: item.qty ? item.qty.toString() : "",
            unit: item.unit || "un."
        });
        setIsAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setEditingId(null);
        setFormData({ name: "", category: "", provider: "", cost: "", qty: "", unit: "un." });
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            setInsumos(insumos.filter(i => i.id !== itemToDelete));
            setItemToDelete(null);
        }
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700 relative">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <Layers className="w-3.5 h-3.5" />
                        Componentes
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Insumos
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Catálogo de piezas, frascos, tapas y etiquetas necesarios para el ensamblado.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/20 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                        Agregar Insumo
                    </button>
                </div>
            </header>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden transition-colors duration-300 relative min-h-[400px] flex flex-col">
                <div className="p-6 md:p-8 flex flex-col sm:flex-row gap-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar insumo o proveedor..."
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-14 pr-6 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all font-semibold"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[10%]">Código</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[20%]">Insumo</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[15%]">Categoría</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[15%]">Proveedor</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[15%] text-right">Cant. x Bulto</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[15%] text-right">Costo / Bulto</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[10%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {insumos.map((item, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                                    <td className="px-8 py-6">
                                        <span className="font-mono text-sm font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg group-hover:bg-white dark:group-hover:bg-slate-700 transition-all border border-transparent dark:border-slate-700">
                                            {item.id.slice(0, 5)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-slate-900 dark:text-slate-100 font-bold text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.name}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-slate-600 dark:text-slate-300 font-medium text-sm flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                            {item.provider}
                                        </p>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <p className="text-slate-900 dark:text-slate-100 font-bold text-[15px]">{item.qty || 'N/A'} {item.unit}</p>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <p className="text-emerald-600 dark:text-emerald-400 font-extrabold text-lg">${item.cost.toLocaleString()}</p>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => setItemToDelete(item.id)}
                                                className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {insumos.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-8 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                                        No hay insumos cargados. ¡Agregá tu primer insumo!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Eliminar Insumo"
                message="¿Estás seguro de que deseas eliminar este insumo? Esta acción no se puede deshacer."
                onConfirm={confirmDelete}
                onCancel={() => setItemToDelete(null)}
            />

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                        <div className="p-8 pb-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">{editingId ? "Editar Insumo" : "Nuevo Insumo"}</h2>
                                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">{editingId ? "Modificá los datos del insumo" : "Ingresá los datos del nuevo insumo."}</p>
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
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Nombre</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Frasco Vidrio 50ml"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all font-semibold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Unidad de Medida</label>
                                    <select
                                        required
                                        value={formData.unit}
                                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all font-semibold"
                                    >
                                        <option value="un.">Unidades (un.)</option>
                                        <option value="ml">Mililitros (ml)</option>
                                    </select>
                                </div>

                                <div className="space-y-2 relative">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Cant. del Bulto</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            value={formData.qty}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => setFormData({ ...formData, qty: e.target.value })}
                                            placeholder="100"
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-4 pr-10 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-bold text-right"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                            {formData.unit}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 relative">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Costo por Bulto (ARS)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        value={formData.cost}
                                        onFocus={(e) => e.target.select()}
                                        onChange={e => setFormData({ ...formData, cost: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-10 pr-4 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Categoría Asociada</label>
                                <select
                                    required
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all font-semibold"
                                >
                                    <option value="" disabled>Seleccioná una categoría</option>
                                    {categorias.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                    {categorias.length === 0 && <option disabled>No hay categorías</option>}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Proveedor</label>
                                <select
                                    required
                                    value={formData.provider}
                                    onChange={e => setFormData({ ...formData, provider: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all font-semibold"
                                >
                                    <option value="" disabled>Seleccioná un proveedor</option>
                                    {proveedores.map(prov => (
                                        <option key={prov.id} value={prov.name}>{prov.name}</option>
                                    ))}
                                    {proveedores.length === 0 && <option disabled>No hay proveedores</option>}
                                </select>
                            </div>

                            <button type="submit" className="w-full py-4 mt-4 rounded-2xl bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center gap-2 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all">
                                {editingId ? "Guardar Cambios" : "Guardar Insumo"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
