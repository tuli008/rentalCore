"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-blue-600 border-b border-blue-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-12 flex items-center">
          <div className="flex items-center gap-6 overflow-x-auto w-full">
            <Link
              href="/"
              className={`inline-flex items-center px-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive("/")
                  ? "border-white text-white"
                  : "border-transparent text-blue-100 hover:text-white hover:border-blue-300"
              }`}
            >
              Inventory
            </Link>
            <Link
              href="/quotes"
              className={`inline-flex items-center px-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive("/quotes")
                  ? "border-white text-white"
                  : "border-transparent text-blue-100 hover:text-white hover:border-blue-300"
              }`}
            >
              Quotes
            </Link>
            <Link
              href="/crew"
              className={`inline-flex items-center px-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive("/crew")
                  ? "border-white text-white"
                  : "border-transparent text-blue-100 hover:text-white hover:border-blue-300"
              }`}
            >
              Crew
            </Link>
            <Link
              href="/events"
              className={`inline-flex items-center px-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive("/events") || pathname?.startsWith("/events/")
                  ? "border-white text-white"
                  : "border-transparent text-blue-100 hover:text-white hover:border-blue-300"
              }`}
            >
              Events
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
