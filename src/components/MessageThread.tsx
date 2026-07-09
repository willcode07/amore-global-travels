"use client";

import { FormEvent, useState } from "react";
import { addMessage } from "@/lib/requests";
import { Message, MessageSender } from "@/lib/types";

type MessageThreadProps = {
  messages: Message[];
  sender: MessageSender;
  senderName: string;
  requestId: string;
  onSent: (messages: Message[]) => void;
};

export function MessageThread({
  messages,
  sender,
  senderName,
  requestId,
  onSent,
}: MessageThreadProps) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;

    setSending(true);
    setError("");

    try {
      const updated = addMessage(requestId, { sender, senderName, body });
      onSent(updated.messages);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-3xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <h3 className="font-display text-xl text-ink">Trip messages</h3>
        <p className="mt-1 text-sm text-muted">
          Keep trip decisions here. Email alerts notify the other side when a
          new message arrives.
        </p>
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted">No messages yet.</p>
        )}
        {messages.map((message) => {
          const mine = message.sender === sender;
          return (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                mine
                  ? "ml-auto bg-ink text-cream"
                  : "bg-cream text-ink"
              }`}
            >
              <div className={`mb-1 text-xs ${mine ? "text-cream/70" : "text-muted"}`}>
                {message.senderName} ·{" "}
                {new Date(message.createdAt).toLocaleString()}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-line p-4">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          placeholder={
            sender === "traveler"
              ? "Ask a question or share more preferences..."
              : "Share options notes, questions, or next steps..."
          }
          className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none ring-gold focus:ring-2"
        />
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="mt-3 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-[#e08c00] disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send message"}
        </button>
      </form>
    </div>
  );
}
