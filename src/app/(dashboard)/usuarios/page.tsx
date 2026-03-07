"use client";

import { useState, useMemo } from "react";
import {
    Users,
    Search,
    Filter,
    Plus,
    Edit3,
    Trash2,
    Shield,
    UserPlus,
    X,
    CheckCircle2,
    ShieldAlert,
    Clock,
    KeyRound,
    Mail,
    Loader2
} from "lucide-react";
import { useAppContext, Usuario, UserRole } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";

export default function GestionUsuariosPage() {
    const { usuarios, addUsuario, updateUsuario, deleteUsuario, isLoading } = useAppContext();
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<UserRole | "Todos">("Todos");
    const [statusFilter, setStatusFilter] = useState<"Todos" | "Activo" | "Inactivo">("Todos");

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        role: "minorista" as UserRole,
        status: "Activo" as "Activo" | "Inactivo"
    });

    const filteredUsuarios = useMemo(() => {
        return usuarios.filter(u => {
            const lowSearch = searchTerm.toLowerCase();
            const matchesSearch = searchTerm === "" ||
                u.username.toLowerCase().includes(lowSearch) ||
                (u.email || "").toLowerCase().includes(lowSearch);
            const matchesRole = roleFilter === "Todos" || u.role === roleFilter;
            const matchesStatus = statusFilter === "Todos" || u.status === statusFilter;
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [usuarios, searchTerm, roleFilter, statusFilter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            await updateUsuario({ ...editingUser, ...formData });
        } else {
            const newUser: Usuario = {
                id: Math.random().toString(36).substr(2, 9),
                ...formData
            };
            await addUsuario(newUser);
        }

        setIsSuccess(true);
        setTimeout(() => {
            setIsSuccess(false);
            setIsCreateModalOpen(false);
            setEditingUser(null);
            setFormData({ username: "", email: "", password: "", role: "minorista", status: "Activo" });
        }, 1500);
    };

    const handleEdit = (user: Usuario) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            email: user.email || "",
            password: user.password || "",
            role: user.role,
            status: user.status
        });
        setIsCreateModalOpen(true);
    };

    if (isLoading) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">
                        <Shield className="w-3.5 h-3.5" />
                        Seguridad de Sistema
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white transition-colors">
                        Control de Acceso
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl font-medium tracking-tight leading-relaxed">
                        Administrá credenciales, roles y estados de todos los usuarios registrados en Scenta.
                    </p>
                </div>

                <button
                    onClick={() => { setEditingUser(null); setIsCreateModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-3 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                >
                    <UserPlus className="w-5 h-5" />
                    Nuevo Usuario
                </button>
            </header>

            {/* Filtros */}
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por usuario o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl py-3 pl-10 pr-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/30 outline-none shadow-sm dark:text-white transition-all"
                    />
                </div>

                <div className="flex gap-3">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as any)}
                        className="bg-white dark:bg-slate-800 border-none rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-sm dark:text-white cursor-pointer"
                    >
                        <option value="Todos">Todos los Roles</option>
                        <option value="admin">Admin</option>
                        <option value="mayorista">Mayorista</option>
                        <option value="minorista">Minorista</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="bg-white dark:bg-slate-800 border-none rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-sm dark:text-white cursor-pointer"
                    >
                        <option value="Todos">Todos los Estados</option>
                        <option value="Activo">Activos</option>
                        <option value="Inactivo">Inactivos</option>
                    </select>
                </div>
            </div>

            {/* Grilla de Usuarios */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsuarios.map(u => (
                    <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={u.id}
                        className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 group"
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xl shadow-inner">
                                    {u.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="font-black text-slate-900 dark:text-white tracking-tight">{u.username}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate max-w-[150px]">{u.email || "Sin email"}</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] border ${u.status === 'Activo'
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border-emerald-100 dark:border-emerald-500/20'
                                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 border-rose-100 dark:border-rose-500/20'
                                }`}>
                                {u.status}
                            </span>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                                <span className="flex items-center gap-2 uppercase tracking-tighter"><ShieldAlert className="w-3.5 h-3.5" /> Rol de Acceso:</span>
                                <span className="text-slate-900 dark:text-white uppercase">{u.role}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 p-3">
                                <span className="flex items-center gap-2 uppercase tracking-tighter"><Clock className="w-3.5 h-3.5" /> Última Conexión:</span>
                                <span className="text-slate-900 dark:text-white">24/02/2026</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEdit(u)}
                                className="flex-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <Edit3 className="w-3.5 h-3.5" /> Editar
                            </button>
                            <button
                                onClick={() => deleteUsuario(u.id)}
                                className="w-12 h-12 flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all active:scale-90"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Modal de Creación/Edición */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
                            onClick={() => setIsCreateModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl relative overflow-hidden"
                        >
                            {isSuccess ? (
                                <div className="p-12 text-center space-y-4">
                                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                                        <CheckCircle2 className="w-10 h-10" />
                                    </div>
                                    <h2 className="text-2xl font-black dark:text-white tracking-tighter">¡Operación Exitosa!</h2>
                                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">El usuario ha sido actualizado correctamente.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="space-y-1">
                                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                                {editingUser ? "Configurar Perfil" : "Crear Usuario"}
                                            </h2>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                {editingUser ? `ID: ${editingUser.id}` : "Ingresá los datos del nuevo acceso"}
                                            </p>
                                        </div>
                                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                                            <X className="w-6 h-6" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <Users className="w-3 h-3" /> Nombre de Usuario
                                            </label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-indigo-500/30 dark:text-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <Mail className="w-3 h-3" /> Email Institucional
                                            </label>
                                            <input
                                                required
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-indigo-500/30 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <KeyRound className="w-3 h-3" /> Contraseña Secreta
                                            </label>
                                            <input
                                                required
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-indigo-500/30 dark:text-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <ShieldAlert className="w-3 h-3" /> Rol del Sistema
                                            </label>
                                            <select
                                                value={formData.role}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-indigo-500/30 dark:text-white cursor-pointer"
                                            >
                                                <option value="admin">Administrador Full</option>
                                                <option value="mayorista">Revendedor Mayorista</option>
                                                <option value="minorista">Cliente Minorista</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado de Acceso</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, status: 'Activo' })}
                                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.status === 'Activo' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                                            >
                                                Habilitar Acceso
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, status: 'Inactivo' })}
                                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.status === 'Inactivo' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                                            >
                                                Inhabilitar Acceso
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                                    >
                                        {editingUser ? "Actualizar Miembro" : "Crear Acceso Ahora"}
                                    </button>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
