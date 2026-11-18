"use client";

import { useState } from "react";
import { Check, Star } from "lucide-react";
import { feedbackRequestSchema } from "@/lib/feedback-schema";

/*
 * Feedback form (PRD Section 6.7): name (optional), 1-5 rating with tap
 * targets at least 44 px, what they ordered (optional), message, optional
 * contact. Client-side validation uses the same Zod schema as the server;
 * server errors are announced with aria-live, the message is kept on
 * failure, and success shows a short thank-you and clears the form. A
 * hidden honeypot field catches bots (PRD Section 6.7 spam protection).
 */
export function FeedbackForm() {
  const [phase, setPhase] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [rating, setRating] = useState(0);
  const [form, setForm] = useState({
    name: "",
    orderedItem: "",
    message: "",
    contact: "",
    website: "",
  });
  const [clientError, setClientError] = useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      name: form.name.trim() === "" ? undefined : form.name.trim(),
      rating,
      orderedItem: form.orderedItem.trim() === "" ? undefined : form.orderedItem.trim(),
      message: form.message.trim(),
      contact: form.contact.trim() === "" ? undefined : form.contact.trim(),
      website: form.website === "" ? undefined : form.website,
    };
    const check = feedbackRequestSchema.safeParse(payload);
    if (!check.success) {
      const issue = check.error.issues[0];
      setClientError(issue?.message ?? "Please check the form and try again.");
      setPhase("error");
      return;
    }
    setClientError(null);
    setPhase("submitting");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setPhase("success");
        setRating(0);
        setForm({ name: "", orderedItem: "", message: "", contact: "", website: "" });
      } else {
        setPhase("error");
      }
    } catch {
      setPhase("error");
    }
  }

  const ratingLabels = ["Not great", "Could be better", "Good", "Great", "Loved it"];

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex max-w-xl flex-col gap-5" noValidate>
      {/* Honeypot: hidden from humans, tempting for bots */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="fb-website">Website</label>
        <input
          id="fb-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => update("website", e.target.value)}
        />
      </div>

      <fieldset>
        <legend className="text-sm text-foreground">Your rating</legend>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`${value} star${value === 1 ? "" : "s"} - ${ratingLabels[value - 1]}`}
              aria-pressed={rating === value}
              className="flex h-11 w-11 items-center justify-center rounded-card transition-colors hover:bg-surface"
            >
              <Star
                className={`h-6 w-6 ${rating >= value ? "fill-accent text-accent" : "text-muted"}`}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-foreground">Name (optional)</span>
          <input
            type="text"
            value={form.name}
            maxLength={60}
            onChange={(e) => update("name", e.target.value)}
            className="rounded-card border border-muted/30 bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-accent"
            placeholder="What should we call you?"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-foreground">What did you order? (optional)</span>
          <input
            type="text"
            value={form.orderedItem}
            maxLength={80}
            onChange={(e) => update("orderedItem", e.target.value)}
            className="rounded-card border border-muted/30 bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-accent"
            placeholder="Flat white, croissant..."
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-foreground">Message</span>
          <textarea
            value={form.message}
            maxLength={500}
            rows={4}
            required
            onChange={(e) => update("message", e.target.value)}
            className="resize-none rounded-card border border-muted/30 bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-accent"
            placeholder="Tell us what you thought"
          />
          <span className="text-xs text-muted">{form.message.length}/500</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-foreground">Contact (optional)</span>
          <input
            type="text"
            value={form.contact}
            maxLength={120}
            onChange={(e) => update("contact", e.target.value)}
            className="rounded-card border border-muted/30 bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-accent"
            placeholder="Email or phone, if you want a reply"
          />
        </label>
      </div>

      <div aria-live="polite" className="min-h-6 text-sm">
        {phase === "error" && (
          <p className="text-danger">
            {clientError ??
              "That did not go through. Your message is kept - try again in a moment."}
          </p>
        )}
        {phase === "success" && (
          <p className="flex items-center gap-2 text-success">
            <Check className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Thank you - it means a lot. We read every note.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={phase === "submitting"}
        className="w-fit rounded-card bg-accent px-6 py-3 text-sm text-surface transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {phase === "submitting" ? "Sending..." : "Send feedback"}
      </button>

      <p className="text-xs text-muted">
        We store only what is needed to read your feedback. Nothing is shared.
      </p>
    </form>
  );
}
