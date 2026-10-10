"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Trash2, X, Edit2, Users as UsersIcon, ListTree, Sparkles, Droplets, Car, Wind, Package, User, UserCheck, Users } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";
import Ventana from "@/components/Ventana";

type TabType = "proveedores" | "categorias" | "generos";

export default function ParametrosPage() {
    const [activeTab, setActiveTab] = useState<TabType>("proveedores");

    const {
        proveedores, setProveedores,
        categorias, setCategorias,
        generos, setGeneros,
        esencias, setEsencias,
        insumos, setInsumos,
        productos, setProductos,
        inventario, setInventario,
        getNextId
    } = useAppContext();

    // ─── Search States ──────────────────────────────────
    const [searchTerm, setSearchTerm] = useState("");

    // ─── Modal States ───────────────────────────────────
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [formData, setFormData] = useState({ name: "", contact: "" });
    const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);
    const [indexToDelete, setIndexToDelete] = useState<number | null>(null);

    // ─── Form Handlers ──────────────────────────────────
    const handleOpenAddModal = () => {
        setEditingId(null);
        setFormData({ name: "", contact: "" });
        setIsAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setEditingId(null);
        setFormData({ name: "", contact: "" });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = formData.name.trim();
        if (!trimmedName) return;

        if (activeTab === "proveedores") {
            if (editingId !== null) {
                const oldProvider = proveedores.find(p => p.id === editingId);
                setProveedores(proveedores.map(p => p.id === editingId ? { ...p, name: trimmedName, contact: formData.contact } : p));
                if (oldProvider) {
                    setEsencias(esencias.map(esc => esc.provider === oldProvider.name ? { ...esc, provider: trimmedName } : esc));
                    setInsumos(insumos.map(ins => ins.provider === oldProvider.name ? { ...ins, provider: trimmedName } : ins));
                }
            } else {
                setProveedores([
                    { id: getNextId(proveedores, "P-"), name: trimmedName, contact: formData.contact },
                    ...proveedores
                ]);
            }
        } else if (activeTab === "categorias") {
            if (editingId !== null) {
                const oldCategory = categorias.find(c => c.id === editingId);
                setCategorias(categorias.map(c => c.id === editingId ? { ...c, name: trimmedName } : c));
                if (oldCategory) {
                    setEsencias(esencias.map(esc => esc.category === oldCategory.name ? { ...esc, category: trimmedName } : esc));
                    setInsumos(insumos.map(ins => ins.category === oldCategory.name ? { ...ins, category: trimmedName } : ins));
                    setInventario(inventario.map(inv => inv.category === oldCategory.name ? { ...inv, category: trimmedName } : inv));
                    setProductos(productos.map(p => p.category === oldCategory.name ? { ...p, category: trimmedName } : p));
                }
            } else {
                setCategorias([
                    { id: getNextId(categorias, "C-"), name: trimmedName, count: 0 },
                    ...categorias
                ]);
            }
        } else if (activeTab === "generos") {
            if (typeof editingId === "number") {
                const oldName = generos[editingId];
                const updated = [...generos];
                updated[editingId] = trimmedName;
                setGeneros(updated);
                setProductos(productos.map(p => p.gender === oldName ? { ...p, gender: trimmedName } : p));
            } else {
                if (!generos.includes(trimmedName)) {
                    setGeneros([trimmedName, ...generos]);
                }
            }
        }

        handleCloseModal();
    };

    const confirmDelete = () => {
        if (activeTab === "proveedores" && itemToDelete !== null) {
            setProveedores(proveedores.filter(p => p.id !== itemToDelete));
        } else if (activeTab === "categorias" && itemToDelete !== null) {
            setCategorias(categorias.filter(c => c.id !== itemToDelete));
        } else if (activeTab === "generos" && indexToDelete !== null) {
            setGeneros(generos.filter((_, idx) => idx !== indexToDelete));
        }

        setItemToDelete(null);
        setIndexToDelete(null);
    };

    // ─── Filtered Data ──────────────────────────────────
    const filteredProveedores = useMemo(() => {
        return proveedores.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.contact.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [proveedores, searchTerm]);

    const filteredCategorias = useMemo(() => {
        return categorias.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [categorias, searchTerm]);

    const filteredGeneros = useMemo(() => {
        return generos.filter(g => g.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [generos, searchTerm]);

    // ─── Icon Helpers ──────────────────────────────────
    const getCategoryIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes("auto")) return <Car className="w-6 h-6" />;
        if (n.includes("fina") || n.includes("perfume")) return <Sparkles className="w-6 h-6" />;
        if (n.includes("pisos") || n.includes("limpia")) return <Droplets className="w-6 h-6" />;
        if (n.includes("difusor") || n.includes("ambiente")) return <Wind className="w-6 h-6" />;
        return <Package className="w-6 h-6" />;
    };

    const getGenderIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes("fem") || n.includes("mujer")) return <User className="w-6 h-6 rotate-[-10deg]" />;
        if (n.includes("masc") || n.includes("hombre")) return <UserCheck className="w-6 h-6 rotate-[10deg]" />;
        return <Users className="w-6 h-6" />;
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700 relative max-w-[1400px] mx-auto">
            {/* Header */}
            <header className="relative text-center p-8 md:p-10 bg-white dark:bg-[#242723] rounded-[2.5rem] border border-[#E6DFD5] dark:border-[#353B33] shadow-sm flex flex-col items-center justify-center">
                <div className="space-y-2 flex flex-col items-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] font-brand text-center">
                        Parámetros y Clasificación
                    </h1>
                    <p className="text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 text-lg font-medium text-center">
                        {activeTab === "proveedores" && "Gestioná la base de datos de tus proveedores de insumos y esencias."}
                        {activeTab === "categorias" && "Gestioná las secciones de tu catálogo de productos y aromas."}
                        {activeTab === "generos" && "Configurá los perfiles y géneros de tus fragancias."}
                    </p>
                </div>

                <div className="mt-6 flex items-center gap-3">
                    {activeTab === "categorias" && (
                        <button
                            onClick={() => {
                                const defaultOfficialCategories = [
                                    { id: "CAT-50ML", name: "Frascos de 50 ML", count: 0 },
                                    { id: "CAT-30ML", name: "Frascos de 30 ML", count: 0 },
                                    { id: "CAT-DIF", name: "Frascos Difusores", count: 0 },
                                    { id: "CAT-AUTO", name: "Frascos de Auto", count: 0 }
                                ];
                                setCategorias(defaultOfficialCategories);
                                localStorage.setItem("categorias", JSON.stringify(defaultOfficialCategories));
                            }}
                            className="px-5 py-3.5 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C] dark:text-[#F4EFEA] font-bold border border-[#E6DFD5] dark:border-[#353B33] hover:bg-[#7D9878]/10 transition-all text-sm"
                        >
                            Cargar Categorías Oficiales
                        </button>
                    )}
                    {activeTab === "generos" && (
                        <button
                            onClick={() => {
                                const officialGeneros = ["Femenino", "Masculino", "Unisex", "Ambiente"];
                                setGeneros(officialGeneros);
                                localStorage.setItem("generos", JSON.stringify(officialGeneros));
                            }}
                            className="px-5 py-3.5 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C] dark:text-[#F4EFEA] font-bold border border-[#E6DFD5] dark:border-[#353B33] hover:bg-[#7D9878]/10 transition-all text-sm"
                        >
                            Cargar Géneros Oficiales
                        </button>
                    )}
                    <button
                        onClick={handleOpenAddModal}
                        className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#7D9878] hover:bg-[#6b8566] text-white font-bold transition-all shadow-lg shadow-[#7D9878]/20 active:scale-95 whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                        Nuevo {activeTab === "proveedores" ? "Proveedor" : activeTab === "categorias" ? "Categoría" : "Género"}
                    </button>
                </div>
            </header>

            {/* CENTERED TAB SWITCHER (Between Header and Search Bar) */}
            <div className="flex justify-center my-6">
                <div className="bg-[#F9F6F0] dark:bg-[#1B1D1A] p-1.5 rounded-2xl flex items-center gap-1.5 border border-[#E6DFD5] dark:border-[#353B33] shadow-inner">
                    <button
                        onClick={() => { setActiveTab("proveedores"); setSearchTerm(""); }}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
                            activeTab === "proveedores"
                                ? "bg-[#7D9878] text-white shadow-lg shadow-[#7D9878]/30 scale-[1.02]"
                                : "text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 hover:text-[#7D9878] dark:hover:text-[#A3B69B]"
                        }`}
                    >
                        <UsersIcon className="w-4 h-4" />
                        Proveedores
                    </button>
                    <button
                        onClick={() => { setActiveTab("categorias"); setSearchTerm(""); }}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
                            activeTab === "categorias"
                                ? "bg-[#7D9878] text-white shadow-lg shadow-[#7D9878]/30 scale-[1.02]"
                                : "text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 hover:text-[#7D9878] dark:hover:text-[#A3B69B]"
                        }`}
                    >
                        <ListTree className="w-4 h-4" />
                        Categorías
                    </button>
                    <button
                        onClick={() => { setActiveTab("generos"); setSearchTerm(""); }}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
                            activeTab === "generos"
                                ? "bg-[#7D9878] text-white shadow-lg shadow-[#7D9878]/30 scale-[1.02]"
                                : "text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 hover:text-[#7D9878] dark:hover:text-[#A3B69B]"
                        }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        Géneros
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-3xl p-6 shadow-sm">
                <div className="relative group w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 group-focus-within:text-[#7D9878] transition-colors" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={`Buscar ${activeTab}...`}
                        className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-3.5 pl-14 pr-6 text-[#2C2C2C] dark:text-[#F4EFEA] placeholder:text-[#2C2C2C]/50 dark:placeholder:text-[#F4EFEA]/60 focus:outline-none focus:border-[#7D9878] transition-all font-semibold"
                    />
                </div>
            </div>

            {/* TAB CONTENT: PROVEEDORES */}
            {activeTab === "proveedores" && (
                <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-3xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="bg-[#F9F6F0] dark:bg-[#1B1D1A] border-b border-[#E6DFD5] dark:border-[#353B33] text-[11px] font-black uppercase text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 tracking-wider">
                                    <th className="px-8 py-5">Proveedor</th>
                                    <th className="px-8 py-5">Contacto</th>
                                    <th className="px-8 py-5 text-center">Productos</th>
                                    <th className="px-8 py-5 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E6DFD5] dark:divide-[#353B33]">
                                {filteredProveedores.map((prov) => {
                                    const productsCount =
                                        esencias.filter(e => e.provider === prov.name).length +
                                        insumos.filter(i => i.provider === prov.name).length;

                                    return (
                                        <tr key={prov.id} className="group hover:bg-[#7D9878]/5 dark:hover:bg-[#A3B69B]/10 transition-colors">
                                            <td className="px-8 py-5 font-bold text-[#2C2C2C] dark:text-[#F4EFEA] text-base">
                                                {prov.name}
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C]/80 dark:text-[#F4EFEA]/80 font-bold text-xs border border-[#E6DFD5] dark:border-[#353B33]">
                                                    {prov.contact || "Sin contacto"}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] font-bold text-xs">
                                                    {productsCount} ítems
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingId(prov.id);
                                                            setFormData({ name: prov.name, contact: prov.contact });
                                                            setIsAddModalOpen(true);
                                                        }}
                                                        className="p-2.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 rounded-xl transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setItemToDelete(prov.id)}
                                                        className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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
            )}

            {/* TAB CONTENT: CATEGORIAS */}
            {activeTab === "categorias" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCategorias.map((cat) => (
                        <div
                            key={cat.id}
                            className="bg-white dark:bg-[#242723] rounded-3xl p-6 border border-[#E6DFD5] dark:border-[#353B33] shadow-sm hover:border-[#7D9878]/50 transition-all flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] rounded-2xl">
                                    {getCategoryIcon(cat.name)}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">{cat.name}</h3>
                                    <p className="text-xs font-medium text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50">Categoría</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => {
                                        setEditingId(cat.id);
                                        setFormData({ name: cat.name, contact: "" });
                                        setIsAddModalOpen(true);
                                    }}
                                    className="p-2.5 text-[#2C2C2C]/50 hover:text-[#7D9878] hover:bg-[#7D9878]/10 rounded-xl transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setItemToDelete(cat.id)}
                                    className="p-2.5 text-[#2C2C2C]/50 hover:text-[#C9866F] hover:bg-[#C9866F]/10 rounded-xl transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB CONTENT: GENEROS */}
            {activeTab === "generos" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGeneros.map((name, idx) => (
                        <div
                            key={idx}
                            className="bg-white dark:bg-[#242723] rounded-3xl p-6 border border-[#E6DFD5] dark:border-[#353B33] shadow-sm hover:border-[#7D9878]/50 transition-all flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] rounded-2xl">
                                    {getGenderIcon(name)}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">{name}</h3>
                                    <p className="text-xs font-medium text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50">Género / Segmento</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => {
                                        setEditingId(idx);
                                        setFormData({ name, contact: "" });
                                        setIsAddModalOpen(true);
                                    }}
                                    className="p-2.5 text-[#2C2C2C]/50 hover:text-[#7D9878] hover:bg-[#7D9878]/10 rounded-xl transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setIndexToDelete(idx)}
                                    className="p-2.5 text-[#2C2C2C]/50 hover:text-[#C9866F] hover:bg-[#C9866F]/10 rounded-xl transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Crear / Editar */}
            <Ventana abierta={isAddModalOpen} onCerrar={handleCloseModal} cerrarAlTocarFondo={false}>
            {isAddModalOpen && (
                    <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 max-h-[calc(100vh-8rem)] flex flex-col overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between border-b border-[#E6DFD5] dark:border-[#353B33] pb-4 bg-[#F9F6F0] dark:bg-[#1B1D1A] -mx-8 -mt-8 p-6 rounded-t-3xl">
                            <h3 className="text-xl font-extrabold text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">
                                {editingId !== null ? "Editar" : "Nuevo"} {activeTab === "proveedores" ? "Proveedor" : activeTab === "categorias" ? "Categoría" : "Género"}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="p-2.5 rounded-full bg-[#1B1D1A] text-white hover:bg-rose-600 hover:text-white hover:rotate-90 hover:scale-110 active:scale-95 transition-all duration-300 shadow-sm border border-[#353B33] flex items-center justify-center shrink-0 cursor-pointer"
                                title="Cerrar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl p-3 text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:ring-2 focus:ring-[#7D9878] font-bold"
                                />
                            </div>

                            {activeTab === "proveedores" && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50">Contacto / Teléfono</label>
                                    <input
                                        type="text"
                                        value={formData.contact}
                                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                        className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl p-3 text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:ring-2 focus:ring-[#7D9878] font-bold"
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-[#E6DFD5] dark:border-[#353B33]">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-5 py-2.5 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 font-bold hover:bg-[#7D9878]/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl bg-[#7D9878] text-white font-bold hover:bg-[#6b8566] transition-colors shadow-md shadow-[#7D9878]/20"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
            )}
            </Ventana>

            {/* Modal de Confirmación de Borrado */}
            <ConfirmModal
                isOpen={itemToDelete !== null || indexToDelete !== null}
                title={`Eliminar ${activeTab === "proveedores" ? "Proveedor" : activeTab === "categorias" ? "Categoría" : "Género"}`}
                message="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
                onConfirm={confirmDelete}
                onCancel={() => { setItemToDelete(null); setIndexToDelete(null); }}
            />
        </div>
    );
}
