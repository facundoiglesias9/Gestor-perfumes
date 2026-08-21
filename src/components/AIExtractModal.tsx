"use client";

import { X, Upload, FileText, Camera, Loader2, Save, Trash2, CheckCircle2 } from "lucide-react";
import { useState, useRef } from "react";
import { Esencia, useAppContext } from "@/context/AppContext";

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

    if (!isOpen) return null;

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

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pt-24 pb-8 px-4 sm:px-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
            <div className="bg-white dark:bg-[#242723] rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[calc(100vh-8rem)] flex flex-col overflow-hidden border border-[#E6DFD5] dark:border-[#353B33] animate-in zoom-in-95 duration-500 my-auto">

                {/* Header */}
                <div className="p-8 border-b border-[#E6DFD5] dark:border-[#353B33] flex justify-between items-center bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                    <div>
                        <h2 className="text-3xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] flex items-center gap-3 font-brand">
                            <div className="p-2 bg-[#7D9878] rounded-2xl text-white">
                                <Camera className="w-6 h-6" />
                            </div>
                            Escaneo Inteligente
                        </h2>
                        <p className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 font-bold mt-1 pl-11">
                            Extraé nombres y precios directamente de tus listas Van Rossum.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-full bg-[#1B1D1A] text-white hover:bg-rose-600 hover:text-white hover:rotate-90 hover:scale-110 active:scale-95 transition-all duration-300 shadow-sm border border-[#353B33] flex items-center justify-center shrink-0 cursor-pointer"
                        title="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col p-8 gap-8">

                    {extractedData.length === 0 && !isProcessing && (
                        <div
                            className={`flex-1 border-4 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-6 transition-all duration-300 ${dragActive ? 'border-[#7D9878] bg-[#7D9878]/10' : 'border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]/50'}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileChange}
                                accept="image/*,application/pdf"
                            />
                            <div className="p-8 bg-[#7D9878]/10 rounded-[2.5rem] text-[#7D9878]">
                                <Upload className="w-16 h-16" strokeWidth={1.5} />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-2xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">Soltá tu archivo o hacé clic</p>
                                <p className="text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 font-bold uppercase tracking-widest text-xs">Soporta PDF, JPG, PNG de Van Rossum</p>
                            </div>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500">
                            <div className="relative">
                                <Loader2 className="w-24 h-24 text-[#7D9878] animate-spin" strokeWidth={1} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="w-10 h-10 text-[#7D9878] animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center space-y-3">
                                <h3 className="text-2xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">Analizando Lista...</h3>
                                <p className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 font-bold max-w-xs mx-auto">
                                    Nuestra IA está identificando nombres de esencias, géneros y precios de la captura.
                                </p>
                            </div>
                        </div>
                    )}

                    {extractedData.length > 0 && (
                        <div className="flex-1 flex flex-col gap-6 overflow-hidden animate-in slide-in-from-bottom-5 duration-700">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-[#2C2C2C] dark:text-[#F4EFEA] flex items-center gap-2 font-brand">
                                    <CheckCircle2 className="w-6 h-6 text-[#7D9878]" />
                                    Esencias Detectadas ({extractedData.length})
                                </h3>
                                <p className="text-xs font-bold text-[#DAC4AA] bg-[#DAC4AA]/10 px-4 py-2 rounded-full uppercase tracking-tighter"> Revisá y editá si falta algo </p>
                            </div>

                            <div className="flex-1 overflow-y-auto rounded-[2rem] border border-[#E6DFD5] dark:border-[#353B33] bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-white dark:bg-[#242723] z-10">
                                        <tr className="border-b border-[#E6DFD5] dark:border-[#353B33] text-[10px] font-black text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest">
                                            <th className="px-8 py-6">Nombre de la Esencia</th>
                                            <th className="px-8 py-6 hidden">Género</th>
                                            <th className="px-8 py-6 text-right">100 Gramos (USD)</th>
                                            <th className="px-8 py-6 text-right">250 Gramos (USD)</th>
                                            <th className="px-8 py-6 w-12 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E6DFD5] dark:divide-[#353B33] font-bold">
                                        {extractedData.map((item) => (
                                            <tr key={item.id} className="group hover:bg-white dark:hover:bg-[#242723] transition-colors">
                                                <td className="px-8 py-4">
                                                    <input
                                                        type="text"
                                                        value={item.name}
                                                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:ring-0 text-[#2C2C2C] dark:text-[#F4EFEA] p-0 font-bold"
                                                    />
                                                </td>
                                                <td className="px-8 py-4 hidden">
                                                    <select
                                                        value={item.gender}
                                                        onChange={(e) => updateItem(item.id, 'gender', e.target.value)}
                                                        className="bg-transparent border-none focus:ring-0 text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 p-0 font-bold cursor-pointer"
                                                    >
                                                        <option value="">Género</option>
                                                        {generos.map((g, idx) => (
                                                            <option key={idx} value={g}>{g}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="text-[#7D9878] font-bold">u$s</span>
                                                        <input
                                                            type="number"
                                                            value={item.price100gUsd}
                                                            onFocus={(e) => e.target.select()}
                                                            onChange={(e) => updateItem(item.id, 'price100gUsd', parseFloat(e.target.value) || 0)}
                                                            className="w-24 bg-transparent border-none focus:ring-0 text-right p-0 font-black text-[#7D9878] dark:text-[#A3B69B] tabular-nums"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="text-[#7D9878] font-bold">u$s</span>
                                                        <input
                                                            type="number"
                                                            value={item.price250gUsd}
                                                            onFocus={(e) => e.target.select()}
                                                            onChange={(e) => updateItem(item.id, 'price250gUsd', parseFloat(e.target.value) || 0)}
                                                            className="w-24 bg-transparent border-none focus:ring-0 text-right p-0 font-black text-[#7D9878] dark:text-[#A3B69B] tabular-nums"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4 w-12 text-center">
                                                    <button
                                                        onClick={() => removeItem(item.id)}
                                                        className="p-2 text-[#2C2C2C]/40 hover:text-[#C9866F] transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end gap-4 pt-4">
                                <button
                                    onClick={() => setExtractedData([])}
                                    className="px-8 py-4 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] font-bold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 hover:bg-[#7D9878]/10 border border-[#E6DFD5] dark:border-[#353B33] transition-all"
                                >
                                    Descartar
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="px-8 py-4 rounded-2xl bg-[#7D9878] text-white font-black hover:bg-[#6b8566] shadow-xl shadow-[#7D9878]/30 active:scale-95 transition-all flex items-center gap-3"
                                >
                                    <Save className="w-5 h-5" />
                                    Importar {extractedData.length} Esencias
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Sparkles(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    );
}
