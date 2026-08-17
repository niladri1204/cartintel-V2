"use client";

import { useState, useEffect } from "react";

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header className="fixed left-0 right-0 top-8 z-50 flex justify-center px-6 transition-all duration-300">
            <nav className={`flex w-full max-w-5xl items-center justify-between rounded-2xl border px-8 py-3 transition-all duration-300 backdrop-blur-2xl ${
                scrolled 
                    ? "bg-white/95 shadow-xl border-gray-200/80" 
                    : "bg-white/85 shadow-md border-gray-200/50"
            }`}>

                <div className="text-2xl font-bold tracking-tight text-gray-900">
                    CartIntel
                </div>

                <div className="hidden gap-8 text-gray-600 md:flex font-medium text-sm">
                    <a href="#features" className="transition hover:text-black">
                        Features
                    </a>

                    <a href="#how-it-works" className="transition hover:text-black">
                        How it Works
                    </a>

                    <a href="#" className="transition hover:text-black">
                        Roadmap
                    </a>

                    <a href="#" className="transition hover:text-black">
                        Docs
                    </a>
                </div>

                <div className="flex items-center gap-4">
                    <button className="rounded-xl border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100">
                        GitHub
                    </button>

                    <button className="rounded-xl bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
                        Install
                    </button>
                </div>

            </nav>
        </header>
    );
}