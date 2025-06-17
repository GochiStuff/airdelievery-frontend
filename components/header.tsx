import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function Header() {
    return(
        <header className="flex items-center justify-between  backdrop-blur-md border-b bg-white shadow-lg">

            <div className="flex items-center space-x-1 px-2 gap-0  md:px-6 ">
                <Image src='/icons/logo.png' alt="Logo" width={64} height={64}/>
                <Link href="/" className="text-3xl font-semibold tracking-tighter text-zinc-900 ">
                    AIR DELIVERY 
                </Link>
            </div>

           
        </header>   
    );
}