"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/auth";

export default function Navbar() {
  const pathname = usePathname();
  const isActive = (path) => pathname === path ? "text-white font-semibold" : "text-gray-300";

  return (
    <nav className="bg-gray-800 text-white px-6 py-3 flex justify-between items-center shadow-md">
      <div className="text-xl font-bold text-white">
        <Link href="/dashboard">Tweater</Link>
      </div>
      <div className="space-x-6 text-sm">
        <Link href="/dashboard" className={isActive("/dashboard")}>
          Dashboard
        </Link>
        <Link href="/bookmarks" className={isActive("/bookmarks")}>
          Bookmarks
        </Link>
        <Link href="/profile" className={isActive("/profile")}>
          Profile
        </Link>
        <Link href="/explore" className={isActive("/explore")}>
          Explore
        </Link>
        <Link href="/notifications" className={isActive("/notifications")}>
          Notifications
        </Link>
        <button
          onClick={() => signOut(auth)}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}