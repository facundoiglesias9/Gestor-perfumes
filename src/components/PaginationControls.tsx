"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    showSummary?: boolean;
}

const getPaginationRange = (currentPage: number, totalPages: number) => {
    const delta = 2;
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
            range.push(i);
        }
    }

    for (const i of range) {
        if (typeof i === "number") {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }
    }

    return rangeWithDots;
};

export default function PaginationControls({
    currentPage,
    totalPages,
    onPageChange,
    showSummary = true
}: PaginationControlsProps) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6">
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#242723] p-2 rounded-3xl border border-[#E6DFD5] dark:border-[#353B33] shadow-sm">
                {/* First Page */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="p-2.5 rounded-2xl text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#7D9878]/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    title="Primera Página"
                >
                    <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Prev Page */}
                <button
                    onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2.5 rounded-2xl text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#7D9878]/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    title="Página Anterior"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1 px-1">
                    {getPaginationRange(currentPage, totalPages).map((p, idx) => {
                        if (p === "...") {
                            return (
                                <span key={`dots-${idx}`} className="px-2 text-xs font-bold text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40">
                                    ...
                                </span>
                            );
                        }
                        const isCurrent = p === currentPage;
                        return (
                            <button
                                key={`page-${p}`}
                                onClick={() => onPageChange(Number(p))}
                                className={`w-9 h-9 rounded-xl font-black text-xs transition-all duration-200 flex items-center justify-center ${
                                    isCurrent
                                        ? "bg-[#7D9878] text-white shadow-md shadow-[#7D9878]/30 scale-105"
                                        : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 hover:bg-[#7D9878]/10 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"
                                }`}
                            >
                                {p}
                            </button>
                        );
                    })}
                </div>

                {/* Next Page */}
                <button
                    onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2.5 rounded-2xl text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#7D9878]/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    title="Página Siguiente"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last Page */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2.5 rounded-2xl text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#7D9878]/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    title="Última Página"
                >
                    <ChevronsRight className="w-4 h-4" />
                </button>
            </div>

            {showSummary && (
                <span className="text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">
                    Página {currentPage} de {totalPages}
                </span>
            )}
        </div>
    );
}
