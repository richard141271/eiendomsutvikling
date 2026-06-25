"use client";

import type { ReportJobClientState } from "./report-job-client";

type ReportStatusLike = Pick<ReportJobClientState, "phase" | "message" | "progress" | "state">;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderStatusMarkup(title: string, state: ReportStatusLike) {
  const progress = Math.max(0, Math.min(100, Math.round(state.progress || 0)));
  const tone = state.state === "error" ? "#b91c1c" : state.state === "success" ? "#166534" : "#1d4ed8";
  const bg = state.state === "error" ? "#fef2f2" : state.state === "success" ? "#f0fdf4" : "#eff6ff";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; padding: 32px; background: #f8fafc; color: #0f172a;">
      <div style="max-width: 720px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 18px; padding: 28px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
        <div style="font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; margin-bottom: 10px;">Rapportgenerering</div>
        <h1 style="font-size: 32px; line-height: 1.1; margin: 0 0 18px;">${escapeHtml(title)}</h1>
        <div style="display: inline-block; padding: 8px 12px; border-radius: 999px; background: ${bg}; color: ${tone}; font-weight: 600; margin-bottom: 16px;">
          ${escapeHtml(state.phase)}
        </div>
        <p style="font-size: 18px; line-height: 1.5; margin: 0 0 24px; color: #334155;">${escapeHtml(state.message)}</p>
        <div style="height: 12px; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
          <div style="height: 100%; width: ${progress}%; background: ${tone}; transition: width 180ms ease;"></div>
        </div>
        <div style="margin-top: 12px; font-size: 14px; color: #64748b;">${progress}% ferdig</div>
      </div>
    </div>
  `;
}

export function openReportStatusWindow(title: string, initialState: ReportStatusLike) {
  if (typeof window === "undefined") {
    return null;
  }

  const popup = window.open("", "_blank");
  if (!popup) {
    return null;
  }

  popup.document.open();
  popup.document.write(`<!doctype html><html lang="no"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(title)}</title></head><body style="margin:0">${renderStatusMarkup(title, initialState)}</body></html>`);
  popup.document.close();
  return popup;
}

export function updateReportStatusWindow(popup: Window | null, title: string, state: ReportStatusLike) {
  if (!popup || popup.closed) {
    return;
  }

  popup.document.title = `${title} - ${state.phase}`;
  if (popup.document.body) {
    popup.document.body.innerHTML = renderStatusMarkup(title, state);
  }
}

export function finalizeReportStatusWindow(popup: Window | null, url: string) {
  if (popup && !popup.closed) {
    popup.location.replace(url);
    return;
  }

  if (typeof window !== "undefined") {
    window.open(url, "_blank");
  }
}
