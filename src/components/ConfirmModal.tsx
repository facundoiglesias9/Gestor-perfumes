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
        <div className="fixed inset-0 z-[200] flex items-center justify-center pt-24 pb-8 px-4 sm:px-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white dark:bg-[#242723] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-[#E6DFD5] dark:border-[#353B33] animate-in zoom-in-95 duration-300 my-auto relative">
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 p-2.5 rounded-full bg-[#1B1D1A] text-white hover:bg-rose-600 hover:text-white hover:rotate-90 hover:scale-110 active:scale-95 transition-all duration-300 shadow-sm border border-[#353B33] flex items-center justify-center shrink-0 cursor-pointer"
                    title="Cerrar"
                >
                    <X className="w-5 h-5" />
                </button>
                <div className="p-6 text-center space-y-4 pt-8">
                    <div className="w-16 h-16 mx-auto bg-[#C9866F]/10 text-[#C9866F] rounded-2xl flex items-center justify-center mb-2">
                        <AlertTriangle className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-xl font-extrabold text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">{title}</h2>
                    <p className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 font-medium text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="p-4 bg-[#F9F6F0] dark:bg-[#1B1D1A] flex gap-3 border-t border-[#E6DFD5] dark:border-[#353B33]">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 rounded-xl font-bold text-[#2C2C2C] dark:text-[#F4EFEA] bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] hover:bg-[#7D9878]/10 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-[#C9866F] hover:bg-[#b06f59] shadow-lg shadow-[#C9866F]/20 active:scale-[0.98] transition-all"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
}
