"use client";

import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                <div className="p-6 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mb-2">
                        <AlertTriangle className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-50">{title}</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950/50 flex gap-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20 active:scale-[0.98] transition-all"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
}
