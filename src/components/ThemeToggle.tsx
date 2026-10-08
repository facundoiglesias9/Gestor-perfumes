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
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-[#242723] hover:bg-[#F4EFEA] dark:hover:bg-[#2F332E] text-[#2C2C2C]/65 dark:text-[#F4EFEA]/65 hover:text-[#7D9878] dark:hover:text-[#A3B69B] border border-[#E6DFD5] dark:border-[#353B33] transition-colors"
            title="Alternar modo claro / oscuro"
            aria-label="Alternar modo claro / oscuro"
        >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
    );
}
