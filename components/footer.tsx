"use client";

import React, { useState } from "react";
import { InfoModal } from "./infoComponent";
import { useRouter } from "next/navigation";

export default function FooterStrip() {
  const [popupContent, setPopupContent] = useState<null | "terms" | "faq">(null);

  const closePopup = () => setPopupContent(null);
  const router = useRouter();

  return (
    <>
      <footer className="w-full border-t border-zinc-800 bg-zinc-900 text-zinc-400 text-sm px-4 py-4">
        <div className="max-w-6xl mx-auto text-center flex flex-wrap justify-center items-center gap-3">
          <button
            onClick={() => setPopupContent("terms")}
            className="hover:underline hover:text-orange-400 transition"
          >
            Terms & Privacy
          </button>
          <button
            onClick={() => setPopupContent("faq")}
            className="hover:underline hover:text-orange-400 transition"
          >
            FAQ
          </button>
          <button
            onClick={() => router.push('/guide/p2p-file-sharing')}
            className="hover:underline hover:text-orange-400 transition"
          >
            Guide
          </button>
          <span className="mx-0">|</span>
          <span>
            Built with ❤️ by{" "}
            <a
              href="https://x.com/gochistuff"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline hover:text-orange-400 font-medium transition"
            >
              Yash Jangid
            </a>{" "}
            © {new Date().getFullYear()} AirDelivery
          </span>
        </div>
      </footer>

      {/* Popups */}
      {popupContent && ( popupContent === "terms" ?
        <InfoModal popupContent="terms" closePopup={closePopup}/>  
        :
        <InfoModal popupContent="faq" closePopup={closePopup}/>  
    )
        
      }
    </>
  );
}
