"use client";

import { Users, Plus, Search, Filter, Shield, User as UserIcon, Phone, MoreHorizontal, UserCheck, UserX, X, Save, Trash2, Edit3, ShieldCheck, Store, Tags } from "lucide-react";
import { useState, useMemo } from "react";
import { useAppContext, Usuario, UserRole } from "@/context/AppContext";

export default function GestionUsuariosPage() {
    const { usuarios, addUsuario, updateUsuario, deleteUsuario } = useAppContext();
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);

    // Form state
    const [formData, setFormData] = useState<Omit<Usuario, "id">>({
        username: "",
        password: "",
        role: "minorista",
        status: "Activo"
    });

    const filteredUsers = useMemo(() => {
        return usuarios.filter(u =>
            (u.username || "").toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [usuarios, searchTerm]);

    const handleOpenModal = (user?: Usuario) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                password: "", // Don't show password on edit
                role: user.role,
                status: user.status
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: "",
                password: "",
                role: "minorista",
                status: "Activo"
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            const { password, ...rest } = formData;
            // Only update password if provided
            const updated = password
                ? { ...formData, id: editingUser.id }
                : { ...rest, id: editingUser.id };
            updateUsuario(updated as Usuario);
        } else {
            const newId = (usuarios.length + 1).toString().padStart(3, "0");
            addUsuario({ ...formData, id: newId });
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string, username: string) => {
        if (window.confirm(`¿Estás seguro de que querés eliminar al usuario "${username}"?`)) {
            deleteUsuario(id);
        }
    };

    const getRoleIcon = (role: UserRole) => {
        switch (role) {
            case "admin": return <ShieldCheck className="w-4 h-4" />;
            case "minorista": return <Store className="w-4 h-4" />;
            case "mayorista": return <Tags className="w-4 h-4" />;
        }
    };

    const getRoleColor = (role: UserRole) => {
        switch (role) {
            case "admin": return "bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400";
            case "minorista": return "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
            case "mayorista": return "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400";
        }
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <Shield className="w-3.5 h-3.5" />
                        Acceso de Personal
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Gestión de Usuarios
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Controlá el acceso al sistema configurando roles y credenciales.
                    </p>
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/20 active:scale-95 transition-all"
                >
                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                    Alta de Usuario
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                    <input
                        type="text"
                        placeholder="Buscar por usuario (email)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all font-semibold border-b-2 border-transparent focus:border-indigo-500"
                    />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center font-bold text-slate-400 uppercase text-xs tracking-widest px-8">
                    {filteredUsers.length} Usuarios Encontrados
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Usuario (Login)</th>
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Rol / Categoría</th>
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Estado</th>
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all font-bold">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-black text-sm uppercase">
                                            {user.username.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-slate-900 dark:text-slate-100 font-bold text-base">{user.username}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase ${getRoleColor(user.role)}`}>
                                        {getRoleIcon(user.role)}
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${user.status === 'Activo'
                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                        }`}>
                                        {user.status === 'Activo' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                                        {user.status}
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleOpenModal(user)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                                            title="Editar"
                                        >
                                            <Edit3 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id, user.username)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
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

            {/* User Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                                {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Usuario (Login / Email)</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ej: usuario@empresa.com"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Clave (Password)</label>
                                    <input
                                        required={!editingUser}
                                        type="password"
                                        placeholder={editingUser ? "Dejar en blanco para no cambiar" : "Mínimo 6 caracteres"}
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Rol / Categoría</label>
                                        <select
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 font-black focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="minorista">Minorista</option>
                                            <option value="mayorista">Mayorista</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Estado</label>
                                        <select
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value as "Activo" | "Inactivo" })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 font-black focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                        >
                                            <option value="Activo">Activo</option>
                                            <option value="Inactivo">Inactivo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-black text-xl hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                            >
                                <Save className="w-6 h-6" />
                                {editingUser ? "Guardar Cambios" : "Dar de Alta"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
