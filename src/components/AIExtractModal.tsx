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
    const { generos } = useAppContext();
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

    const processFile = (file: File) => {
        setIsProcessing(true);
        // Simulate AI extraction delay
        setTimeout(() => {
            const mockData: Esencia[] = [
                {
                    id: `E-AI-${Date.now()}-1`,
                    name: "INVictus (Paco Rabanne)",
                    category: "Perfumería Fina",
                    gender: "Masculino",
                    provider: "Van Rossum",
                    cost: 12500,
                    price30g: 12500,
                    price100g: 32000,
                    qty: 0,
                    lastUpdate: new Date().toLocaleDateString(),
                    source: "captured"
                },
                {
                    id: `E-AI-${Date.now()}-2`,
                    name: "Good Girl (Carolina Herrera)",
                    category: "Perfumería Fina",
                    gender: "Femenino",
                    provider: "Van Rossum",
                    cost: 15300,
                    price30g: 15300,
                    price100g: 39100,
                    qty: 0,
                    lastUpdate: new Date().toLocaleDateString(),
                    source: "captured"
                },
                {
                    id: `E-AI-${Date.now()}-3`,
                    name: "Sauvage (Dior)",
                    category: "Perfumería Fina",
                    gender: "Masculino",
                    provider: "Van Rossum",
                    cost: 18900,
                    price30g: 18900,
                    price100g: 48500,
                    qty: 0,
                    lastUpdate: new Date().toLocaleDateString(),
                    source: "captured"
                }
            ];
            setExtractedData(mockData);
            setIsProcessing(false);
        }, 2000);
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
        onConfirm(extractedData);
        setExtractedData([]);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-100 dark:border-white/5 animate-in zoom-in-95 duration-500">

                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <div className="p-2 bg-indigo-500 rounded-2xl text-white">
                                <Camera className="w-6 h-6" />
                            </div>
                            Escaneo Inteligente
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 pl-11">
                            Extraé nombres y precios directamente de tus listas Van Rossum.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-rose-500 rounded-full transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col p-8 gap-8">

                    {extractedData.length === 0 && !isProcessing && (
                        <div
                            className={`flex-1 border-4 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-6 transition-all duration-300 ${dragActive ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-100 dark:border-white/5 hover:border-indigo-500/30'}`}
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
                            <div className="p-8 bg-indigo-500/10 rounded-[2.5rem] text-indigo-500">
                                <Upload className="w-16 h-16" strokeWidth={1.5} />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-2xl font-black text-slate-900 dark:text-white">Soltá tu archivo o hacé clic</p>
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Soporta PDF, JPG, PNG de Van Rossum</p>
                            </div>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500">
                            <div className="relative">
                                <Loader2 className="w-24 h-24 text-indigo-500 animate-spin" strokeWidth={1} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="w-10 h-10 text-indigo-600 animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center space-y-3">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Analizando Lista...</h3>
                                <p className="text-slate-500 dark:text-slate-400 font-bold max-w-xs mx-auto">
                                    Nuestra IA está identificando nombres de esencias, géneros y precios de la captura.
                                </p>
                            </div>
                        </div>
                    )}

                    {extractedData.length > 0 && (
                        <div className="flex-1 flex flex-col gap-6 overflow-hidden animate-in slide-in-from-bottom-5 duration-700">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                    Esencias Detectadas ({extractedData.length})
                                </h3>
                                <p className="text-xs font-bold text-amber-500 bg-amber-500/10 px-4 py-2 rounded-full uppercase tracking-tighter"> Revisá y editá si falta algo </p>
                            </div>

                            <div className="flex-1 overflow-y-auto rounded-[2rem] border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                                        <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="px-8 py-6">Nombre de la Esencia</th>
                                            <th className="px-8 py-6">Género</th>
                                            <th className="px-8 py-6 text-right">Precio 30g</th>
                                            <th className="px-8 py-6 text-right">Precio 100g</th>
                                            <th className="px-8 py-6"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-bold">
                                        {extractedData.map((item) => (
                                            <tr key={item.id} className="group hover:bg-white dark:hover:bg-white/5 transition-colors">
                                                <td className="px-8 py-4">
                                                    <input
                                                        type="text"
                                                        value={item.name}
                                                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white p-0 font-bold"
                                                    />
                                                </td>
                                                <td className="px-8 py-4">
                                                    <select
                                                        value={item.gender}
                                                        onChange={(e) => updateItem(item.id, 'gender', e.target.value)}
                                                        className="bg-transparent border-none focus:ring-0 text-slate-500 dark:text-slate-400 p-0 font-bold cursor-pointer"
                                                    >
                                                        <option value="">Género</option>
                                                        {generos.map((g, idx) => (
                                                            <option key={idx} value={g}>{g}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="text-slate-400">$</span>
                                                        <input
                                                            type="number"
                                                            value={item.price30g}
                                                            onFocus={(e) => e.target.select()}
                                                            onChange={(e) => updateItem(item.id, 'price30g', parseFloat(e.target.value) || 0)}
                                                            className="w-24 bg-transparent border-none focus:ring-0 text-right p-0 font-black text-emerald-600 dark:text-emerald-400"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="text-slate-400">$</span>
                                                        <input
                                                            type="number"
                                                            value={item.price100g}
                                                            onFocus={(e) => e.target.select()}
                                                            onChange={(e) => updateItem(item.id, 'price100g', parseFloat(e.target.value) || 0)}
                                                            className="w-28 bg-transparent border-none focus:ring-0 text-right p-0 font-black text-indigo-600 dark:text-indigo-400"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <button
                                                        onClick={() => removeItem(item.id)}
                                                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
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
                                    className="px-8 py-4 rounded-2xl bg-slate-100 dark:bg-white/5 font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                                >
                                    Descartar
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 active:scale-95 transition-all flex items-center gap-3"
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
