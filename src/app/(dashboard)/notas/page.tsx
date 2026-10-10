"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { StickyNote, Plus, Trash2, Edit3, X, Check } from "lucide-react";

type Nota = {
    id: string;
    text: string;
    createdAt: number;
    color: string;
};

const PASTEL_COLORS = [
    "bg-yellow-200 text-yellow-900 border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-100 dark:border-yellow-500/30",
    "bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-100 dark:border-emerald-500/30",
    "bg-pink-200 text-pink-900 border-pink-300 dark:bg-pink-500/20 dark:text-pink-100 dark:border-pink-500/30",
    "bg-blue-200 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-100 dark:border-blue-500/30"
];

export default function NotasPage() {
    const { currentUser } = useAppContext();
    const [notas, setNotas] = useState<Nota[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [editingNote, setEditingNote] = useState<string | null>(null);
    const [editVal, setEditVal] = useState("");

    useEffect(() => {
        if (!currentUser) return;
        const key = `reseller_notas_${currentUser.username}`;
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                setNotas(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Error loading notes");
        }
        setIsLoaded(true);
    }, [currentUser]);

    const saveStorage = (newNotas: Nota[]) => {
        if (!currentUser) return;
        const key = `reseller_notas_${currentUser.username}`;
        localStorage.setItem(key, JSON.stringify(newNotas));
    };

    const addNota = () => {
        const newNota: Nota = {
            id: `N-${Date.now()}`,
            text: "Nueva nota vacía. Haz clic en el lápiz para editarla...",
            createdAt: Date.now(),
            color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)]
        };
        const arr = [newNota, ...notas];
        setNotas(arr);
        saveStorage(arr);

        // Auto-open editor
        setEditingNote(newNota.id);
        setEditVal(newNota.text);
    };

    const deleteNota = (id: string) => {
        const arr = notas.filter(n => n.id !== id);
        setNotas(arr);
        saveStorage(arr);
    };

    const confirmEdit = (id: string) => {
        const arr = notas.map(n => n.id === id ? { ...n, text: editVal } : n);
        setNotas(arr);
        saveStorage(arr);
        setEditingNote(null);
    };

    if (!isLoaded) return null;

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            <header className="relative text-center p-8 md:p-10 bg-white dark:bg-[#242723] rounded-[2.5rem] border border-[#E6DFD5] dark:border-[#353B33] shadow-sm flex flex-col items-center justify-center">
                <div className="space-y-3 flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] text-xs font-bold tracking-widest uppercase mb-1 border border-[#7D9878]/20">
                        <StickyNote className="w-3.5 h-3.5" />
                        Herramientas Personales
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] transition-colors font-brand text-center">
                        Notas
                    </h1>
                    <p className="text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 text-lg max-w-xl leading-relaxed font-medium transition-colors text-center">
                        Tu espacio privado tipo post-it para anotar solicitudes, recordatorios o estrategias de venta rápidas.
                    </p>
                </div>

                <div className="mt-6">
                    <button
                        onClick={addNota}
                        className="flex shrink-0 items-center justify-center gap-2 px-6 py-4 bg-[#7D9878] hover:bg-[#6b8566] text-white font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#7D9878]/20 group font-brand"
                    >
                        <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                        Pegar un Post-it Nuevo
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 px-2 items-start">
                {notas.map((nota) => (
                    <div
                        key={nota.id}
                        className={`relative group rounded-[2rem] p-6 shadow-md border hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rotate-1 hover:rotate-0 flex flex-col ${nota.color} min-h-[160px]`}
                    >
                        {/* Decorative Pin */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-400/80 dark:bg-red-500 shadow-sm border border-red-500/50"></div>

                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            {editingNote !== nota.id && (
                                <>
                                    <button
                                        onClick={() => { setEditingNote(nota.id); setEditVal(nota.text); }}
                                        className="p-2 bg-black/5 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 rounded-full transition-colors"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => deleteNota(nota.id)}
                                        className="p-2 bg-black/5 dark:bg-white/10 hover:bg-rose-500 hover:text-white rounded-full transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>

                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-4 mb-2">
                            {new Date(nota.createdAt).toLocaleDateString()} a las {new Date(nota.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>

                        {editingNote === nota.id ? (
                            <div className="flex-1 flex flex-col mb-2 relative z-10">
                                <textarea
                                    autoFocus
                                    value={editVal}
                                    onChange={(e) => setEditVal(e.target.value)}
                                    onInput={(e) => {
                                        e.currentTarget.style.height = 'auto';
                                        e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                                    }}
                                    className="w-full bg-transparent focus:outline-none resize-none font-medium mb-4 border-b border-black/10 dark:border-white/10 py-2 leading-tight overflow-hidden"
                                    placeholder="Escribe tu nota aquí..."
                                    rows={3}
                                />
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => setEditingNote(null)}
                                        className="p-2.5 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 rounded-full transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => confirmEdit(nota.id)}
                                        className="p-2.5 bg-[#7D9878] text-white hover:bg-[#6b8566] rounded-full transition-colors shadow-md"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="whitespace-pre-wrap font-medium leading-relaxed break-words">
                                {nota.text}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {notas.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center">
                    <StickyNote className="w-16 h-16 text-[#7D9878]/40 dark:text-[#7D9878]/30 mb-4" />
                    <h3 className="text-xl font-bold text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">Sin notas aún</h3>
                    <p className="text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 font-medium">Creá un post-it para no olvidarte de nada.</p>
                </div>
            )}
        </div>
    );
}
