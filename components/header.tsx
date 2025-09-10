"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Header() {
  const isLoggedIn = false;

  return (
    <>
      <header className="flex items-center justify-between px-4 md:px-10 backdrop-blur-md border-b bg-white shadow-lg h-16">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Image src="/icons/logo.png" alt="Logo" width={40} height={40} />
          <Link
            href="/"
            className="text-xl md:text-2xl font-semibold tracking-tighter text-zinc-900"
          >
            AIR DELIVERY
          </Link>
        </div>

        {/* Desktop Nav */}
{/* <nav className="hidden md:flex items-center gap-2 text-sm md:text-base font-medium text-zinc-700">
  <span className="opacity-90 animate-spin-slow">⚡</span>
  <Link
    href="https://cobbic.com"
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2 text-orange-600 hover:text-orange-800 transition-colors duration-200 group"
  >
    <span className="font-semibold underline underline-offset-4 decoration-wavy">
      Join the awesome community of Cobbic
    </span>
  </Link>
</nav> */}


        {/* Mobile Sidebar */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <button aria-label="Open Menu">
                <Menu size={28} className="text-zinc-800" />
              </button>
            </SheetTrigger>

            <SheetContent side="right" className="w-64 p-6">
              <SheetHeader>
                <div className="flex items-center gap-2 mb-6">
                  <Image
                    src="/icons/logo.png"
                    alt="Logo"
                    width={32}
                    height={32}
                  />
                  <SheetTitle className="text-lg font-semibold tracking-tight text-zinc-900">
                    AIR DELIVERY
                  </SheetTitle>
                </div>
              </SheetHeader>
{/* 
              <nav className="flex flex-col gap-4 text-zinc-700 text-sm font-medium">
  <Link
    href="https://cobbic.com"
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2 hover:text-blue-700 transition-colors duration-200 group"
  >
    <span className="text-blue-600 font-semibold group-hover:underline underline-offset-4 decoration-wavy">
      Cobbic.com
    </span>
    <span className="opacity-70 group-hover:translate-x-1 transition-transform duration-200">🚀</span>
  </Link>
</nav> */}

            </SheetContent>
          </Sheet>
        </div>

        {/* Banner */}
      </header>
    </>
  );
}
