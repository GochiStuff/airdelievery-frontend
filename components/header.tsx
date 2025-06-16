import Link from "next/link";
import React from "react";

export default function Header() {
    return(
        <header className="flex items-center justify-between p-2 backdrop-blur-md border-b bg-white shadow-lg">

            <div className="flex items-center space-x-4 px-2 md:px-6 ">
                <Link href="/" className="text-3xl font-semibold tracking-tighter text-zinc-900 ">
                    AIR DELIVERY
                </Link>
            </div>

           
        </header>   
    );
}