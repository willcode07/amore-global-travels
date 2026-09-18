"use client";

import { FormEvent, useState } from "react";
import { createId } from "@/lib/ids";
import { isApiBackend } from "@/lib/data/mode";
import { addMessage } from "@/lib/requests";
import { uploadTripFile } from "@/lib/uploads";
import { Message, MessageAttachment, MessageSender } from "@/lib/types";

type MessageThreadProps = {
  messages: Message[];
  sender: MessageSender;
  senderName: string;
  requestId: string;
  onSent: (messages: Message[]) => void;
};

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_FILE_BYTES = 1.5 * 1024 * 1024;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read that file."));
    reader.readAsDataURL(file);
  });
}

async function toAttachment(file: File, requestId: string): Promise<MessageAttachment> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Attach a PDF or image (JPG, PNG, WebP, or GIF).");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Keep each attachment under 1.5 MB.");
  }
  if (isApiBackend()) {
    const stored = await uploadTripFile({ file, tripId: requestId, kind: "message" });
    return {
      id: stored.attachmentId || createId("att"),
      name: file.name,
      url: stored.url,
      mimeType: file.type,
    };
  }
  return {
    id: createId("att"),
    name: file.name,
    url: await readFileAsDataUrl(file),
    mimeType: file.type,
  };
}

function AttachmentPreview({
  attachment,
  inverted,
}: {
  attachment: MessageAttachment;
  inverted?: boolean;
}) {
  const image = attachment.mimeType.startsWith("image/");
  if (image) {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-2 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-h-40 rounded-xl object-cover"
        />
      </a>
    );
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      download={attachment.name}
      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold underline-offset-2 hover:underline ${
        inverted ? "bg-white/15 text-on-brand" : "bg-surface text-gold-deep"
      }`}
    >
      {attachment.name || "Download file"}
    </a>
  );
}

export function MessageThread({
  messages,
  sender,
  senderName,
  requestId,
  onSent,
}: MessageThreadProps) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError("");
    try {
      const next = await Promise.all(Array.from(fileList).map((file) => toAttachment(file, requestId)));
      setAttachments((current) => [...current, ...next].slice(0, 3));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to attach that file.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() && attachments.length === 0) return;

    setSending(true);
    setError("");

    try {
      const updated = await addMessage(requestId, {
        sender,
        senderName,
        body,
        attachments,
      });
      onSent(updated.messages);
      setBody("");
      setAttachments([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-3xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <h3 className="font-display text-xl text-ink">Messages</h3>
        <p className="mt-1 text-sm text-muted">
          {sender === "traveler"
            ? "Talk with your agent about this trip. You can attach a PDF or image."
            : "Replies email the traveler. Drop a flyer or screenshot here if you need to."}
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
                  ? "ml-auto bg-brand text-on-brand"
                  : "bg-cream text-ink"
              }`}
            >
              <div className={`mb-1 text-xs ${mine ? "text-on-brand/70" : "text-muted"}`}>
                {message.senderName} ·{" "}
                {new Date(message.createdAt).toLocaleString()}
              </div>
              {message.body ? (
                <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>
              ) : null}
              {message.attachments?.map((attachment) => (
                <AttachmentPreview
                  key={attachment.id}
                  attachment={attachment}
                  inverted={mine}
                />
              ))}
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
              ? "Ask a question or add a detail…"
              : "Share notes, questions, a flyer, or next steps…"
          }
          className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm outline-none ring-gold focus:ring-2"
        />
        {attachments.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="inline-flex items-center gap-2 rounded-full bg-cream px-3 py-1 text-xs font-semibold text-ink"
              >
                {attachment.name}
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((current) =>
                      current.filter((item) => item.id !== attachment.id),
                    )
                  }
                  className="text-muted"
                  aria-label={`Remove ${attachment.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink">
            Attach file
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              multiple
              onChange={(event) => {
                void handleFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          <button
            type="submit"
            disabled={sending || (!body.trim() && attachments.length === 0)}
            className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-on-gold transition hover:brightness-95 disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send message"}
          </button>
        </div>
      </form>
    </div>
  );
}
