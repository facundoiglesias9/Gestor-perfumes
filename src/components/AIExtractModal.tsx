"use client";

import { Upload, Camera, LoaderCircle, Save, Trash2 } from "lucide-react";
import { useState, useRef } from "react";
import { Esencia, useAppContext } from "@/context/AppContext";
import Ventana from "@/components/Ventana";
import { PanelVentana, CabeceraVentana, CuerpoVentana, PieVentana, TituloGrupo, BOTON_PRINCIPAL, BOTON_SECUNDARIO } from "@/components/ventana-partes";

interface AIExtractModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (esencias: Esencia[]) => void;
}

export default function AIExtractModal({ isOpen, onClose, onConfirm }: AIExtractModalProps) {
    const { generos, usdRate } = useAppContext();
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedData, setExtractedData] = useState<Esencia[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = async (file: File) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const req = await fetch('/api/parse-puroil', {
                method: 'POST',
                body: formData
            });

            const result = await req.json();

            if (result.success && result.data && result.data.length > 0) {
                const liveData: Esencia[] = result.data.map((item: any, idx: number) => ({
                    id: `E-AI-${Date.now()}-${idx}`,
                    name: item.name,
                    category: "Esencia de Ambiente",
                    gender: "Ambiente",
                    provider: "Ezentie",
                    cost: 0,
                    price100gUsd: item.price100gUsd,
                    price250gUsd: item.price250gUsd,
                    qty: 0,
                    lastUpdate: new Date().toLocaleDateString(),
                    source: "captured"
                }));
                setExtractedData(liveData);
            } else {
                alert("No se pudieron detectar productos con los precios correctos en este PDF de Puroil.");
                setExtractedData([]);
            }
        } catch (e) {
            console.error(e);
            alert("Error procesando este archivo PDF. Verifique que sea un texto extraible");
        } finally {
            setIsProcessing(false);
        }
    };

    const updateItem = (id: string, field: string, value: any) => {
        setExtractedData(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const removeItem = (id: string) => {
        setExtractedData(prev => prev.filter(item => item.id !== id));
    };

    const handleConfirm = () => {
        const processedList = extractedData.map(item => ({
            ...item,
            cost: 0, // Not used strictly if we rely on 100g/250g, but kept for legacy compat
            price100g: item.price100gUsd ? Math.round(item.price100gUsd * usdRate) : 0,
            price250g: item.price250gUsd ? Math.round(item.price250gUsd * usdRate) : 0
        }));
        onConfirm(processedList);
        setExtractedData([]);
    };

    const precioUsd = "w-20 bg-transparent rounded-lg px-2 py-1.5 text-right text-sm font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA] outline-none hover:bg-[#F9F6F0] dark:hover:bg-[#1B1D1A] focus:bg-[#F9F6F0] dark:focus:bg-[#1B1D1A] focus:ring-2 focus:ring-[#7D9878]/20 transition-[background-color,box-shadow] duration-150";

    return (
        <Ventana abierta={isOpen} onCerrar={isProcessing ? undefined : onClose} cerrarAlTocarFondo={false} etiqueta="Escaneo inteligente">
            <PanelVentana ancho="xl">
                <CabeceraVentana
                    etiqueta="Escaneo inteligente"
                    titulo="Cargar esencias desde una lista"
                    descripcion="Subí una foto o un PDF de la lista de Van Rossum y se leen solos los nombres y los precios."
                    icono={Camera}
                    onCerrar={onClose}
                    cerrarDeshabilitado={isProcessing}
                />

                {/* 1. Elegir el archivo */}
                {extractedData.length === 0 && !isProcessing && (
                    <CuerpoVentana className="flex">
                        <div
                            role="button"
                            tabIndex={0}
                            aria-label="Elegir archivo de la lista"
                            className={`flex-1 min-h-[300px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 px-6 text-center cursor-pointer transition-[border-color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 ${dragActive
                                ? "border-[#7D9878] bg-[#7D9878]/[0.07]"
                                : "border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]/50 hover:bg-[#F9F6F0] dark:hover:bg-[#1B1D1A]"}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            onKeyDown={e => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    fileInputRef.current?.click();
                                }
                            }}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileChange}
                                accept="image/*,application/pdf"
                            />
                            <span className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-150 ${dragActive ? "bg-[#7D9878] text-white" : "bg-[#7D9878]/10 text-[#5A7356] dark:text-[#A3B69B]"}`}>
                                <Upload className="w-6 h-6" />
                            </span>
                            <div>
                                <p className="text-base font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">
                                    {dragActive ? "Soltalo acá" : "Arrastrá el archivo acá o tocá para elegirlo"}
                                </p>
                                <p className="mt-1 text-sm text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">PDF, JPG o PNG</p>
                            </div>
                        </div>
                    </CuerpoVentana>
                )}

                {/* 2. Leyendo */}
                {isProcessing && (
                    <CuerpoVentana className="flex flex-col items-center justify-center gap-4 min-h-[340px] text-center">
                        <LoaderCircle className="w-10 h-10 text-[#7D9878] dark:text-[#A3B69B] animate-spin" />
                        <div>
                            <p className="text-base font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">Leyendo la lista…</p>
                            <p className="mt-1 max-w-xs text-sm text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                                Se están identificando los nombres y precios de cada esencia. Puede tardar unos segundos.
                            </p>
                        </div>
                    </CuerpoVentana>
                )}

                {/* 3. Revisar lo encontrado */}
                {extractedData.length > 0 && (
                    <>
                        <CuerpoVentana className="anim-entrada">
                            <TituloGrupo derecha={<span className="text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">Revisá y corregí lo que haga falta</span>}>
                                {extractedData.length} {extractedData.length === 1 ? "esencia encontrada" : "esencias encontradas"}
                            </TituloGrupo>
                            <div className="rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[11px] font-semibold uppercase tracking-wider text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left font-semibold">Esencia</th>
                                            <th className="hidden">Género</th>
                                            <th className="px-4 py-2.5 text-right font-semibold w-36">100 g</th>
                                            <th className="px-4 py-2.5 text-right font-semibold w-36">250 g</th>
                                            <th className="w-12"><span className="sr-only">Quitar</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70">
                                        {extractedData.map((item) => (
                                            <tr key={item.id} className="group">
                                                <td className="px-2 py-1.5">
                                                    <input
                                                        type="text"
                                                        aria-label="Nombre de la esencia"
                                                        value={item.name}
                                                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                                        className="w-full bg-transparent rounded-lg px-2 py-1.5 font-medium text-[#2C2C2C] dark:text-[#F4EFEA] outline-none hover:bg-[#F9F6F0] dark:hover:bg-[#1B1D1A] focus:bg-[#F9F6F0] dark:focus:bg-[#1B1D1A] focus:ring-2 focus:ring-[#7D9878]/20 transition-[background-color,box-shadow] duration-150"
                                                    />
                                                </td>
                                                <td className="hidden">
                                                    <select
                                                        value={item.gender}
                                                        onChange={(e) => updateItem(item.id, 'gender', e.target.value)}
                                                    >
                                                        <option value="">Género</option>
                                                        {generos.map((g, idx) => (
                                                            <option key={idx} value={g}>{g}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <span className="text-xs text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45">US$</span>
                                                        <input
                                                            type="number"
                                                            aria-label="Precio de 100 gramos en dólares"
                                                            value={item.price100gUsd}
                                                            onFocus={(e) => e.target.select()}
                                                            onChange={(e) => updateItem(item.id, 'price100gUsd', parseFloat(e.target.value) || 0)}
                                                            className={precioUsd}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <span className="text-xs text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45">US$</span>
                                                        <input
                                                            type="number"
                                                            aria-label="Precio de 250 gramos en dólares"
                                                            value={item.price250gUsd}
                                                            onFocus={(e) => e.target.select()}
                                                            onChange={(e) => updateItem(item.id, 'price250gUsd', parseFloat(e.target.value) || 0)}
                                                            className={precioUsd}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-2 py-1.5 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(item.id)}
                                                        aria-label={`Quitar ${item.name}`}
                                                        title="Quitar"
                                                        className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[#2C2C2C]/35 dark:text-[#F4EFEA]/35 hover:text-[#B5654A] hover:bg-[#C9866F]/10 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-[opacity,color,background-color] duration-150"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CuerpoVentana>
                        <PieVentana>
                            <button type="button" onClick={() => setExtractedData([])} className={BOTON_SECUNDARIO}>
                                Descartar
                            </button>
                            <button type="button" onClick={handleConfirm} className={BOTON_PRINCIPAL}>
                                <Save className="w-4 h-4" />
                                Importar {extractedData.length} {extractedData.length === 1 ? "esencia" : "esencias"}
                            </button>
                        </PieVentana>
                    </>
                )}
            </PanelVentana>
        </Ventana>
    );
}
