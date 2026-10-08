"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ThemeToggle() {
    const [theme, setTheme] = useState("light");

    useEffect(() => {
        // Run once on mount to determine the current theme state
        if (document.documentElement.classList.contains("dark")) {
            setTheme("dark");
        } else if (localStorage.getItem("theme") === "dark") {
            setTheme("dark");
            document.documentElement.classList.add("dark");
        } else if (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setTheme("dark");
            document.documentElement.classList.add("dark");
        }
    }, []);

    const toggleTheme = () => {
        if (theme === "light") {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
            setTheme("dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
            setTheme("light");
        }
    };

    return (
        <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-[#242723] hover:bg-[#F4EFEA] dark:hover:bg-[#2F332E] text-[#2C2C2C]/65 dark:text-[#F4EFEA]/65 hover:text-[#7D9878] dark:hover:text-[#A3B69B] border border-[#E6DFD5] dark:border-[#353B33] transition-[background-color,color,transform] duration-150 active:scale-[0.94] overflow-hidden"
            title="Alternar modo claro / oscuro"
            aria-label="Alternar modo claro / oscuro"
        >
            {/* El ícono nuevo entra girando mientras el viejo sale */}
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                    key={theme}
                    initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 90, scale: 0.7 }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className="flex"
                >
                    {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </motion.span>
            </AnimatePresence>
        </button>
    );
}
