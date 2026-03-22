"use client";

import { Trophy, Medal, Target, Star, Gift, ChevronRight, Users, Plus, X, Search, Award, Edit2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";

// Tipos para los logros
interface Logro {
    id: string;
    title: string;
    description: string;
    targetValue: number;
    type: "units" | "amount" | "orders" | "categories";
    rewardType: "discount" | "gift" | "shipping";
    rewardValue: number;
    icon: string;
}

const INITIAL_LOGROS: Logro[] = [
    {
        id: "1",
        title: "Vendedor de Oro",
        description: "Alcanzar 100 perfumes vendidos históricamente",
        targetValue: 100,
        type: "units",
        rewardType: "discount",
        rewardValue: 5,
        icon: "Trophy"
    },
    {
        id: "2",
        title: "Mix Maestro",
        description: "Comprar productos de 4 categorías diferentes",
        targetValue: 4,
        type: "categories",
        rewardType: "gift",
        rewardValue: 1,
        icon: "Star"
    },
    {
        id: "3",
        title: "Fidelidad Total",
        description: "Hacer 5 pedidos en el sistema",
        targetValue: 5,
        type: "orders",
        rewardType: "shipping",
        rewardValue: 0,
        icon: "Medal"
    }
];

export default function PremiosRevendedoresPage() {
    const { usuarios, orders } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingLogro, setEditingLogro] = useState<Logro | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [formData, setFormData] = useState<Omit<Logro, "id">>({
        title: "",
        description: "",
        targetValue: 0,
        type: "units",
        rewardType: "discount",
        rewardValue: 0,
        icon: "Trophy"
    });

    const [logros, setLogros] = useState<Logro[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('premios_logros');
            return saved ? JSON.parse(saved) : INITIAL_LOGROS;
        }
        return INITIAL_LOGROS;
    });

    useEffect(() => {
        localStorage.setItem('premios_logros', JSON.stringify(logros));
    }, [logros]);

    const handleOpenAdd = () => {
        setEditingLogro(null);
        setFormData({
            title: "",
            description: "",
            targetValue: 0,
            type: "units",
            rewardType: "discount",
            rewardValue: 0,
            icon: "Trophy"
        });
        setIsAddModalOpen(true);
    };

    const handleOpenEdit = (logro: Logro) => {
        setEditingLogro(logro);
        setFormData({
            title: logro.title,
            description: logro.description,
            targetValue: logro.targetValue,
            type: logro.type,
            rewardType: logro.rewardType,
            rewardValue: logro.rewardValue,
            icon: logro.icon
        });
        setIsAddModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setLogros(prev => prev.filter(l => l.id !== id));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingLogro) {
            setLogros(prev => prev.map(l => l.id === editingLogro.id ? { ...formData, id: editingLogro.id } : l));
        } else {
            setLogros(prev => [...prev, { ...formData, id: Math.random().toString(36).substr(2, 9) }]);
        }
        setIsAddModalOpen(false);
    };

    const revendedores = useMemo(() => {
        return usuarios.filter(u => u.role === "mayorista");
    }, [usuarios]);

    const filteredRevendedores = useMemo(() => {
        return revendedores.filter(r =>
            r.username.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [revendedores, searchTerm]);

    // Función mágica para calcular progreso REAL
    const calculateProgress = (username: string, logro: Logro) => {
        const userOrders = orders.filter(o => o.customerName === username);

        let current = 0;
        switch (logro.type) {
            case "units":
                current = userOrders.reduce((acc, o) =>
                    acc + o.items.reduce((sum, item) => sum + item.quantity, 0), 0
                );
                break;
            case "amount":
                current = userOrders.reduce((acc, o) => acc + o.total, 0);
                break;
            case "orders":
                current = userOrders.length;
                break;
            case "categories":
                const categories = new Set();
                userOrders.forEach(o => {
                    o.items.forEach(item => {
                        if (item.producto.category) categories.add(item.producto.category);
                    });
                });
                current = categories.size;
                break;
        }

        const percent = Math.min((current / logro.targetValue) * 100, 100);
        return { current, percent };
    };

    const getIcon = (iconName: string) => {
        switch (iconName) {
            case "Trophy": return <Trophy className="w-6 h-6" />;
            case "Medal": return <Medal className="w-6 h-6" />;
            case "Star": return <Star className="w-6 h-6" />;
            default: return <Award className="w-6 h-6" />;
        }
    };

    return (
        <div className="space-y-10 pb-20 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <header className="relative overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-8 md:p-12 rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white dark:border-slate-800">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black tracking-[0.2em] uppercase">
                            <Trophy className="w-4 h-4" />
                            Premios & Gamificación
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white leading-[0.9]">
                            Gamificación <br /> <span className="text-amber-500">Revendedores</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                            Configurá las metas y recompensas automáticas para incentivar a tus mejores vendedores.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative group w-full sm:w-80">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar revendedor..."
                                className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-[2rem] py-4 pl-14 pr-8 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-4 focus:ring-amber-500/10 transition-all font-bold"
                            />
                        </div>
                        <button
                            onClick={handleOpenAdd}
                            className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 rounded-[2rem] bg-amber-600 text-white font-black hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-amber-600/20 group"
                        >
                            <Target className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                            Crear Logro
                        </button>
                    </div>
                </div>
            </header>

            {/* Lista de Logros Configurables */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Star className="w-6 h-6 text-amber-500" />
                        Logros Activos
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {logros.map((logro) => (
                        <div key={logro.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors"></div>

                            <div className="flex items-start justify-between mb-6 relative z-10">
                                <div className="p-4 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl group-hover:scale-110 transition-transform">
                                    {getIcon(logro.icon)}
                                </div>
                                <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {logro.type}
                                </div>
                            </div>

                            <div className="space-y-2 relative z-10">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{logro.title}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                    {logro.description}
                                </p>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between relative z-10">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Recompensa</span>
                                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                        {logro.rewardType === "discount" ? `-${logro.rewardValue}% OFF` :
                                            logro.rewardType === "gift" ? `${logro.rewardValue} Regalo` : "Envío Gratis"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleOpenEdit(logro)}
                                        className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-all"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(logro.id)}
                                        className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Listado de Revendedores y sus Progresos */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Users className="w-6 h-6 text-indigo-500" />
                        Monitoreo de Revendedores
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950/50">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Revendedor</th>
                                {logros.slice(0, 3).map(l => (
                                    <th key={l.id} className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
                                        {l.title}
                                    </th>
                                ))}
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Estatus</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredRevendedores.map((u) => (
                                <tr key={u.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-8 py-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/20">
                                                {u.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-lg font-black text-slate-900 dark:text-white">{u.username}</p>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">ID: {u.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    {logros.slice(0, 3).map(l => {
                                        const { current, percent } = calculateProgress(u.username, l);
                                        return (
                                            <td key={l.id} className="px-8 py-8">
                                                <div className="space-y-3 max-w-[200px] mx-auto">
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                        <span>{current} / {l.targetValue}</span>
                                                        <span className={percent === 100 ? "text-emerald-500" : "text-indigo-600"}>
                                                            {Math.round(percent)}%
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-1000 ${percent === 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
                                                            style={{ width: `${percent}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="px-8 py-8 text-right">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.status === 'Activo' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'Activo' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                                            {u.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal para Crear / Editar Logro */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        ></motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 dark:border-slate-800"
                        >
                            <div className="p-10 pb-6 flex justify-between items-start">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                        {editingLogro ? "Editar Objetivo" : "Crear Nuevo Objetivo"}
                                    </h2>
                                    <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">Define las reglas para que el revendedor gane premios.</p>
                                </div>
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-10 pt-4 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Título del Logro</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            placeholder="Ej: Super Mayorista"
                                            className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-amber-500 rounded-2xl py-4 px-6 text-slate-900 dark:text-white font-bold transition-all outline-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Descripción</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Ej: Alcanzar 100 perfumes vendidos..."
                                            className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-amber-500 rounded-2xl py-4 px-6 text-slate-900 dark:text-white font-bold transition-all outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Tipo de Meta</label>
                                            <select
                                                required
                                                value={formData.type}
                                                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-amber-500 rounded-2xl py-4 px-6 text-slate-900 dark:text-white font-bold transition-all outline-none appearance-none"
                                            >
                                                <option value="units">Unidades Vendidas</option>
                                                <option value="amount">Monto Total ($)</option>
                                                <option value="orders">Cantidad de Pedidos</option>
                                                <option value="categories">Categorías Diferentes</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Valor Objetivo</label>
                                            <input
                                                required
                                                type="number"
                                                value={formData.targetValue}
                                                onChange={e => setFormData({ ...formData, targetValue: parseInt(e.target.value) })}
                                                placeholder="100"
                                                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-amber-500 rounded-2xl py-4 px-6 text-slate-900 dark:text-white font-bold transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Efecto</label>
                                            <select
                                                required
                                                value={formData.rewardType}
                                                onChange={e => setFormData({ ...formData, rewardType: e.target.value as any })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-amber-500 rounded-2xl py-4 px-6 text-slate-900 dark:text-white font-bold transition-all outline-none appearance-none"
                                            >
                                                <option value="discount">Descuento %</option>
                                                <option value="gift">Regalo / Muestras</option>
                                                <option value="shipping">Envío Gratis</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Valor Recompensa</label>
                                            <input
                                                required
                                                type="number"
                                                value={formData.rewardValue}
                                                onChange={e => setFormData({ ...formData, rewardValue: parseInt(e.target.value) })}
                                                placeholder="5"
                                                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-amber-500 rounded-2xl py-4 px-6 text-slate-900 dark:text-white font-bold transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-5 rounded-[2rem] bg-amber-600 text-white font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-amber-600/20 mt-4"
                                >
                                    {editingLogro ? "Guardar Cambios" : "Activar Objetivo"}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
