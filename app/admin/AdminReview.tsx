"use client";

import { useState } from "react";

export default function AdminReview({ projectId }: { projectId: string }) {
  const [note, setNote] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function review(action: string) {
    setWorking(action);
    setError("");
    const response = await fetch(`/api/admin/projects/${projectId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Review action failed.");
      setWorking(null);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="admin-actions">
      <label>
        <span>Review note</span>
        <textarea
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Required when requesting changes or rejecting."
        />
      </label>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div>
        <button onClick={() => review("approved")} disabled={working !== null}>Approve</button>
        <button onClick={() => review("changes_requested")} disabled={working !== null}>Request changes</button>
        <button onClick={() => review("rejected")} disabled={working !== null}>Reject</button>
        <button onClick={() => review("archived")} disabled={working !== null}>Archive</button>
      </div>
    </div>
  );
}
