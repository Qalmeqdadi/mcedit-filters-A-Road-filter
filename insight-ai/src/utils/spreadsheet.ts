/**
 * Minimal, dependency-free spreadsheet I/O that runs entirely in the browser (offline):
 *  - reads .xlsx (first worksheet) and .csv;
 *  - writes a simple .xlsx (used for the use-case template).
 * .xlsx files are zip archives of XML; deflated entries are inflated with the
 * browser's built-in DecompressionStream.
 */

type Grid = string[][];

// ---------- ZIP reading ----------
interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  offset: number;
}

function readZipEntries(buf: ArrayBuffer): ZipEntry[] {
  const v = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('This file is not a valid .xlsx workbook.');
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const entries: ZipEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true);
    const compressedSize = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const offset = v.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf, p + 46, nameLen));
    entries.push({ name, method, compressedSize, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readEntry(buf: ArrayBuffer, e: ZipEntry): Promise<string> {
  const v = new DataView(buf);
  const nameLen = v.getUint16(e.offset + 26, true);
  const extraLen = v.getUint16(e.offset + 28, true);
  const start = e.offset + 30 + nameLen + extraLen;
  const data = new Uint8Array(buf, start, e.compressedSize);
  if (e.method === 0) return new TextDecoder().decode(data);
  if (e.method !== 8) throw new Error('Unsupported compression in this workbook.');
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot read .xlsx files. Save the sheet as .csv and try again.');
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}

const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml');
const byTag = (d: Document | Element, tag: string) => Array.from(d.getElementsByTagNameNS('*', tag));

function colIndex(ref: string) {
  const letters = ref.replace(/[0-9]/g, '');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.toUpperCase().charCodeAt(0) - 64);
  return n - 1;
}

export async function parseXlsx(buf: ArrayBuffer): Promise<Grid> {
  const entries = readZipEntries(buf);
  const find = (name: string) => entries.find((e) => e.name.replace(/^\//, '').toLowerCase() === name.toLowerCase());

  // Locate the first worksheet via the workbook and its relationships.
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const wb = find('xl/workbook.xml');
  const rels = find('xl/_rels/workbook.xml.rels');
  if (wb && rels) {
    const wbDoc = xml(await readEntry(buf, wb));
    const first = byTag(wbDoc, 'sheet')[0];
    const rid = first?.getAttribute('r:id') ?? first?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const relDoc = xml(await readEntry(buf, rels));
    const rel = byTag(relDoc, 'Relationship').find((r) => r.getAttribute('Id') === rid);
    const target = rel?.getAttribute('Target');
    if (target) sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  }
  const sheet = find(sheetPath) ?? entries.find((e) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(e.name));
  if (!sheet) throw new Error('No worksheet found in this workbook.');

  const sst: string[] = [];
  const ss = find('xl/sharedStrings.xml');
  if (ss) {
    const doc = xml(await readEntry(buf, ss));
    for (const si of byTag(doc, 'si')) sst.push(byTag(si, 't').map((t) => t.textContent ?? '').join(''));
  }

  const doc = xml(await readEntry(buf, sheet));
  const grid: Grid = [];
  for (const row of byTag(doc, 'row')) {
    const r = Number(row.getAttribute('r') ?? grid.length + 1) - 1;
    const out: string[] = [];
    let next = 0;
    for (const c of byTag(row, 'c')) {
      const ref = c.getAttribute('r');
      const ci = ref ? colIndex(ref) : next;
      next = ci + 1;
      const t = c.getAttribute('t');
      const vEl = byTag(c, 'v')[0];
      let val = '';
      if (t === 's') val = sst[Number(vEl?.textContent ?? -1)] ?? '';
      else if (t === 'inlineStr') val = byTag(c, 't').map((x) => x.textContent ?? '').join('');
      else if (t === 'b') val = vEl?.textContent === '1' ? 'TRUE' : 'FALSE';
      else val = vEl?.textContent ?? '';
      out[ci] = val;
    }
    grid[r] = Array.from(out, (x) => x ?? '');
  }
  return Array.from(grid, (x) => x ?? []);
}

// ---------- CSV ----------
export function parseCsv(text: string): Grid {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/)[0] ?? '';
  const delim = [',', ';', '\t'].map((d) => ({ d, n: firstLine.split(d).length })).sort((a, b) => b.n - a.n)[0].d;
  const rows: Grid = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export async function readSpreadsheet(file: File): Promise<Grid> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) return parseXlsx(await file.arrayBuffer());
  if (name.endsWith('.csv') || name.endsWith('.txt')) return parseCsv(await file.text());
  if (name.endsWith('.xls')) throw new Error('Older .xls files are not supported. In Excel, use Save As › Excel Workbook (.xlsx) or CSV.');
  throw new Error('Please choose an Excel workbook (.xlsx) or a CSV file.');
}

// ---------- XLSX writing (stored, uncompressed) ----------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (d: Uint8Array) => {
  let c = 0xffffffff;
  for (const b of d) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function zipStore(files: { name: string; data: string }[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = enc.encode(f.data);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    const cen = new Uint8Array(46 + name.length);
    const cv = new DataView(cen.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    cen.set(name, 46);
    chunks.push(local, data);
    central.push(cen);
    offset += local.length + data.length;
  }
  const cenSize = central.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cenSize, true);
  ev.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, end] as BlobPart[], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colName = (i: number) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/** Builds a one-sheet .xlsx. Numbers are written as numbers, everything else as text. The first row is bold. */
export function buildXlsx(rows: (string | number)[][], sheetName = 'Use cases', widths: number[] = []): Blob {
  const cols = widths.length ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const body = rows
    .map(
      (r, ri) =>
        `<row r="${ri + 1}">${r
          .map((v, ci) => {
            const ref = `${colName(ci)}${ri + 1}`;
            const style = ri === 0 ? ' s="1"' : '';
            return typeof v === 'number' ? `<c r="${ref}"${style}><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
          })
          .join('')}</row>`,
    )
    .join('');
  return zipStore([
    {
      name: '[Content_Types].xml',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    },
    {
      name: '_rels/.rels',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    },
    {
      name: 'xl/styles.xml',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${body}</sheetData></worksheet>`,
    },
  ]);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
