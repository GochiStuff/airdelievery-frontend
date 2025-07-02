"use client";
import { CheckCircle2 } from "lucide-react";
import React, { useState } from "react";

const features = [
  "100+ Mbps transfers", "Cross-platform support", "No Middleman",
  "End-to-end encrypted", "p2p file sharing", "No size limits",
  "No sign-up", "One-click Connect Nearby"
];

const testimonials = [
  { name: "mangage", quote: "It really should have just always been this easy. Great work!" },
  { name: "Emotional-Pain", quote: "no logins...that's what I like so much" },
  { name: "Aromatic-Surround", quote: "THIS IS AWESOME. LOVED IT. I have felt stuck since I moved to Android and can't use Airdrop any more so this is a life saver!! Good work!" },
];

const faqs = [
  {
    q: "How does Air Delivery work?",
    a: "It uses peer-to-peer (P2P) technology to connect your browser directly with another."
  },
  {
    q: "Is it secure?",
    a: "Yes. Files transfer directly between devices; no intermediary can access them—not even us."
  },
  {
    q: "Do I need to install anything?",
    a: "No installation. Just open the site in any modern browser, desktop or mobile. but for quick access you can install the PWA via your browser."
  },{
  q: "Is it available on Play Store or App Store?",
  a: "Not yet. You can install the PWA from your browser for quick access. Native apps are coming soon - stay tuned!"
  },  
  {
    q: "Can I send from phone to laptop or across networks?",
    a: "Yes. As long as both devices are online and have the site open, transfers will work."
  },
  {
    q: "Is it free?",
    a: "Yes. Completely free and ad-free. Optional paid features may come later, but P2P will remain free."
  },
  {
    q: "Can I use this without internet?",
    a: "Partial. Initial signaling requires internet. But if both devices are on the same WiFi, transfer generally don't use internet."
  },
];

const InfoSection = () => {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "thanks" | "error">("idle");

const url = process.env.NEXT_PUBLIC_SOCKET;

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Basic client-side validation
  if (name.trim().length === 0 || name.length > 100) {
    alert("Name must be between 1 and 100 characters.");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("Please enter a valid email address.");
    return;
  }

  if (message.trim().length === 0 || message.length > 500) {
    alert("Message must be between 1 and 500 characters.");
    return;
  }

  setStatus("sending");

  try {
    const res = await fetch(`${url}/api/v1/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, type, message }),
      credentials:"include"
    });

    if (res.ok) {
      setStatus("thanks");
    } else if (res.status === 429) {
      setStatus("error");
    } else {
      setStatus("error");
    }
  } catch (error) {
    setStatus("error");
  }
};


  
  return (
    <main  className="bg-black text-neutral-100 font-mono px-6 sm:px-12 lg:px-32">
      {/* Stats */}
      <section aria-labelledby="stats-heading" className="text-center py-24 space-y-12 max-w-6xl mx-auto">
        <h2 id="stats-heading" className="text-4xl md:text-5xl font-semibold tracking-tight">Performance That Speaks</h2>
        <div className="flex flex-wrap justify-center gap-12 text-lg text-neutral-400">
          <div className="text-center">
            <p className="text-4xl font-medium text-white">15,000+</p>
            <p>Files Shared</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-medium text-white">4,000+</p>
            <p>Users in First Month</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-medium text-white">7,000+</p>
            <p>Share Sessions</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section aria-labelledby="how-it-works" className="py-24 border-t border-white/10 text-center space-y-6">
        <h2 id="how-it-works" className="text-3xl md:text-4xl font-semibold tracking-tight">How It Works</h2>
         <ol className="  max-w-2xl mx-auto text-center text-lg  text-neutral-400">
            <li>Open <strong>airdelivery.site</strong> in both devices.</li>
            <li>One device shares a file, the other joins the session.</li>
            <li>Enjoy P2P file sharing,encrypted no server uploads.</li>
          </ol>
      </section>

      {/* Features */}
      <section aria-labelledby="features" className="py-24 border-t border-white/10 text-center max-w-6xl mx-auto">
          <h2 id="features" className="text-3xl md:text-4xl font-semibold mb-6">Key Features</h2>
          <p className="text-neutral-400 max-w-xl mx-auto mb-8">
            Everything you need for effortless P2P file sharing: speed, privacy, and zero hassle.
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-sm">
            {[
              "100+ Mbps transfers",
              "Cross-platform support",
              "No Middleman",
              "End-to-end encrypted",
              "p2p file sharing",
              "No size limits",
              "No sign-up",
              "One-click Connect Nearby"
            ].map((feature, i) => (
              <li key={i} className="bg-white/5 text-white px-4 py-3 rounded-md hover:bg-white/10 hover:text-orange-400 transition-colors duration-150">
                {feature}
              </li>
            ))}
          </ul>
        </section>

      {/* Testimonials */}
      <section aria-labelledby="testimonial" className="py-24 border-t border-white/10 text-center max-w-6xl mx-auto">
        <h2 id="testimonials" className="text-3xl md:text-4xl font-semibold mb-12">What People Say</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <blockquote
              key={i}
              className="bg-white/5 p-6 rounded-xl text-left hover:bg-white/10  hover:text-orange-500  shadow hover:shadow-orange-500/50 transition-colors"
            >
              “{t.quote}”
              <footer className="mt-4 text-sm text-neutral-400">— {t.name}</footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="py-24 border-t border-white/10 text-center">
        <h2  id="faq" className="text-3xl md:text-4xl font-semibold mb-12">FAQ</h2>
        <div className="max-w-3xl mx-auto space-y-10 text-left text-base text-neutral-300">
          {faqs.map((faq, i) => (
            <div key={i}>
              <h3 className="text-lg font-medium text-white mb-2">{faq.q}</h3>
              <p>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Support */}
      <section aria-labelledby="contact" className="py-24 border-t border-white/10 text-center">
        <h2 id="contact" className="text-3xl md:text-4xl font-semibold mb-4">Support Air Delivery</h2>
        <p className="text-neutral-400 max-w-3xl mx-auto">
          No asks. Just share it with someone who needs it. That’s more than enough.
        </p>
      </section>

      {/* Feedback */}
        {/* Feedback */}
      <section
        id="feedback-section"
        aria-labelledby="feedback-heading"
        className="py-24 border-t border-white/10 max-w-3xl mx-auto"
      >
        <h2  aria-labelledby="feedback-heading" className="text-3xl md:text-4xl font-semibold text-center mb-6">Get in Touch</h2>
        <p className="text-center text-neutral-400 mb-12">
          Questions? Email us at{" "}
          <a
            href="mailto:gsdevelopment4@gmail.com"
            className="text-white underline underline-offset-4 hover:text-orange-400 transition"
          >
            gsdevelopment4@gmail.com
           </a>
            {" or DM me"}
        </p>

        {status === "thanks" ? (
          <div className="text-center flex flex-col gap-5 items-center  text-xl text-green-400 animate-pulse">
            <CheckCircle2 className="w-12 h-12"/>
            Thanks! We’ve received your feedback.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            aria-describedby="feedback-instructions"
            noValidate
          >
           
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fb-name" className="sr-only">Your Name</label>
                <input
                  id="fb-name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="Your Name"
                  className="w-full p-4 bg-white/5 rounded-lg text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <div>
                <label htmlFor="fb-email" className="sr-only">Your Email</label>
                <input
                  id="fb-email"
                  name="email"
                  type="email"
                  value={email}
                  required
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Your Email"
                  className="w-full p-4 bg-white/5 rounded-lg text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
            </div>
            <div>
              <label htmlFor="fb-type" className="sr-only">Type (Bug / Idea / Feedback)</label>
              <input
                id="fb-type"
                name="type"
                type="text"
                value={type}
                onChange={e => setType(e.target.value)}
                required
                placeholder="Type (Bug / Suggestion / Feedback)"
                className="w-full p-4 bg-white/5 rounded-lg text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
            <div>
              <label htmlFor="fb-message" className="sr-only">Your Message</label>
              <textarea
                id="fb-message"
                name="message"
                rows={5}
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                placeholder="Your Message"
                className="w-full p-4 bg-white/5 rounded-lg text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full hover:bg-orange-500 md:w-auto px-6 py-3 bg-white text-black rounded-lg  transition-colors"
            >
              {status === "sending" ? "Sending…" : "Send Feedback"}
            </button>
            {status === "error" && (
              <p className="text-center text-red-400 mt-2">
                Oops! Something went wrong.
              </p>
            )}
          </form>
        )}
      </section>
 
    </main>
  );
};

export default InfoSection;
