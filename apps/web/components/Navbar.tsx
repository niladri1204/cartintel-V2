"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChromeIcon } from "./icons/ChromeIcon";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.location.hash) {
      window.history.pushState(null, "", window.location.pathname);
    }
  };

  return (
    <header className="fixed left-0 right-0 top-6 z-50 flex justify-center px-6 transition-all duration-300">
      <nav
        className={`flex w-full max-w-5xl items-center justify-between rounded-2xl border px-6 sm:px-8 py-3.5 transition-all duration-300 backdrop-blur-2xl ${
          scrolled
            ? "bg-[#0D080D]/95 border-[#C982A7]/25 shadow-2xl shadow-black/80"
            : "bg-[#0D080D]/80 border-white/10 shadow-xl shadow-black/50"
        }`}
      >
        {/* Brand Logo - Fixed & Non-clickable */}
        <div
          className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-[#F4EEF3] select-none cursor-default"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cartintel-logo.png"
            alt="CartIntel Logo"
            className="h-7 w-auto object-contain"
            width={28}
            height={28}
          />
          <span>CartIntel</span>
        </div>

        {/* Section Navigation Links */}
        <div className="hidden gap-8 text-[#B9AEB8] md:flex font-medium text-sm">
          <a
            href="#how-it-works"
            className="transition-colors duration-200 hover:text-[#F4EEF3]"
          >
            How It Works
          </a>

          <a
            href="#features"
            className="transition-colors duration-200 hover:text-[#F4EEF3]"
          >
            Features
          </a>

          <a
            href="#demo"
            className="transition-colors duration-200 hover:text-[#F4EEF3]"
          >
            Demo
          </a>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-[#F4EEF3] transition-all duration-200 hover:bg-white/[0.08] hover:border-white/20"
          >
            GitHub
          </a>

          <a
            href="#install"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5A254D] to-[#8A3C70] border border-[#C982A7]/30 px-5 py-2 text-sm font-medium text-[#F4EEF3] shadow-lg shadow-[#8A3C70]/20 transition-all duration-200 hover:from-[#6c2c5c] hover:to-[#9c4580] hover:scale-[1.02] active:scale-[0.98]"
          >
            <ChromeIcon className="h-4 w-4 text-[#C982A7]" />
            <span>Add to Chrome</span>
          </a>
        </div>
      </nav>
    </header>
  );
}