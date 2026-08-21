"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";

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
            className="p-2.5 rounded-xl bg-[#7D9878]/10 hover:bg-[#7D9878]/20 dark:bg-[#242723] dark:hover:bg-[#2F332E] text-[#7D9878] dark:text-[#A3B69B] border border-[#7D9878]/20 dark:border-[#353B33] transition-all"
            title="Alternar modo claro / oscuro"
        >
            {theme === "light" ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5 text-[#A3B69B]" />}
        </button>
    );
}
