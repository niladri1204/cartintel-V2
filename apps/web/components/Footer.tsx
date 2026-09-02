import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#070507]/90 text-[#817580] border-t border-white/10 py-12 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5 text-[#F4EEF3] md:flex-1 md:justify-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cartintel-logo.png"
            alt="CartIntel Logo"
            className="h-5 w-auto object-contain"
            width={20}
            height={20}
          />
          <span className="font-semibold tracking-tight">CartIntel</span>
        </div>
        <p className="text-sm text-center md:shrink-0 text-[#817580] font-light">
          &copy; {new Date().getFullYear()} CartIntel. All rights reserved.
        </p>
        <div className="flex flex-wrap gap-6 text-sm justify-center md:flex-1 md:justify-end">
          <Link href="#" className="hover:text-[#F4EEF3] transition-colors duration-200">
            GitHub
          </Link>
          <Link href="#" className="hover:text-[#F4EEF3] transition-colors duration-200">
            Documentation
          </Link>
          <Link href="#" className="hover:text-[#F4EEF3] transition-colors duration-200">
            Privacy
          </Link>
          <Link href="#" className="hover:text-[#F4EEF3] transition-colors duration-200">
            Terms
          </Link>
          <Link href="#" className="hover:text-[#F4EEF3] transition-colors duration-200">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
