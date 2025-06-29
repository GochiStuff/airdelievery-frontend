import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function Header() {
    return(
        <header className="flex items-center justify-between px-4 md:px-10 backdrop-blur-md border-b bg-white shadow-lg">

            <h1 className="flex items-center ">
                <Image src='/icons/logo.png' alt="Logo" width={64} height={64}/>
                <Link href="/" className="text-3xl font-semibold tracking-tighter text-zinc-900 ">
                    AIR DELIVERY 
                </Link>
            </h1>

           

            

           
    </header>   
    );
}