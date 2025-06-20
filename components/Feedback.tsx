"use client";

import { useState, useEffect, useRef } from "react";
import { setTimeout } from "timers";

export default function FeedbackPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [type, setType] = useState("feedback");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for focus management
  const firstInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      firstInputRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Click outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!message.trim()) {
      setError("Please enter a message.");
      return;
    }

    setSubmitting(true);
    setSuccess(false);

    try {
      // const res = await fetch("/api/feedback", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email: email.trim(), type, message: message.trim() }),
      // });
      // if (!res.ok) {
      //   throw new Error(`Server responded with ${res.status}`);
      // }
      setSuccess(true);
      
      setEmail("");
      setType("feedback");
      setMessage("");

      setTimeout( () => setOpen(false) , 1500)
    } catch (err) {
      console.error("Feedback submission error:", err);
      setError("Failed to send feedback. Please try again.");
    } finally {
      setSubmitting(false);
      // Return focus to message textarea if error, otherwise you could close or keep open
      if (error) {
        // keep focus on textarea
      }
    }
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => {
          setOpen(true);
          setSuccess(false);
          setError(null);
        }}
        className=" hover:text-zinc-400 font-semibold  transition-colors"
      >
        Send Feedback
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={handleOverlayClick}
          aria-labelledby="feedback-dialog-title"
          role="dialog"
          aria-modal="true"
        >
          <div
            ref={modalRef}
            className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-md w-full mx-4 p-6 rounded-lg shadow-xl transform transition-transform duration-200 scale-100"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close feedback form"
              className="absolute top-3 right-3 text-zinc-500 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded"
            >
              ✕
            </button>

            <h2 id="feedback-dialog-title" className="text-2xl font-semibold mb-4">
              Send Feedback
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email (optional) */}
              <div>
                <label htmlFor="feedback-email" className="block text-sm font-medium">
                  Email (optional)
                </label>
                <input
                  id="feedback-email"
                  ref={firstInputRef}
                  type="email"
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 p-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={submitting}
                />
              </div>

              {/* Type selector */}
              <div>
                <label htmlFor="feedback-type" className="block text-sm font-medium">
                  Type
                </label>
                <select
                  id="feedback-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={submitting}
                >
                  <option value="feedback">Feedback</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                </select>
              </div>

              {/* Message textarea */}
              <div>
                <label htmlFor="feedback-message" className="block text-sm font-medium">
                  Message
                </label>
                <textarea
                  id="feedback-message"
                  rows={4}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 p-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Your message here..."
                  disabled={submitting}
                  required
                />
              </div>

              {/* Error message */}
              {error && (
                <p className="text-sm text-red-600">
                  {error}
                </p>
              )}

              {/* Success message */}
              {success && (
                <p className="text-sm text-green-600">
                  Thank you for your feedback!
                </p>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                >
                  {submitting ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
