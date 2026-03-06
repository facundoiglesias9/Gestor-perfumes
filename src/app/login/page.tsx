"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { KeyRound, User, Loader2 } from "lucide-react";

import { useAppContext } from "@/context/AppContext";

export default function LoginPage() {
    const { login, usuarios } = useAppContext();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // 1. Check App Context Users
        if (usuarios && usuarios.length > 0) {
            const foundUser = usuarios.find((u: any) =>
                (u.username || "").toLowerCase() === email.toLowerCase() &&
                u.password === password
            );

            if (foundUser) {
                if (foundUser.status === "Inactivo") {
                    setError("Tu cuenta está inactiva. Contactá al administrador.");
                    setLoading(false);
                    return;
                }

                // Actualiza el estado GLOBAL de la app antes de navegar
                login(foundUser);
                setLoading(false);

                // Forzamos recarga para que el AppContext levante la nueva sesión limpiamente
                window.location.href = foundUser.role === "minorista" ? "/minorista" : "/";
                return;
            }
        }

        // 2. Fallback for primary admin 'facundo' if not in list
        if (email === "facundo" && password === "admin123") {
            const adminUser = { id: "admin-facu", username: "facundo", role: "admin" as const, status: "Activo" as const };
            login(adminUser);
            setLoading(false);
            window.location.href = "/";
            return;
        }

        // 3. Try searching the custom 'usuarios' table (for non-admin users on new machines)
        try {
            const { data: dbUser, error: dbError } = await supabase
                .from("usuarios")
                .select("*")
                .ilike("username", email)
                .eq("password", password)
                .single();

            if (!dbError && dbUser) {
                if (dbUser.status === "Inactivo") {
                    setError("Tu cuenta está inactiva. Contactá al administrador.");
                    setLoading(false);
                    return;
                }

                const foundUser = {
                    id: dbUser.id,
                    username: dbUser.username,
                    role: dbUser.role as any,
                    status: dbUser.status as any
                };

                login(foundUser);
                setLoading(false);

                // Forzamos recarga para inicializar AppContext con el nuevo usuario
                window.location.href = foundUser.role === "minorista" ? "/minorista" : "/";
                return;
            }
        } catch (err) {
            console.error("Error searching custom table:", err);
        }

        // 4. Try Supabase Auth as last resort (for production users)
        try {
            const { data, error: sbError } = await supabase.auth.signInWithPassword({
                email, // Supabase expects email format
                password,
            });

            if (!sbError) {
                // Supabase flow will trigger onAuthStateChange in AppContext
                window.location.href = "/";
                return;
            }

            // If it reached here and didn't find a mock user, it's a real failure
            setError("Credenciales incorrectas.");
        } catch (err) {
            setError("Error de conexión.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--background)]">
            {/* Dynamic Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[var(--primary)]/20 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />

            <div className="glass w-full max-w-md p-8 rounded-[var(--radius)] shadow-2xl z-10 mx-4 transition-all hover:shadow-[0_0_30px_rgba(192,132,252,0.15)] flex flex-col gap-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--primary)] to-blue-400 bg-clip-text text-transparent">
                        Gestor de Perfumes
                    </h1>
                    <p className="text-sm text-slate-400">Ingresá tus credenciales para continuar</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2 relative">
                        <label className="text-sm font-medium text-slate-300 ml-1">Nombre de usuario</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Tu nombre de usuario"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-[#0f172a]/50 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 relative">
                        <label className="text-sm font-medium text-slate-300 ml-1">Contraseña</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-[#0f172a]/50 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-medium py-3 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:active:scale-100 shadow-[0_4px_14px_0_rgba(192,132,252,0.39)] hover:shadow-[0_6px_20px_rgba(192,132,252,0.23)]"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Iniciar Sesión"}
                    </button>
                </form>
            </div>
        </div>
    );
}
