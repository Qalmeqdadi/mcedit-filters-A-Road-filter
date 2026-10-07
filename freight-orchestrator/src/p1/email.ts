// 1.1.1 / 1.1.2: read an inbound email (raw RFC 5322 source or plain text) into headers, a text body
// and attachments. Written without dependencies so it runs on the server and in the browser.
// Handles multipart MIME, quoted-printable and base64 text parts, and encoded-word headers.

export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  /** Decoded text for text-like attachments (csv, txt, html); PDFs and images go to document extraction (1.5.3). */
  text?: string;
}

export interface ParsedEmail {
  from: string;
  fromName: string;
  to: string[];
  subject: string;
  date: Date | null;
  messageId: string | null;
  inReplyTo: string | null;
  text: string;
  attachments: Attachment[];
}

type Headers = Record<string, string>;

function splitHead(raw: string): { headers: Headers; body: string } {
  const norm = raw.replace(/\r\n/g, "\n");
  const cut = norm.indexOf("\n\n");
  const head = cut >= 0 ? norm.slice(0, cut) : norm;
  const body = cut >= 0 ? norm.slice(cut + 2) : "";
  const headers: Headers = {};
  let last = "";
  for (const line of head.split("\n")) {
    if (/^[ \t]/.test(line) && last) headers[last] += " " + line.trim();
    else {
      const m = line.match(/^([!-9;-~]+):\s*(.*)$/);
      if (m && m[1] && m[2] !== undefined) {
        last = m[1].toLowerCase();
        headers[last] = m[2];
      }
    }
  }
  return { headers, body };
}

const looksLikeRaw = (s: string) => /^(from|to|subject|date|message-id|mime-version|received|return-path|content-type):/im.test(s.slice(0, 2000)) && /\r?\n\r?\n/.test(s);

function decodeQP(s: string): string {
  const bytes = s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
  return utf8(bytes);
}

function decodeB64(s: string): string {
  const clean = s.replace(/\s+/g, "");
  try {
    return utf8(atob(clean));
  } catch {
    return "";
  }
}

/** Interprets a binary string (one char per byte) as UTF-8. */
function utf8(binary: string): string {
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0) & 0xff);
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/** RFC 2047 encoded words in headers, e.g. =?UTF-8?Q?Sara_Haddad?= */
export function decodeWords(s: string): string {
  return s.replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g, (_, _cs: string, enc: string, txt: string) =>
    enc.toUpperCase() === "B" ? decodeB64(txt) : decodeQP(txt.replace(/_/g, " ")),
  );
}

function param(h: string | undefined, name: string): string | undefined {
  if (!h) return undefined;
  const m = h.match(new RegExp(`${name}\\*?=\\s*"?([^";]+)"?`, "i"));
  return m?.[1] ? decodeWords(m[1].replace(/^utf-8''/i, "")) : undefined;
}

function decodeBody(body: string, enc: string | undefined): string {
  const e = (enc ?? "").toLowerCase();
  if (e === "quoted-printable") return decodeQP(body);
  if (e === "base64") return decodeB64(body);
  return body;
}

const stripHtml = (h: string) =>
  h.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|li)>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"');

interface Part { headers: Headers; body: string }

function parts(headers: Headers, body: string): Part[] {
  const ct = headers["content-type"] ?? "text/plain";
  const boundary = param(ct, "boundary");
  if (!/^multipart\//i.test(ct) || !boundary) return [{ headers, body }];
  const out: Part[] = [];
  for (const chunk of body.split(`--${boundary}`).slice(1)) {
    if (chunk.startsWith("--")) break;
    const { headers: h, body: b } = splitHead(chunk.replace(/^\n/, ""));
    out.push(...parts(h, b));
  }
  return out;
}

function address(s: string): { email: string; name: string } {
  const d = decodeWords(s);
  const m = d.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
  if (m?.[2]) return { email: m[2].trim().toLowerCase(), name: (m[1] ?? "").trim() };
  return { email: d.trim().toLowerCase(), name: "" };
}

export function parseEmail(raw: string): ParsedEmail {
  if (!looksLikeRaw(raw)) {
    return { from: "", fromName: "", to: [], subject: "", date: null, messageId: null, inReplyTo: null, text: raw.trim(), attachments: [] };
  }
  const { headers, body } = splitHead(raw);
  let text = "";
  let html = "";
  const attachments: Attachment[] = [];
  for (const p of parts(headers, body)) {
    const ct = (p.headers["content-type"] ?? "text/plain").toLowerCase();
    const disp = p.headers["content-disposition"] ?? "";
    const filename = param(disp, "filename") ?? param(p.headers["content-type"], "name");
    const decoded = decodeBody(p.body, p.headers["content-transfer-encoding"]);
    if (filename || /attachment/i.test(disp)) {
      const textLike = /^text\/|csv|json|xml/.test(ct);
      attachments.push({ filename: filename ?? "attachment", contentType: ct.split(";")[0]!.trim(), size: decoded.length, text: textLike ? decoded : undefined });
    } else if (ct.startsWith("text/plain") && !text) text = decoded;
    else if (ct.startsWith("text/html") && !html) html = decoded;
  }
  if (!text && html) text = stripHtml(html);
  const from = address(headers["from"] ?? "");
  const date = headers["date"] ? new Date(headers["date"]) : null;
  return {
    from: from.email,
    fromName: from.name,
    to: (headers["to"] ?? "").split(",").map((x) => address(x).email).filter(Boolean),
    subject: decodeWords(headers["subject"] ?? ""),
    date: date && !Number.isNaN(date.getTime()) ? date : null,
    messageId: headers["message-id"]?.trim() ?? null,
    inReplyTo: headers["in-reply-to"]?.trim() ?? null,
    text: text.replace(/\r/g, "").trim(),
    attachments,
  };
}
