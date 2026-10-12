"use client";

import { TriangleAlert } from "lucide-react";
import Ventana from "@/components/Ventana";
import { PanelVentana, PieVentana, BOTON_PELIGRO, BOTON_PRINCIPAL, BOTON_SECUNDARIO } from "@/components/ventana-partes";

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    /** Texto del botón de confirmar (por defecto "Eliminar") */
    confirmText?: string;
    /** false si confirmar no borra nada (el botón sale verde en vez de rojo) */
    peligro?: boolean;
}

// Pregunta antes de hacer algo que no se puede deshacer
export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Eliminar", peligro = true }: ConfirmModalProps) {
    return (
        <Ventana abierta={isOpen} onCerrar={onCancel} etiqueta={title}>
            <PanelVentana ancho="sm">
                <div className="px-7 pt-7 pb-6 flex items-start gap-4">
                    <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${peligro ? "bg-[#C9866F]/12 text-[#B5654A] dark:text-[#DBA793]" : "bg-[#7D9878]/10 text-[#5A7356] dark:text-[#A3B69B]"}`}>
                        <TriangleAlert className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 pt-0.5">
                        <h2 className="text-xl font-bold leading-tight text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">{title}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60">{message}</p>
                    </div>
                </div>
                <PieVentana className="justify-end">
                    <button type="button" onClick={onCancel} className={BOTON_SECUNDARIO}>
                        Cancelar
                    </button>
                    <button type="button" onClick={onConfirm} className={peligro ? BOTON_PELIGRO : BOTON_PRINCIPAL}>
                        {confirmText}
                    </button>
                </PieVentana>
            </PanelVentana>
        </Ventana>
    );
}
