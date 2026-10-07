"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, User, Loader2, Eye, EyeOff } from "lucide-react";
import { fetchTable } from "@/lib/db-actions";

import { useAppContext } from "@/context/AppContext";
import ThemeToggle from "@/components/ThemeToggle";

// Ya no hay cuentas de clientes: el sistema interno es solo para administradores.
const SOLO_EQUIPO = "Este acceso es solo para el equipo de Scenta. Para comprar, mirá nuestro catálogo.";

export default function LoginPage() {
    const { login, usuarios, addSystemLog, updateUsuario, currentUser, mounted } = useAppContext();
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
                if (foundUser.role !== "admin") {
                    setError(SOLO_EQUIPO);
                    setLoading(false);
                    return;
                }

                if (foundUser.username.toLowerCase() !== "facundo") {
                    addSystemLog("auth", `Inicio de sesión exitoso: ${foundUser.username} (${foundUser.role || 'usuario'})`, { method: "context" });
                }

                // Calculate their specific redirect path based on their role
                let targetPath = "/lista-precios";

                const updatedUser = { ...foundUser, lastLogin: new Date().toLocaleDateString("es-AR") };

                // Actualiza la BD o array con el nuevo login usando updateUsuario
                try {
                    await updateUsuario(updatedUser);
                } catch (e) { console.error("Error updating user:", e) }

                // Actualiza el estado GLOBAL de la app antes de navegar
                login(updatedUser);
                setLoading(false);

                // Forzamos recarga para que el AppContext levante la nueva sesión limpiamente
                window.location.href = targetPath;
                return;
            }
        }

        // 2. Fallback for primary admin 'facundo' if not in list
        if (email === "facundo" && password === "admin123") {
            const adminUser = { id: "admin-facu", username: "facundo", role: "admin" as const, status: "Activo" as const };
            login(adminUser);
            setLoading(false);
            window.location.href = "/lista-precios";
            return;
        }

        // 3. Try searching the custom 'usuarios' table (for non-admin users on new machines)
        try {
            const { data: usersData, error: dbError } = await fetchTable("usuarios", { 
                filter: { username: email, password: password } 
            });
            const dbUser = usersData?.[0];

            if (!dbError && dbUser) {
                if (dbUser.status === "Inactivo") {
                    setError("Tu cuenta está inactiva. Contactá al administrador.");
                    setLoading(false);
                    return;
                }
                if (dbUser.role !== "admin") {
                    setError(SOLO_EQUIPO);
                    setLoading(false);
                    return;
                }

                if (dbUser.username.toLowerCase() !== "facundo") {
                    addSystemLog("auth", `Inicio de sesión exitoso: ${dbUser.username} (${dbUser.role || 'usuario'})`, { method: "xata_table" });
                }

                const foundUser = {
                    id: dbUser.id,
                    username: dbUser.username,
                    role: dbUser.role as any,
                    status: dbUser.status as any
                };

                // Calculate their specific redirect path based on their role
                let targetPath = "/lista-precios";

                const updatedUser = { ...foundUser, lastLogin: new Date().toLocaleDateString("es-AR") };

                // Actualiza la DB con nuevo login
                try {
                    await updateUsuario(updatedUser);
                } catch (e) { console.error("Error updating user:", e) }

                login(updatedUser);
                setLoading(false);

                window.location.href = targetPath;
                return;
            }
        } catch (err) {
            console.error("Error searching custom table:", err);
            addSystemLog("error", "Error al intentar iniciar sesión en DB", { error: err });
        }

        // 4. Failed
        setError("Credenciales incorrectas.");
        addSystemLog("auth", `Intento de inicio de sesión fallido para: ${email}`);
        setLoading(false);
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
