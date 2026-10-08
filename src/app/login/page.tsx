"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, User, Loader2, Eye, EyeOff } from "lucide-react";
import { iniciarSesion } from "@/lib/auth-actions";

import { useAppContext, type UserRole } from "@/context/AppContext";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
    const { login, addSystemLog, currentUser, mounted } = useAppContext();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (mounted && currentUser) {
            router.replace("/lista-precios");
        }
    }, [currentUser, mounted, router]);

    // La contraseña se revisa en el servidor; si es correcta, el servidor abre la sesión (cookie).
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const usuario = email.trim();
        const resultado = await iniciarSesion(usuario, password);

        if (!resultado.ok) {
            setError(resultado.error);
            addSystemLog("auth", `Intento de inicio de sesión fallido para: ${usuario}`);
            setLoading(false);
            return;
        }

        const u = resultado.dato!;
        if (u.username.toLowerCase() !== "facundo") {
            addSystemLog("auth", `Inicio de sesión exitoso: ${u.username} (${u.role})`);
        }
        login({ id: u.id, username: u.username, role: u.role as UserRole, status: "Activo", lastLogin: u.lastLogin });
        // Recarga completa para que el sistema arranque con la sesión nueva
        window.location.href = "/lista-precios";
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#F9F6F0] dark:bg-[#1B1D1A] transition-colors duration-500">
            {/* Dynamic Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#7D9878]/10 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#A3B69B]/10 blur-[100px] pointer-events-none" />

            {/* Theme Toggle in Corner */}
            <div className="absolute top-8 right-8 z-50">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md p-10 rounded-[2.5rem] bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] shadow-2xl z-10 mx-4 transition-all flex flex-col gap-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#7D9878] via-[#A3B69B] to-[#7D9878]" />

                <div className="text-center space-y-3">
                    <h1 className="text-4xl font-black tracking-tighter text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">
                        Scenta <span className="text-[#7D9878] dark:text-[#A3B69B]">Gestión</span>
                    </h1>
                    <p className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-[0.2em]">Acceso al Sistema Privado</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest ml-1">Usuario</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7D9878] dark:text-[#A3B69B] z-10 transition-colors pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Ingresá tu usuario"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoCapitalize="none"
                                autoCorrect="off"
                                autoComplete="username"
                                spellCheck={false}
                                required
                                className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-4 pl-12 pr-4 text-[#2C2C2C] dark:text-[#F4EFEA] placeholder-[#2C2C2C]/40 dark:placeholder-[#F4EFEA]/40 focus:outline-none focus:ring-2 focus:ring-[#7D9878]/20 focus:border-[#7D9878] transition-all font-bold text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest ml-1">Contraseña</label>
                        <div className="relative group">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7D9878] dark:text-[#A3B69B] z-10 transition-colors pointer-events-none" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-4 pl-12 pr-12 text-[#2C2C2C] dark:text-[#F4EFEA] placeholder-[#2C2C2C]/40 dark:placeholder-[#F4EFEA]/40 focus:outline-none focus:ring-2 focus:ring-[#7D9878]/20 focus:border-[#7D9878] transition-all font-bold text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7D9878] dark:text-[#A3B69B] hover:text-[#6b8566] dark:hover:text-white transition-colors z-10 p-1"
                                title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-500 text-xs font-black uppercase tracking-wider text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#7D9878] hover:bg-[#6b8566] text-white font-black text-sm uppercase tracking-widest py-5 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl shadow-[#7D9878]/20 disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ingresar"}
                    </button>
                </form>

                <div className="pt-2 text-center space-y-3">
                    <a
                        href="/catalogo"
                        className="inline-block text-xs font-bold text-[#7D9878] dark:text-[#A3B69B] hover:underline"
                    >
                        ¿Querés comprar? Mirá nuestro catálogo →
                    </a>
                    <p className="text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 text-[10px] font-black uppercase tracking-widest">
                        Acceso Exclusivo • Scenta System v1.0
                    </p>
                </div>
            </div>
        </div>
    );
}
