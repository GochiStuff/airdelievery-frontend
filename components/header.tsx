import React from "react";

export default function Header() {
    return(
        <header className="flex items-center justify-between p-2 backdrop-blur-md border-b bg-white shadow-lg">

            <div className="flex items-center space-x-4 px-4 ">
                <h1 className="text-3xl  font-semibold tracking-tighter  text-zinc-900">
                    AIR DELIVERY
                </h1>
            </div>

           
        </header>   
    );
}