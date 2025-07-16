"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function Header() {
  const isLoggedIn = false; 

  return (
    <>
    
    <header className="flex items-center justify-between px-4 md:px-10 backdrop-blur-md border-b bg-white shadow-lg h-16">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <Image src="/icons/logo.png" alt="Logo" width={40} height={40} />
        <Link href="/" className="text-xl md:text-2xl font-semibold tracking-tighter text-zinc-900">
          AIR DELIVERY
        </Link>
      </div>


      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center gap-6 text-sm md:text-base font-medium text-zinc-700">
        <Link href="/why-ads" className="hover:text-black transition">Why Ads & Support the mission.</Link>
         {/* <Link
          href="/support"
          className="hover:text-zinc-100 text-zinc-50 px-4 py-2 rounded-full hover:bg-zinc-950 transition bg-zinc-800"
        >
          Support the mission
        </Link> */}
      </nav>


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
                <Image src="/icons/logo.png" alt="Logo" width={32} height={32} />
                   <SheetTitle className="text-lg font-semibold tracking-tight text-zinc-900">

       
                  AIR DELIVERY
                   </SheetTitle>
              </div>
            </SheetHeader>

            <nav className="flex flex-col gap-4 text-zinc-800 text-sm font-medium">
              <Link href="/why-ads" className="hover:text-black transition ">Why Ads</Link>
               {/* <Link
          href="/support"
          className="hover:text-zinc-100 text-zinc-50 px-4 py-2 rounded-full hover:bg-zinc-950 transition bg-zinc-800"
        >
          Support the mission
        </Link> */}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

            {/* Banner */}
    </header>
    </>
  );
}
