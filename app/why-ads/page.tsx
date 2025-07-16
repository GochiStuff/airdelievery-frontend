'use client';
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function WhyAds() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type] = useState("Support");
  const [message] = useState("Supporter");
  const [status, setStatus] = useState<"idle" | "sending" | "thanks" | "error">("idle");

  const url = process.env.NEXT_PUBLIC_SOCKET;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim().length === 0 || name.length > 100) {
      alert("Name must be between 1 and 100 characters.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    setStatus("sending");

    try {
      const res = await fetch(`${url}/api/v1/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, type, message }),
        credentials: "include",
      });

      setStatus(res.ok ? "thanks" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-20 text-neutral-800">
      <section className="space-y-6">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-orange-500 to-yellow-400 text-transparent bg-clip-text">Why Ads?</h1>
        <p className="text-lg text-neutral-600 leading-relaxed">
          Airdelivery is an indie project with no external funding. It costs money to keep the servers running and to bring you a seamless multi-device experience.
        </p>

        <div className="space-y-3">
          <p>We use <strong>minimal, privacy-first ads</strong>—no trackers, no popups.</p>
          <p>Once we recover our costs, we plan to <strong>remove all ads</strong> for everyone.</p>
        </div>

       <div className="pt-10">
  <h2 className="text-2xl font-semibold mb-3">What We're Building</h2>
  <p className="leading-relaxed text-neutral-700">
    Imagine a world where your devices — phone, laptop, desktop, tablet — all speak the same language.
    A truly <strong>open, cross-platform ecosystem</strong> where files, clipboard content, media, and notifications
    flow seamlessly between devices in real-time. No cables. No third-party cloud. No brand lock-in.
  </p>

  <p className="mt-4 leading-relaxed text-neutral-700">
    That’s what we’re building — a decentralized, privacy-respecting system that gives you 
    <strong> complete control over your digital environment</strong>. Think of it as the power of the Apple ecosystem,
    but for <em>everyone</em>, and without the walled garden.
  </p>



  <p className="mt-10 leading-relaxed text-neutral-700">
    Our long-term mission is to build a system that connects all your devices 
    and tools into a single, intelligent, open network. Whether you're working, creating, or just syncing your 
    music from one room to another — Airdelivery will make your digital life feel like magic ✨.
  </p>
  <p className="mt-10 leading-relaxed text-neutral-700">
    Your support can help me hire more awesome developers, keep the servers up and running. Currently working on native apps 
    super powerful syncing system.
  </p>
</div>

        <div className="pt-10">
  <h2 className="text-3xl font-bold mb-4 text-neutral-900">How You Can Support</h2>
  <p className="text-neutral-600 mb-4">
    Love what we’re building? Help us grow this ecosystem by doing any of the following:
  </p>

  <ul className="space-y-3">
    <li className="flex items-start gap-3 p-4 rounded-xl ">
      <span className="text-xl">💬</span>
      <span className="text-neutral-800 font-medium">
        Share <span className="font-bold">Airdelivery</span> with your friends, team, or online communities.
      </span>
    </li>
    <li className="flex items-start gap-3 p-4 ">
      <span className="text-xl">☕</span>
      <span className="text-neutral-800 font-medium">
        <a href="https://www.buymeacoffee.com/yashjangid" className="text-orange-600 underline font-semibold hover:text-orange-700">
          Buy Me a Coffee
        </a>{" "}
        to keep our servers and development alive.
      </span>
    </li>
    <li className="flex items-start gap-3 p-4 ">
      <span className="text-xl">💡</span>
      <span className="text-neutral-800 font-medium">
        <Link href="/#feedback" className="text-orange-600 underline font-semibold hover:text-orange-700">
          Get in touch
        </Link>{" "}
        with feedback — or sign up as a supporter below!
      </span>
    </li>
  </ul>
</div>

<div className="mt-10">
  <h3 className="text-xl font-semibold text-neutral-800 mb-2">Perks for Supporters</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
      <span className="text-green-500 text-xl">✅</span>
      <span className="text-neutral-700 font-medium">Early access to all upcoming features and betas</span>
    </div>
    <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
      <span className="text-pink-500 text-xl">🎁</span>
      <span className="text-neutral-700 font-medium">A free 1-year Pro membership when it launches</span>
    </div>
  </div>
</div>

      </section>

      <section className="mt-16 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 text-white p-10 shadow-xl">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-2">Join as a Supporter</h2>
          <p className="text-neutral-400 text-lg">Support development and stay in the loop with exclusive updates.</p>
        </div>

        {status === "thanks" ? (
          <div className="text-center py-16">
            <p className="text-2xl animate-pulse flex gap-2 justify-center text-green-400 mb-4">
              <CheckCircle2 className="w-7 h-7" /> Thank you!
            </p>
            <p className="text-neutral-300 text-lg">You're officially a supporter 🎉</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="grid gap-6 max-w-2xl mx-auto"
            noValidate
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm text-neutral-300 mb-2">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full p-3 bg-zinc-700/50 border border-white/10 rounded-lg text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm text-neutral-300 mb-2">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full p-3 bg-zinc-700/50 border border-white/10 rounded-lg text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="message" value={message} />

            <div className="text-center">
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 transition-all duration-300 text-white font-semibold px-8 py-3 rounded-xl shadow-lg"
              >
                {status === "sending" ? "Joining..." : "Join Now"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold mb-3">Timeline & What’s Next</h2>
        <ul className="list-disc list-inside space-y-2 text-neutral-700 text-sm">
          <li><strong>June:</strong> v1 launched — P2P File Sharing now live at <Link href="/" className="text-orange-600 underline">airdelivery.site</Link></li>
          <li><strong>Coming Soon:</strong> Clipboard sync, folder sync, device controls, and fully native apps</li>
        </ul>
        <p className="mt-6 text-sm text-neutral-500">
          Thanks for believing in the mission. Let’s build a seamless digital experience — open, efficient, and made for everyone.
        </p>
      </section>
    </main>
  );
}
