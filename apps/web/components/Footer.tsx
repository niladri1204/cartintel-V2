import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-black text-gray-500 border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2 text-white md:flex-1 md:justify-start">
          <ShoppingBag className="h-5 w-5 text-indigo-500" />
          <span className="font-semibold tracking-tight">CartIntel</span>
        </div>
        <p className="text-sm text-center md:shrink-0">
          &copy; {new Date().getFullYear()} CartIntel. All rights reserved.
        </p>
        <div className="flex flex-wrap gap-6 text-sm justify-center md:flex-1 md:justify-end">
          <Link href="#" className="hover:text-white transition-colors">
            GitHub
          </Link>
          <Link href="#" className="hover:text-white transition-colors">
            Documentation
          </Link>
          <Link href="#" className="hover:text-white transition-colors">
            Privacy
          </Link>
          <Link href="#" className="hover:text-white transition-colors">
            Terms
          </Link>
          <Link href="#" className="hover:text-white transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
