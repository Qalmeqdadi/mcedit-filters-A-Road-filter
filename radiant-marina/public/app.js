/* Radiant Marina Sale Desk - single-page dashboard, no dependencies.
   Server mode: data from /api/all, state saved with PUT /api/state.
   Static mode (published snapshot): data from window.__STATIC_DATA__, state kept in this browser only.
   Nothing in this file sends a message or posts an advert. */
(function () {
  "use strict";
  const TARGET_DATE = new Date("2027-09-30T23:59:59+04:00");
  const STAGES = ["Identified", "Approved to contact", "Contacted", "Responded", "Qualified",
    "Viewing / docs sent", "Offer", "MOU signed", "Closed - won", "Closed - not a fit"];
  const CONTACT_GATED = new Set(STAGES.slice(2, 9));
  const PAGES = [
    ["overview", "Overview"], ["pipeline", "Lead pipeline"], ["database", "Broker & investor DB"],
    ["comparables", "Comparables"], ["pricing", "Pricing analysis"], ["scoring", "Lead scoring"],
    ["campaigns", "Campaigns & outreach"], ["approvals", "Approvals"], ["timeline", "Timeline"],
    ["calculator", "Proceeds calculator"], ["refresh", "Research refresh"]];

  let D = null;        // data bundle
  let ST = null;       // working state
  let MODE = "server";
  let saveTimer = null;
  const ui = { dbSearch: "", dbCat: "all", dbMatch: "all", compBeds: "3", compSort: ["price_aed", 1], dbSort: ["score", -1] };

  // ---------- helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const aed = (n) => n == null || isNaN(n) ? "-" : "AED " + Math.round(n).toLocaleString("en-US");
  const fmt = (n) => n == null || isNaN(n) ? "-" : Math.round(n).toLocaleString("en-US");
  const compact = (n) => n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 === 0 ? 1 : 2).replace(/\.?0+$/, "") + "M" : n >= 1e3 ? Math.round(n / 1e3) + "K" : String(n);
  const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
  const daysUntil = (d) => Math.ceil((d - new Date()) / 864e5);
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => Math.random().toString(36).slice(2, 9);
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.style.display = "block"; clearTimeout(t._h); t._h = setTimeout(() => (t.style.display = "none"), 2600); }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      if (MODE === "server") {
        try {
          const r = await fetch("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ST) });
          if (!r.ok) throw new Error(r.status);
        } catch (e) { toast("Could not save to server: " + e.message); }
      } else {
        try { localStorage.setItem("rm-sale-desk-state", JSON.stringify(ST)); } catch (e) { /* storage unavailable */ }
      }
    }, 250);
  }

  // ---------- derived data ----------
  function allLeads() {
    const L = D.leads || {};
    return [...(L.manual || []), ...(ST.custom_leads || []), ...(L.auto || [])];
  }
  const statusOf = (id) => (ST.lead_status && ST.lead_status[id]) || "Identified";
  function rm(beds) { return ((D.comparables || {}).radiant_marina || []).filter((l) => beds === "all" || l.bedrooms === beds); }
  function stats3() {
    const L = rm("3");
    const p = L.map((l) => l.price_aed), s = L.map((l) => l.ppsf).filter(Boolean);
    return { n: L.length, min: Math.min(...p), max: Math.max(...p), med: median(p), ppsfMed: median(s), ppsfMin: Math.min(...s), ppsfMax: Math.max(...s), oldest: L.map((l) => l.listed_date).sort()[0] };
  }
  function approvedFor(leadId) { return (ST.approvals || []).some((a) => a.lead_id === leadId && (a.status === "approved" || a.status === "sent")); }
  function pendingApprovals() { return (ST.approvals || []).filter((a) => a.status === "pending").length; }

  // ---------- message templates ----------
  const TEMPLATES = {
    broker_en: { label: "Broker co-broke (English, WhatsApp/email)", dir: "ltr", text: (l, c) =>
`Hello {name},

I'm the owner of a 3-bedroom off-plan apartment in Radiant Marina Towers, Al Reem Island (handover listed for Q4 2027). I noticed you're marketing ${l.preferences && l.preferences.includes("3BR") ? "a 3BR" : "units"} in the same towers.

I'm looking for one or two brokers with active 3BR buyers. Asking price: AED {price}. I can share the SPA extract, payment schedule and floor plan once we agree terms. I'm open to a standard co-broke, or an exclusive for the right plan.

Do you have buyers who enquired on 3BR units in Radiant Marina and didn't proceed? Could you share what similar units have recently achieved?

Thank you,
{owner}` },
    broker_ar: { label: "Broker co-broke (Arabic, WhatsApp)", dir: "rtl", text: () =>
`مرحباً {name}،

أنا مالك شقة ثلاث غرف نوم على الخارطة في أبراج راديانت مارينا، جزيرة الريم (التسليم المتوقع الربع الرابع 2027). لاحظت أنكم تسوّقون وحدات في نفس المشروع.

أبحث عن وسيط أو اثنين لديهم مشترون جادّون لشقق ثلاث غرف. السعر المطلوب: {price} درهم. يمكنني مشاركة مستخلص عقد البيع وجدول الدفعات والمخطط بعد الاتفاق على الشروط، ومنفتح على التعاون بعمولة قياسية أو على تفويض حصري بخطة تسويق واضحة.

هل لديكم مشترون استفسروا عن شقق ثلاث غرف في راديانت مارينا ولم يكملوا؟ وما هي الأسعار المحققة مؤخراً لوحدات مماثلة؟

شكراً لكم،
{owner}` },
    investor_linkedin: { label: "LinkedIn note to investor / advisor", dir: "ltr", text: () =>
`Hi {name}, I'm selling my 3BR off-plan unit in Radiant Marina Towers, Al Reem Island (handover listed Q4 2027, waterfront, near the ADGM expansion). It's a resale with part of the payment plan already paid, so the buyer's entry cash is the paid amount plus a premium. Asking AED {price}. If you advise clients looking at Reem family units or Golden-Visa-eligible property, I'd be glad to share the fact sheet. No pressure if it's not a fit.` },
    followup_en: { label: "Follow-up after 5 days (English)", dir: "ltr", text: () =>
`Hello {name}, following up on my note about the 3BR in Radiant Marina Towers (AED {price}). Happy to send the fact sheet and payment schedule. Is this something your buyers would look at this month?` }
  };
  function fillTemplate(key, lead, price) {
    const t = TEMPLATES[key];
    return t.text(lead).replace(/\{name\}/g, (lead.contact_person || lead.name || "").split(" ")[0] || "there")
      .replace(/\{price\}/g, fmt(price)).replace(/\{owner\}/g, ST.owner_name || "[your name]");
  }

  // ---------- charts (hand-built SVG) ----------
  function tipOn(el, html) {
    const tip = $("#tooltip");
    el.addEventListener("mousemove", (e) => { tip.innerHTML = html; tip.style.display = "block"; tip.style.left = Math.min(e.clientX + 14, innerWidth - 290) + "px"; tip.style.top = e.clientY + 14 + "px"; });
    el.addEventListener("mouseleave", () => (tip.style.display = "none"));
  }
  function niceTicks(lo, hi, n) {
    const span = hi - lo, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) || mag * 10;
    const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(v); return out;
  }
  function scatterChart(host, series, refs, opt) {
    const W = 760, H = 330, m = { l: 62, r: 120, t: 14, b: 40 };
    const pts = series.flatMap((s) => s.points);
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y).concat(refs.map((r) => r.y));
    const x0 = Math.min(...xs) * 0.92, x1 = Math.max(...xs) * 1.05, y0 = Math.min(...ys) * 0.93, y1 = Math.max(...ys) * 1.03;
    const X = (v) => m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r), Y = (v) => H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b);
    let g = "";
    niceTicks(y0, y1, 5).forEach((v) => { g += `<line class="axis" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end">${compact(v)}</text>`; });
    niceTicks(x0, x1, 6).forEach((v) => { g += `<text x="${X(v)}" y="${H - m.b + 18}" text-anchor="middle">${fmt(v)}</text>`; });
    g += `<text x="${(m.l + W - m.r) / 2}" y="${H - 6}" text-anchor="middle">${esc(opt.xLabel)}</text>`;
    refs.forEach((r) => { g += `<line class="ref" x1="${m.l}" x2="${W - m.r}" y1="${Y(r.y)}" y2="${Y(r.y)}"/><text x="${W - m.r + 6}" y="${Y(r.y) + 4}">${esc(r.label)}</text>`; });
    let dots = "";
    series.forEach((s, si) => s.points.forEach((p, pi) => {
      dots += `<g class="pt" data-s="${si}" data-p="${pi}"><circle cx="${X(p.x)}" cy="${Y(p.y)}" r="12" fill="transparent"/><circle cx="${X(p.x)}" cy="${Y(p.y)}" r="5" fill="${s.color}" stroke="var(--surface-1)" stroke-width="2"/></g>`;
    }));
    host.innerHTML = `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join("")}${refs.length ? `<span><i class="line"></i>Reference price</span>` : ""}</div>
      <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.aria)}">${g}${dots}</svg>`;
    host.querySelectorAll(".pt").forEach((el) => { const p = series[+el.dataset.s].points[+el.dataset.p]; tipOn(el, p.tip); if (p.href) { el.style.cursor = "pointer"; el.addEventListener("click", () => window.open(p.href, "_blank", "noopener")); } });
  }
  function stripChart(host, items, marks, band) {
    const W = 760, H = 150, m = { l: 24, r: 24, t: 10, b: 28 };
    const vals = items.map((i) => i.v).concat(marks.map((k) => k.v), band ? [band.lo, band.hi] : []);
    const lo = Math.min(...vals) * 0.985, hi = Math.max(...vals) * 1.012;
    const X = (v) => m.l + (v - lo) / (hi - lo) * (W - m.l - m.r), cy = 96;
    let g = "";
    if (band) g += `<rect class="band" x="${X(band.lo)}" y="${cy - 52}" width="${X(band.hi) - X(band.lo)}" height="66" rx="4"/><text x="${(X(band.lo) + X(band.hi)) / 2}" y="${cy - 58}" text-anchor="middle">${esc(band.label)}</text>`;
    g += `<line class="axis" x1="${m.l}" x2="${W - m.r}" y1="${cy}" y2="${cy}"/>`;
    niceTicks(lo, hi, 6).forEach((v) => { g += `<text x="${X(v)}" y="${H - 6}" text-anchor="middle">${(v / 1e6).toFixed(2)}M</text>`; });
    marks.forEach((k) => { const ty = cy - 30 - (k.row || 0) * 16; g += `<line class="ref" x1="${X(k.v)}" x2="${X(k.v)}" y1="${ty + 4}" y2="${cy + 12}"/><text x="${X(k.v) + (k.anchor === "end" ? -4 : k.anchor === "start" ? 4 : 0)}" y="${ty}" text-anchor="${k.anchor || "middle"}">${esc(k.label)}</text>`; });
    const seen = {};
    const dots = items.map((it, i) => { const k = Math.round(X(it.v) / 6); seen[k] = (seen[k] || 0) + 1; const dy = (seen[k] - 1) * 13; return `<g class="pt" data-i="${i}"><circle cx="${X(it.v)}" cy="${cy - dy}" r="11" fill="transparent"/><circle cx="${X(it.v)}" cy="${cy - dy}" r="5" fill="var(--series-1)" stroke="var(--surface-1)" stroke-width="2"/></g>`; }).join("");
    host.innerHTML = `<div class="legend"><span><i style="background:var(--series-1)"></i>Competing 3BR asking price</span><span><i class="line"></i>Your reference prices</span></div><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Asking prices of competing 3BR listings against your cost, the recommended band and your target">${g}${dots}</svg>`;
    host.querySelectorAll(".pt").forEach((el) => tipOn(el, items[+el.dataset.i].tip));
  }

  // ---------- pages ----------
  function head(title, sub, right = "") { return `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ""}</div><div class="btn-row">${right}</div></div>`; }
  function tile(label, value, delta) { return `<div class="card tile"><div class="label">${esc(label)}</div><div class="value">${value}</div>${delta ? `<div class="delta">${delta}</div>` : ""}</div>`; }
  function statusPill(s) {
    const cls = s.startsWith("Closed - won") || s === "MOU signed" ? "good" : s.startsWith("Closed - not") ? "bad" : s === "Identified" ? "" : "info";
    return `<span class="pill ${cls}"><span class="dot"></span>${esc(s)}</span>`;
  }
  function scoreCell(s) { return `<span class="score"><span class="meter"><i style="width:${Math.max(0, Math.min(100, s || 0))}%"></i></span>${s == null ? "-" : s}</span>`; }

  const R = {};
  R.overview = () => {
    const s = stats3(), calc = ST.calculator, leads = allLeads();
    const target = (D.property.targets || {}).target_price_aed || 3500000;
    const over = (target / s.max - 1) * 100;
    const days = daysUntil(TARGET_DATE);
    const flags = ((D.refresh_log || [])[0] || {}).flags || [];
    const top = leads.filter((l) => !statusOf(l.lead_id).startsWith("Closed")).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 6);
    const next = (ST.milestones || []).find((m) => !m.done);
    const verifiedBuyers = leads.filter((l) => l.category === "Direct Buyer" || l.category === "Investor").length;
    return head("Overview", "Where the sale stands today, built only from data that could be verified. Every number links back to its source in the tabs.") +
      `<div class="callout warn"><h3>Your AED ${compact(target)} target sits above every competing 3BR asking price</h3>
       ${s.n} other 3BR units in Radiant Marina Towers are listed between ${aed(s.min)} and ${aed(s.max)} (median ${aed(s.med)}) on Property Finder. Your target is ${over.toFixed(1)}% above the highest. The oldest has been listed since ${esc(s.oldest)}, so ${aed(s.max)} is not clearing quickly. See <a href="#pricing">Pricing analysis</a> for the recommended band.</div>
      <div class="grid g4">
        ${tile("Days to target completion", fmt(days), "30 Sep 2027 · MOU needed by ~30 Jun 2027")}
        ${tile("Competing 3BR listings", s.n, `${compact(s.min)} – ${compact(s.max)} asking`)}
        ${tile("Verified direct buyers / investors", verifiedBuyers, verifiedBuyers ? "logged from manual research" : "none found in public sources yet")}
        ${tile("Pending approvals", pendingApprovals(), `${(ST.outreach_log || []).length} messages sent so far`)}
      </div>
      <div class="grid g2">
        <div class="card"><div class="card-head"><h2>Strongest prospects</h2><a href="#database">All ${leads.length}</a></div>
          <table><thead><tr><th>Prospect</th><th>Type</th><th>Score</th><th>Status</th></tr></thead><tbody>
          ${top.map((l) => `<tr class="clickable" data-lead="${esc(l.lead_id)}"><td><b>${esc(l.name)}</b><div class="small muted">${esc(l.contact_person || "")}</div></td><td>${esc(l.category)}</td><td>${scoreCell(l.score)}</td><td>${statusPill(statusOf(l.lead_id))}</td></tr>`).join("")}
          </tbody></table></div>
        <div class="card"><div class="card-head"><h2>What changed in the last refresh</h2><a href="#refresh">Refresh</a></div>
          ${flags.length ? `<table><tbody>${flags.slice(0, 8).map((f) => `<tr><td>${esc(f.type.replace(/_/g, " "))}</td><td>${esc(f.bedrooms ? (f.bedrooms === "studio" ? "Studio" : f.bedrooms + "BR") : "")} ${f.price_aed ? aed(f.price_aed) : f.to ? aed(f.from) + " → " + aed(f.to) : esc(f.name || "")}</td><td>${f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">open</a>` : ""}</td></tr>`).join("")}</tbody></table>${flags.length > 8 ? `<p class="small muted">+${flags.length - 8} more on the Refresh tab</p>` : ""}` : `<div class="empty">No changes flagged.</div>`}
          <p class="small muted" style="margin-top:8px">Last refresh: ${esc(((D.refresh_log || [])[0] || {}).finished_at || "never")}</p>
        </div>
      </div>
      <div class="grid g2">
        <div class="card"><h2>Next milestone</h2>${next ? `<p><b>${esc(next.label)}</b> - ${esc(next.date)} (${daysUntil(new Date(next.date))} days)</p>` : "<p>All milestones done.</p>"}<a href="#timeline">Full timeline</a></div>
        <div class="card"><h2>Cash position at ${aed(calc.sale_price)}</h2>${(() => { const c = calcOut(calc); return `<p>You would receive about <b>${aed(c.net)}</b> (your ${aed(c.paid)} paid back plus ${aed(c.netGain)} net gain after fees). The buyer would need ${aed(c.buyerUpfront)} up front and would take over ${aed(c.remaining)} owed to Radiant.</p>`; })()}<a href="#calculator">Open calculator</a></div>
      </div>`;
  };

  R.pipeline = () => {
    const leads = allLeads();
    const by = Object.fromEntries(STAGES.map((s) => [s, []]));
    leads.forEach((l) => by[statusOf(l.lead_id)].push(l));
    return head("Lead pipeline", "Drag-free on purpose: open a lead to move it. Contact stages unlock only after you approve a message for that lead in <a href=\"#approvals\">Approvals</a>.") +
      `<div class="kanban">${STAGES.map((s) => `<div class="col"><h3>${esc(s)}<span>${by[s].length}</span></h3>${by[s].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 40).map((l) => `<div class="kcard" data-lead="${esc(l.lead_id)}"><div class="t">${esc(l.name)}</div><div class="m">${esc(l.category)} · score ${l.score ?? "-"} · ${esc(l.match || "")} match</div></div>`).join("") || `<div class="small muted">Empty</div>`}${by[s].length > 40 ? `<div class="small muted">+${by[s].length - 40} more in the database</div>` : ""}</div>`).join("")}</div>`;
  };

  R.database = () => {
    let leads = allLeads();
    const q = ui.dbSearch.toLowerCase();
    if (q) leads = leads.filter((l) => JSON.stringify(l).toLowerCase().includes(q));
    if (ui.dbCat !== "all") leads = leads.filter((l) => l.category === ui.dbCat);
    if (ui.dbMatch !== "all") leads = leads.filter((l) => l.match === ui.dbMatch);
    const [k, dir] = ui.dbSort;
    leads.sort((a, b) => ((a[k] ?? -1) > (b[k] ?? -1) ? 1 : -1) * dir);
    const rejected = (D.leads || {}).rejected_candidates || [];
    const th = (key, label, cls = "") => `<th class="sortable ${cls}" data-sort="${key}">${label}${ui.dbSort[0] === key ? (ui.dbSort[1] > 0 ? " ↑" : " ↓") : ""}</th>`;
    return head("Broker & investor database", "Deduplicated by brokerage. Broker rows are generated from live Property Finder data; anything you add by hand must carry a source link and the buyer's own words.", `<button class="primary" id="add-lead">Add a lead you found</button>`) +
      `<div class="callout"><h3>Direct buyers verified: ${allLeads().filter((l) => l.category === "Direct Buyer").length}</h3>No public post from an identifiable buyer asking for a 3BR in Radiant Marina or on Reem was found across ${((D.market || {}).buyer_intent_search_log || []).length} English and Arabic searches. Facebook groups, LinkedIn and Reddit are not readable from here, so buyers are reached through the brokers below and through the posts you approve. Rejected candidates are listed at the bottom.</div>
      <div class="toolbar"><input type="search" id="db-q" placeholder="Search name, agent, language, evidence…" value="${esc(ui.dbSearch)}">
        <select id="db-cat">${["all", "Broker", "Buyer's Agent", "Investor", "Direct Buyer"].map((c) => `<option ${ui.dbCat === c ? "selected" : ""} value="${c}">${c === "all" ? "All categories" : c}</option>`).join("")}</select>
        <select id="db-match">${["all", "High", "Medium", "Low"].map((c) => `<option ${ui.dbMatch === c ? "selected" : ""} value="${c}">${c === "all" ? "Any match" : c + " match"}</option>`).join("")}</select>
        <span class="small muted">${leads.length} shown</span></div>
      <div class="table-wrap"><table><thead><tr>${th("lead_id", "ID")}${th("name", "Name / contact")}${th("category", "Category")}${th("match", "Match")}${th("score", "Score", "r")}<th>Languages</th>${th("interest_date", "Last active")}<th>Status</th><th>Source</th></tr></thead><tbody>
      ${leads.map((l) => `<tr class="clickable" data-lead="${esc(l.lead_id)}"><td class="small">${esc(l.lead_id)}</td><td><b>${esc(l.name)}</b><div class="small muted">${esc(l.contact_person || "")}${l.licence_no ? " · licence " + esc(l.licence_no) : ""}</div></td><td>${esc(l.category)}</td><td>${esc(l.match || "")}</td><td class="r">${scoreCell(l.score)}</td><td class="small">${esc((l.languages || []).join(", "))}</td><td class="small">${esc(l.interest_date || "")}</td><td>${statusPill(statusOf(l.lead_id))}</td><td><a href="${esc(l.source_url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${esc(l.platform || "link")}</a></td></tr>`).join("")}
      </tbody></table></div>
      <div class="card"><h2>Rejected candidates (${rejected.length})</h2><p class="small muted">Found during research but not added, with the reason.</p><table><tbody>${rejected.map((r) => `<tr><td><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a></td><td class="small">${esc(r.reason)}</td></tr>`).join("")}</tbody></table></div>`;
  };

  R.comparables = () => {
    const c = D.comparables || {};
    let L = rm(ui.compBeds);
    const [k, dir] = ui.compSort;
    L = [...L].sort((a, b) => ((a[k] ?? 0) > (b[k] ?? 0) ? 1 : -1) * dir);
    const th = (key, label, cls = "") => `<th class="sortable ${cls}" data-csort="${key}">${label}${ui.compSort[0] === key ? (ui.compSort[1] > 0 ? " ↑" : " ↓") : ""}</th>`;
    const tx = D.transactions || [], snip = (D.market || {}).snippet_comparables || [];
    const proj = c.project || {};
    return head("Comparable listings & transactions", `Radiant Marina Towers listings read from Property Finder on ${esc((c.radiant_marina_fetched_at || "").slice(0, 10))} (${(c.radiant_marina || []).length} unique of ${c.radiant_marina_total_reported || "?"} the site reports). All prices here are <b>asking prices</b> unless labelled otherwise.`) +
      `<div class="card"><div class="card-head"><h2>Price vs size - Radiant Marina 2BR and 3BR</h2><span class="small muted">Hover a dot; click to open the listing</span></div><div id="scatter"></div></div>
      <div class="card"><div class="card-head"><h2>Active listings</h2><div class="toolbar" style="margin:0"><select id="comp-beds">${[["3", "3 bedrooms"], ["2", "2 bedrooms"], ["1", "1 bedroom"], ["studio", "Studios"], ["all", "All"]].map(([v, t]) => `<option value="${v}" ${ui.compBeds === v ? "selected" : ""}>${t}</option>`).join("")}</select></div></div>
      <div class="table-wrap"><table><thead><tr>${th("price_aed", "Asking", "r")}${th("size_sqft", "Sqft", "r")}${th("ppsf", "AED/sqft", "r")}<th>Beds/baths</th><th>View · floor</th>${th("listed_date", "Listed")}<th>Broker / agent</th><th>Notes</th></tr></thead><tbody>
      ${L.map((l) => `<tr><td class="r num"><a href="${esc(l.url)}" target="_blank" rel="noopener">${fmt(l.price_aed)}</a></td><td class="r num">${fmt(l.size_sqft)}</td><td class="r num">${fmt(l.ppsf)}</td><td>${esc(l.bedrooms)}/${esc(l.bathrooms)}</td><td class="small">${esc(l.view_hint || "-")} · ${esc(l.floor_hint || "-")}</td><td class="small">${esc(l.listed_date)}</td><td class="small">${esc(l.broker)}<div class="muted">${esc(l.agent)} · permit ${esc(l.permit || "-")}</div></td><td class="small">${l.building_check ? `<span class="pill warn"><span class="dot"></span>check building</span>` : ""}</td></tr>`).join("")}
      </tbody></table></div><p class="small muted" style="margin-top:8px">View and floor are read from the listing text and may be missing. Permit = the listing permit number shown on the portal.</p></div>
      <div class="grid g2">
        <div class="card"><h2>Agent-claimed sales on Al Reem Island</h2><p class="small muted">From agents' Property Finder profiles. These are self-reported by agents and <b>not registry-verified</b>; sizes are not given. The closest thing to achieved prices that is publicly readable.</p>
          <div class="table-wrap" style="max-height:340px"><table><thead><tr><th>Date</th><th>Building</th><th>Beds</th><th class="r">Price</th><th>Agent</th></tr></thead><tbody>
          ${tx.filter((t) => t.property_type === "Apartment").map((t) => `<tr><td class="small">${esc(t.date)}</td><td>${esc(t.tower)}</td><td>${esc(t.bedrooms)}</td><td class="r num">${fmt(t.price_aed)}</td><td class="small"><a href="${esc(t.agent_profile)}" target="_blank" rel="noopener">${esc(t.agent)}</a></td></tr>`).join("")}
          </tbody></table></div></div>
        <div class="card"><h2>Project facts (Property Finder project page)</h2>
          <dl class="kv"><dt>Developer</dt><dd>${esc(proj.developer)}</dd><dt>Expected completion</dt><dd>${esc(proj.delivery_date)}</dd><dt>Sales status</dt><dd>${esc(proj.sales_phase)}</dd>
          <dt>3BR launch price</dt><dd>${(proj.launch_units || []).filter((u) => u.bedrooms === 3).map((u) => `from ${aed(u.launch_price_from)} (${fmt(u.area_sqft)} sqft type)`).join("; ") || "-"}</dd>
          <dt>Payment plans</dt><dd>${(proj.payment_plans || []).map((p) => `${esc(p.title)}: ${Object.values(p.phases).join("/")}`).join("<br>")}</dd>
          <dt>Registry transactions</dt><dd>${proj.historical_transactions && (proj.historical_transactions.sale || []).length ? "available" : "None published for this project"}</dd></dl>
          <p class="small"><a href="${esc(proj.source_url)}" target="_blank" rel="noopener">Source</a></p></div>
      </div>
      <div class="card"><h2>Other 3BR asking prices seen via web search (unverified)</h2><p class="small muted">Bayut and Dubizzle block automated reading, so these come from search-result snippets. Dates are often unknown and some may be stale.</p>
        <table><thead><tr><th>Source</th><th class="r">Asking</th><th class="r">Sqft</th><th>Notes</th></tr></thead><tbody>${snip.map((s) => `<tr><td><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.source)}</a></td><td class="r num">${fmt(s.price_aed)}</td><td class="r num">${fmt(s.size_sqft)}</td><td class="small">${esc(s.notes)}</td></tr>`).join("")}</tbody></table></div>`;
  };
  R.comparables.after = () => {
    const mk = (beds, name, color) => ({ name, color, points: rm(beds).filter((l) => l.size_sqft).map((l) => ({ x: l.size_sqft, y: l.price_aed, href: l.url, tip: `<b>${aed(l.price_aed)}</b><br>${fmt(l.size_sqft)} sqft · ${fmt(l.ppsf)} AED/sqft<br>${esc(l.broker)}<br>Listed ${esc(l.listed_date)}` })) });
    const target = (D.property.targets || {}).target_price_aed || 3500000;
    scatterChart($("#scatter"), [mk("3", "3BR asking", "var(--series-1)"), mk("2", "2BR asking", "var(--series-2)")],
      [{ y: target, label: "Your target " + compact(target) }, { y: D.property.financials.original_price_aed, label: "Your cost " + compact(D.property.financials.original_price_aed) }],
      { xLabel: "Size (sqft)", aria: "Asking price against size for Radiant Marina 2 and 3 bedroom listings" });
  };

  R.pricing = () => {
    const s = stats3(), size = ST.calculator.size_sqft;
    const target = (D.property.targets || {}).target_price_aed || 3500000;
    const reem = ((D.comparables || {}).reem_3br || []);
    const reemOff = reem.filter((l) => (l.completion_status || "").startsWith("off_plan") && l.ppsf);
    const tx3 = (D.transactions || []).filter((t) => t.bedrooms === "3" && t.property_type === "Apartment");
    const bySize = size ? `<p>At your ${fmt(size)} sqft, the competing 3BRs' AED/sqft range (${fmt(s.ppsfMin)}–${fmt(s.ppsfMax)}, median ${fmt(s.ppsfMed)}) implies <b>${aed(size * s.ppsfMed)}</b> at the median.</p>` : `<p class="muted">Enter your unit's size in the <a href="#calculator">calculator</a> to see a size-based estimate. Note that sellers here price 3BRs at AED 3.2–3.3M regardless of size, so size moves the price less than AED/sqft suggests.</p>`;
    const scen = [3250000, 3350000, 3450000, 3500000];
    return head("Pricing analysis", "Asking prices are not achieved prices. Achieved prices for this building are not published; the nearest evidence is agent-claimed sales in Radiant Square, the developer's neighbouring completed towers.") +
      `<div class="grid g4">${tile("3BR asking range (RMT)", `${compact(s.min)}–${compact(s.max)}`, `${s.n} listings, median ${aed(s.med)}`)}
        ${tile("3BR AED/sqft (RMT)", fmt(s.ppsfMed), `median; range ${fmt(s.ppsfMin)}–${fmt(s.ppsfMax)}`)}
        ${tile("Reem 3BR off-plan AED/sqft", fmt(median(reemOff.map((l) => l.ppsf))), `median of ${reemOff.length} listings`)}
        ${tile("Claimed 3BR sales nearby", tx3.length ? `${compact(Math.min(...tx3.map((t) => t.price_aed)))}–${compact(Math.max(...tx3.map((t) => t.price_aed)))}` : "-", `${tx3.length} agent-claimed, not verified`)}</div>
      <div class="card"><div class="card-head"><h2>Where your price sits against the competing 3BRs</h2><span class="small muted">Each dot is one active 3BR listing in Radiant Marina Towers</span></div><div id="strip"></div></div>
      <div class="grid g2">
        <div class="card"><h2>Recommendation</h2>
          <p><b>List at AED 3.35M–3.45M, expect to agree AED 3.15M–3.30M.</b></p>
          <ul>
            <li>Every competing 3BR asks AED 3.2–3.3M, and one has sat at 3.3M since ${esc(s.oldest)}. Buyers compare inside the building first.</li>
            <li>List at <b>3.45M only if</b> your unit beats theirs on something a buyer can see: high floor, full sea view, a larger layout (above ~2,000 sqft) or a lower remaining balance. Otherwise 3.35M.</li>
            <li><b>AED 3.5M</b> needs either an exceptional unit or further growth. Reem apartment prices rose 17–21% year on year to mid-2026 (Cavendish Maxwell, ADX). If the competing asks climb past ~3.4M by spring 2027, re-test 3.5M then.</li>
            <li>Sell earlier rather than later. Each instalment you pay before the sale raises the cash a buyer must bring, which shrinks the pool. Near handover the buyer also faces the large handover payment.</li>
          </ul>${bySize}</div>
        <div class="card"><h2>Scenarios</h2><table><thead><tr><th>List price</th><th class="r">Likely agreed (−3% / −6%)</th><th class="r">Your net cash at −3%</th><th class="r">Net gain at −3%</th></tr></thead><tbody>
          ${scen.map((p) => { const a = calcOut({ ...ST.calculator, sale_price: p * 0.97 }); return `<tr ${p === target ? 'style="font-weight:600"' : ""}><td>${aed(p)}</td><td class="r num">${compact(p * 0.97)} / ${compact(p * 0.94)}</td><td class="r num">${fmt(a.net)}</td><td class="r num">${fmt(a.netGain)}</td></tr>`; }).join("")}
          </tbody></table><p class="small muted" style="margin-top:8px">Uses your calculator settings (commission, VAT, registration share, NOC fee). Discounts are assumptions, not market data.</p></div>
      </div>
      <div class="card"><h2>Risks of selling before handover</h2><ul>
        <li><b>Developer NOC conditions:</b> Radiant may require a minimum % paid (30–40% is common). You have paid about ${(D.property.financials.paid_to_date_aed / D.property.financials.original_price_aed * 100).toFixed(1)}%. Confirm the threshold, fee and processing time in writing before you list.</li>
        <li><b>Buyer financing:</b> few banks lend on off-plan resales before completion, so most buyers will be cash buyers for the upfront amount.</li>
        <li><b>Competing supply:</b> 8 other 3BRs plus ${(D.comparables || {}).radiant_marina_total_reported || "many"} total listings in the towers; investors may flip at handover, adding stock in late 2027.</li>
        <li><b>Handover timing:</b> the portal shows completion on 1 Dec 2027. A delay helps a sale (later handover payment); an early handover call would bring the 45% handover payment forward.</li>
        <li><b>Fees not yet confirmed officially:</b> DARI registration (cited as 2% of the contract value) and who pays it. Agree the split in the MOU.</li>
      </ul></div>`;
  };
  R.pricing.after = () => {
    const L = rm("3"), target = (D.property.targets || {}).target_price_aed || 3500000;
    stripChart($("#strip"), L.map((l) => ({ v: l.price_aed, tip: `<b>${aed(l.price_aed)}</b><br>${fmt(l.size_sqft)} sqft · ${fmt(l.ppsf)} AED/sqft<br>${esc(l.broker)}<br>Listed ${esc(l.listed_date)}` })),
      [{ v: D.property.financials.original_price_aed, label: "Your cost " + compact(D.property.financials.original_price_aed), anchor: "start" }, { v: target, label: "Your target " + compact(target), anchor: "end", row: 1 }],
      { lo: 3350000, hi: 3450000, label: "Recommended list band" });
  };

  R.scoring = () => {
    const leads = allLeads().sort((a, b) => (b.score || 0) - (a.score || 0));
    return head("Lead scoring", "Scores rank who to approach first. They are computed only from activity anyone can check on Property Finder, so they can be re-derived after every refresh.") +
      `<div class="grid g2"><div class="card"><h2>How a broker is scored (0–100)</h2><table><tbody>
        <tr><td>Listings in Radiant Marina Towers</td><td class="r">1.5 each, max 24</td></tr>
        <tr><td>Marketing a competing 3BR (holds 3BR enquiries)</td><td class="r">10 each, max 20</td></tr>
        <tr><td>Marketing a 2BR (upsizers)</td><td class="r">4 each, max 8</td></tr>
        <tr><td>Agent-claimed sales in Radiant buildings</td><td class="r">4 each, max 16</td></tr>
        <tr><td>Agent-claimed 3BR+ sales on Reem</td><td class="r">8 each, max 16</td></tr>
        <tr><td>SuperAgent status</td><td class="r">6</td></tr>
        <tr><td>Languages beyond English/Arabic (investor reach)</td><td class="r">5</td></tr>
        <tr><td>Licence number shown on profile</td><td class="r">5</td></tr></tbody></table>
        <p class="small muted" style="margin-top:8px">Direct buyers and investors you add by hand are scored by you; the form asks for evidence of intent.</p></div>
      <div class="card"><h2>Confidence levels</h2><ul><li><b>High:</b> read from live portal pages on the date shown.</li><li><b>Medium:</b> listing data only, or a reputable press source.</li><li><b>Low:</b> search snippet or second-hand; verify before contact.</li></ul>
        <p>Intent labels separate a <b>buyer's expressed intent</b> (their own words, dated, linked) from <b>broker activity</b> (marketing stock, which suggests but does not prove they hold buyers).</p></div></div>
      <div class="card"><div class="table-wrap"><table><thead><tr><th>Lead</th><th class="r">Score</th><th>Match</th><th>Intent</th><th>Confidence</th><th>Evidence</th></tr></thead><tbody>
        ${leads.map((l) => `<tr class="clickable" data-lead="${esc(l.lead_id)}"><td><b>${esc(l.name)}</b></td><td class="r">${scoreCell(l.score)}</td><td>${esc(l.match)}</td><td class="small">${esc(l.intent || "")}</td><td class="small">${esc(l.confidence || "")}</td><td class="small">${(l.evidence || []).map(esc).join("<br>")}</td></tr>`).join("")}
      </tbody></table></div></div>`;
  };

  R.campaigns = () => {
    const log = ST.outreach_log || [];
    return head("Campaigns & outreach", "The 60-day plan as trackable campaigns. Tick tasks as you go; every message actually sent is logged below.") +
      (ST.campaigns || []).map((c, ci) => { const done = c.tasks.filter((t) => t.done).length; return `<div class="card"><div class="card-head"><div><h2>${esc(c.name)}</h2><div class="small muted">${esc(c.channel)} · ${esc(c.start)} → ${esc(c.end)} · goal: ${esc(c.goal)}</div></div>
        <select data-camp-status="${ci}">${["Planned", "Active", "Paused", "Done"].map((s) => `<option ${c.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
        <div class="progress"><i style="width:${c.tasks.length ? done / c.tasks.length * 100 : 0}%"></i></div><div class="small muted">${done}/${c.tasks.length} tasks</div>
        ${c.tasks.map((t, ti) => `<label class="task"><input type="checkbox" data-task="${ci}:${ti}" ${t.done ? "checked" : ""}>${esc(t.t)}</label>`).join("")}</div>`; }).join("") +
      `<div class="card"><h2>Outreach log (${log.length})</h2>${log.length ? `<table><thead><tr><th>Date</th><th>Lead</th><th>Channel</th><th>Message</th></tr></thead><tbody>${log.slice().reverse().map((o) => `<tr><td class="small">${esc(o.date)}</td><td>${esc(o.lead_name)}</td><td class="small">${esc(o.channel)}</td><td class="small">${esc(o.text.slice(0, 140))}…</td></tr>`).join("")}</tbody></table>` : `<div class="empty">Nothing sent yet. Messages appear here after you approve them and mark them as sent.</div>`}</div>`;
  };

  R.approvals = () => {
    const A = ST.approvals || [];
    const groups = [["pending", "Waiting for your approval"], ["approved", "Approved - send it yourself, then mark as sent"], ["sent", "Sent"], ["rejected", "Rejected"]];
    return head("Contact approvals", "Nothing leaves this dashboard on its own. Draft a message from any lead, edit it, approve it, send it yourself from your own WhatsApp, LinkedIn or email, then mark it sent.") +
      `<div class="callout"><h3>How it works</h3><ul><li>Open a lead and press <b>Draft message</b>. The draft lands here as pending.</li><li>Approve: copy the text and contact the person through the source link (their listing or profile).</li><li>Mark as sent: the lead moves to <b>Contacted</b> and the message is logged.</li></ul></div>` +
      groups.map(([g, label]) => { const items = A.filter((a) => a.status === g); return `<div class="card"><h2>${label} (${items.length})</h2>${items.length ? items.map((a) => approvalCard(a)).join("") : `<div class="empty">None.</div>`}</div>`; }).join("");
  };
  function approvalCard(a) {
    const t = TEMPLATES[a.template] || { dir: "ltr", label: a.template };
    const lead = allLeads().find((l) => l.lead_id === a.lead_id) || {};
    return `<div class="card" style="box-shadow:none"><div class="card-head"><div><b>${esc(a.lead_name)}</b> <span class="small muted">· ${esc(t.label)} · drafted ${esc(a.created)}</span></div>${lead.source_url ? `<a href="${esc(lead.source_url)}" target="_blank" rel="noopener">Open contact route</a>` : ""}</div>
      <textarea dir="${t.dir}" data-appr-text="${a.id}" ${a.status !== "pending" ? "readonly" : ""}>${esc(a.text)}</textarea>
      <div class="btn-row" style="margin-top:8px">${a.status === "pending" ? `<button class="primary" data-appr="approve:${a.id}">Approve</button><button class="danger" data-appr="reject:${a.id}">Reject</button>` : ""}
      ${a.status === "approved" ? `<button data-appr="copy:${a.id}">Copy text</button><button class="primary" data-appr="sent:${a.id}">I sent it - mark as sent</button>` : ""}
      ${a.status === "sent" ? `<span class="small muted">Sent ${esc(a.sent)}</span>` : ""}${a.status === "rejected" ? `<button data-appr="reopen:${a.id}">Reopen</button>` : ""}</div></div>`;
  }

  R.timeline = () => {
    const start = new Date("2026-11-09"), total = TARGET_DATE - start, el = Math.max(0, new Date() - start);
    const nextIdx = (ST.milestones || []).findIndex((m) => !m.done);
    return head("Sales timeline to 30 September 2027", `${fmt(daysUntil(TARGET_DATE))} days left. Work back from the deadline: the developer NOC and DARI transfer need several weeks, so a signed MOU is needed by about the end of June 2027.`) +
      `<div class="card"><div class="progress"><i style="width:${Math.min(100, el / total * 100)}%"></i></div><div class="small muted">${(el / total * 100).toFixed(1)}% of the window used</div></div>
      <div class="grid g2"><div class="card"><h2>Milestones</h2><div class="timeline">${(ST.milestones || []).map((m, i) => { const late = !m.done && new Date(m.date) < new Date(); return `<div class="tl-item ${m.done ? "done" : i === nextIdx ? "next" : ""} ${late ? "late" : ""}"><label class="task"><input type="checkbox" data-ms="${i}" ${m.done ? "checked" : ""}><span><b>${esc(m.date)}</b> - ${esc(m.label)} ${late ? '<span class="pill bad"><span class="dot"></span>overdue</span>' : ""}</span></label></div>`; }).join("")}</div></div>
      <div class="card"><h2>Why the dates fall where they do</h2><ul>
        <li><b>Nov 2026:</b> nothing is quoted to a buyer until the SPA, statement of account and Radiant's resale/NOC policy are in hand.</li>
        <li><b>Dec 2026 – Feb 2027:</b> the 60-day campaign, with price reviews at day 30 and day 60.</li>
        <li><b>By Apr 2027:</b> aim for a signed MOU. This leaves room for one re-pricing round.</li>
        <li><b>By 30 Jun 2027:</b> last safe MOU date. After it, NOC and transfer delays can push you past September.</li>
        <li><b>1 Dec 2027:</b> listed completion. Selling well before it avoids you having to fund the 45% handover payment.</li></ul></div></div>`;
  };

  function calcOut(c) {
    const P = +c.sale_price || 0, orig = +c.original_price || 0, paid = (+c.paid_to_date || 0) + (+c.extra_paid_before_sale || 0);
    const premium = P - orig, comm = P * (+c.commission_pct || 0) / 100, vat = comm * (+c.vat_pct || 0) / 100;
    const regTotal = P * (+c.registration_fee_pct || 0) / 100, reg = regTotal * (+c.seller_registration_share_pct || 0) / 100;
    const costs = comm + vat + reg + (+c.noc_fee || 0) + (+c.other_costs || 0);
    const net = paid + premium - costs;
    return { P, paid, premium, comm, vat, reg, regBuyer: regTotal - reg, costs, net, netGain: net - paid, remaining: orig - paid, buyerUpfront: paid + premium, roi: paid ? (net - paid) / paid * 100 : 0 };
  }
  R.calculator = () => {
    const c = ST.calculator, o = calcOut(c);
    const f = (key, label, step = 1000, note = "") => `<label class="field">${esc(label)}<input type="number" step="${step}" data-calc="${key}" value="${c[key] == null ? "" : c[key]}">${note ? `<span class="small muted">${note}</span>` : ""}</label>`;
    const row = (k, v, b) => `<tr${b ? ' style="font-weight:600"' : ""}><td>${k}</td><td class="r num">${v}</td></tr>`;
    return head("Cash proceeds calculator", "How an off-plan resale pays out: the buyer refunds what you have paid Radiant, pays you the premium over your original price, and takes over the rest of the payment plan.") +
      `<div class="grid g2"><div class="card"><h2>Inputs</h2><div class="grid g2">
        ${f("sale_price", "Agreed sale price (AED)", 10000)}${f("original_price", "Your original price (AED)", 1000, "Verify on SPA")}
        ${f("paid_to_date", "Paid to Radiant so far (AED)", 1000, "Verify on statement of account")}${f("extra_paid_before_sale", "Further instalments you'll pay before the sale (AED)", 1000)}
        ${f("commission_pct", "Your broker commission %", 0.25, "Market norm 2%")}${f("vat_pct", "VAT on commission %", 1)}
        ${f("registration_fee_pct", "DARI registration fee % of price", 0.25, "Cited as 2%; not confirmed officially")}${f("seller_registration_share_pct", "Your share of that fee %", 5, "0 = buyer pays, 50 = split")}
        ${f("noc_fee", "Developer NOC / admin fee (AED)", 500, "Ask Radiant")}${f("other_costs", "Other costs (AED)", 500)}
        ${f("size_sqft", "Your unit size (sqft)", 1, "Used by the pricing tab")}</div></div>
      <div class="card"><h2>Result</h2><table><tbody>
        ${row("Refund of amount paid", aed(o.paid))}${row("Premium over original price", aed(o.premium))}
        ${row("Broker commission", "− " + aed(o.comm))}${row("VAT on commission", "− " + aed(o.vat))}${row("Your share of DARI fee", "− " + aed(o.reg))}${row("NOC + other costs", "− " + aed((+c.noc_fee || 0) + (+c.other_costs || 0)))}
        ${row("Cash you receive", aed(o.net), true)}${row("Net gain over cash invested", aed(o.netGain) + ` (${o.roi.toFixed(1)}%)`, true)}</tbody></table>
        <h3 style="margin-top:14px">The buyer's side</h3><table><tbody>${row("Cash to you at transfer", aed(o.buyerUpfront))}${row("Buyer's share of DARI fee", aed(o.regBuyer))}${row("Balance they take over with Radiant", aed(o.remaining))}</tbody></table>
        ${o.premium < 0 ? `<div class="callout bad" style="margin-top:10px">Below your original price: this is a loss on the premium.</div>` : ""}
        <p class="small muted" style="margin-top:8px">Mortgage, service charges and capital gains do not apply here: the UAE has no personal capital gains tax and you don't own a completed unit yet. Confirm fees with Radiant, DARI and your broker before signing.</p></div></div>
      <div class="card"><h2>Sensitivity</h2><table><thead><tr><th>Sale price</th><th class="r">Cash you receive</th><th class="r">Net gain</th><th class="r">Buyer upfront cash</th></tr></thead><tbody>
        ${[3000000, 3100000, 3200000, 3250000, 3300000, 3350000, 3400000, 3450000, 3500000].map((p) => { const x = calcOut({ ...c, sale_price: p }); return `<tr><td>${aed(p)}</td><td class="r num">${fmt(x.net)}</td><td class="r num">${fmt(x.netGain)}</td><td class="r num">${fmt(x.buyerUpfront)}</td></tr>`; }).join("")}</tbody></table></div>`;
  };

  R.refresh = () => {
    const logs = D.refresh_log || [], last = logs[0] || {};
    const fl = last.flags || [];
    const groups = {}; fl.forEach((f) => (groups[f.type] = groups[f.type] || []).push(f));
    const notes = (D.market || {}).capability_notes || [];
    return head("Research refresh", "Re-reads Property Finder (listings, project page, agent profiles), flags what changed and re-scores brokers. Social platforms are covered by the manual research prompt in RESEARCH_PROMPT.md.",
      MODE === "server" ? `<button class="primary" id="run-refresh">Run refresh now</button>` : "") +
      (MODE !== "server" ? `<div class="callout warn">This is a published snapshot. To refresh, run <code>python3 scripts/refresh.py</code> or start the local server and use this button.</div>` : "") +
      `<div id="refresh-out"></div>
      <div class="grid g2"><div class="card"><h2>Last run</h2><dl class="kv"><dt>Started</dt><dd>${esc(last.started_at || "-")}</dd><dt>Finished</dt><dd>${esc(last.finished_at || "-")}</dd><dt>Steps OK</dt><dd>${(last.steps || []).filter((s) => s.ok).length}/${(last.steps || []).length}</dd><dt>Errors</dt><dd>${(last.errors || []).map(esc).join("<br>") || "none"}</dd></dl>
        <h3>Flags</h3>${Object.keys(groups).length ? Object.entries(groups).map(([k, v]) => `<details><summary>${esc(k.replace(/_/g, " "))} (${v.length})</summary><table><tbody>${v.slice(0, 60).map((f) => `<tr><td class="small">${esc(f.bedrooms ? (f.bedrooms === "studio" ? "Studio" : f.bedrooms + "BR") : f.name || "")}</td><td class="small num">${f.price_aed ? fmt(f.price_aed) : f.to ? fmt(f.from) + " → " + fmt(f.to) : ""}</td><td class="small">${esc(f.broker || f.note || "")}</td><td>${f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">open</a>` : ""}</td></tr>`).join("")}</tbody></table></details>`).join("") : `<div class="empty">No flags.</div>`}</div>
      <div class="card"><h2>What this system can and cannot reach</h2><ul>${notes.map((n) => `<li class="small">${esc(n)}</li>`).join("")}</ul>
        <h3 style="margin-top:10px">Run history</h3><table><tbody>${logs.map((l) => `<tr><td class="small">${esc(l.finished_at)}</td><td class="small">${(l.steps || []).filter((s) => s.ok).length}/${(l.steps || []).length} ok</td><td class="small">${(l.flags || []).length} flags</td></tr>`).join("")}</tbody></table>
        <p class="small muted" style="margin-top:8px">No recurring schedule is configured. Refreshes run only when you start them.</p></div></div>`;
  };

  // ---------- lead drawer ----------
  function openLead(id) {
    const l = allLeads().find((x) => x.lead_id === id); if (!l) return;
    const st = statusOf(id), can = approvedFor(id);
    const appr = (ST.approvals || []).filter((a) => a.lead_id === id);
    const price = Math.round(ST.calculator.list_price || 3450000);
    $("#drawer").innerHTML = `<div class="card-head"><h2>${esc(l.name)}</h2><button id="close-drawer">Close</button></div>
      <div class="btn-row">${statusPill(st)} <span class="pill">${esc(l.category)}</span> <span class="pill">${esc(l.match || "")} match</span></div>
      <dl class="kv"><dt>Lead ID</dt><dd>${esc(l.lead_id)}</dd><dt>Contact person</dt><dd>${esc(l.contact_person || "-")}</dd><dt>Licence</dt><dd>${esc(l.licence_no || "not shown")}</dd>
        <dt>Platform</dt><dd>${esc(l.platform)}</dd><dt>Source</dt><dd><a href="${esc(l.source_url)}" target="_blank" rel="noopener">${esc(l.source_url)}</a></dd>
        ${l.profile_url ? `<dt>Agent profile</dt><dd><a href="${esc(l.profile_url)}" target="_blank" rel="noopener">${esc(l.profile_url)}</a></dd>` : ""}
        <dt>Contact channel</dt><dd>${esc(l.contact_channel || "-")}</dd><dt>Budget</dt><dd>${esc(l.budget || "not disclosed")}</dd><dt>Preferences</dt><dd>${esc(l.preferences || "-")}</dd>
        <dt>Last active</dt><dd>${esc(l.interest_date || "-")}</dd><dt>Languages</dt><dd>${esc((l.languages || []).join(", ") || "-")}</dd>
        <dt>Score</dt><dd>${scoreCell(l.score)}</dd><dt>Intent</dt><dd>${esc(l.intent || "-")}</dd><dt>Confidence</dt><dd>${esc(l.confidence || "-")}</dd><dt>Last verified</dt><dd>${esc(l.last_verified || "-")}</dd></dl>
      <h3>Evidence</h3><ul class="small">${(l.evidence || []).map((e) => `<li>${esc(e)}</li>`).join("")}</ul>
      <h3>Recommended approach</h3><p class="small">${esc(l.outreach || "-")}</p>
      <h3 style="margin-top:12px">Status</h3><select id="lead-status">${STAGES.map((s) => `<option ${s === st ? "selected" : ""} ${CONTACT_GATED.has(s) && !can ? "disabled" : ""}>${s}</option>`).join("")}</select>
      ${!can ? `<p class="small muted">Contact stages unlock after you approve a message for this lead.</p>` : ""}
      <h3 style="margin-top:12px">Draft a message</h3><div class="btn-row"><select id="tpl">${Object.entries(TEMPLATES).map(([k, t]) => `<option value="${k}">${esc(t.label)}</option>`).join("")}</select>
        <label class="field" style="flex-direction:row;align-items:center">Price <input type="number" id="tpl-price" step="10000" value="${price}" style="width:130px"></label><button class="primary" id="draft">Draft message</button></div>
      ${appr.length ? `<p class="small muted" style="margin-top:6px">${appr.length} message(s) for this lead in <a href="#approvals">Approvals</a>.</p>` : ""}
      <h3 style="margin-top:12px">Notes</h3><textarea id="lead-notes" style="min-height:90px">${esc((ST.lead_notes || {})[id] || "")}</textarea>`;
    $("#drawer").classList.add("open"); $("#drawer-bg").classList.add("open");
    $("#close-drawer").onclick = closeDrawer;
    $("#lead-status").onchange = (e) => { ST.lead_status[id] = e.target.value; save(); render(); toast("Status updated"); };
    $("#lead-notes").oninput = (e) => { ST.lead_notes = ST.lead_notes || {}; ST.lead_notes[id] = e.target.value; save(); };
    $("#draft").onclick = () => {
      const key = $("#tpl").value, p = +$("#tpl-price").value || price;
      ST.calculator.list_price = p;
      ST.approvals.push({ id: uid(), lead_id: id, lead_name: l.name, template: key, channel: TEMPLATES[key].label, text: fillTemplate(key, l, p), status: "pending", created: today() });
      save(); toast("Draft added to Approvals"); closeDrawer(); location.hash = "#approvals";
    };
  }
  function closeDrawer() { $("#drawer").classList.remove("open"); $("#drawer-bg").classList.remove("open"); }

  function addLeadForm() {
    $("#drawer").innerHTML = `<div class="card-head"><h2>Add a lead you found</h2><button id="close-drawer">Close</button></div>
      <p class="small">Only add a lead you can point to. A direct buyer or investor needs a public post or a message from them, with a link and their own words.</p>
      <div class="grid" style="gap:10px">
        <label class="field">Name or public identifier *<input id="f-name"></label>
        <label class="field">Category *<select id="f-cat"><option>Direct Buyer</option><option>Investor</option><option>Buyer's Agent</option><option>Broker</option></select></label>
        <label class="field">Platform *<input id="f-plat" placeholder="Facebook group, LinkedIn, Dubizzle, referral…"></label>
        <label class="field">Source URL *<input id="f-url" placeholder="https://…"></label>
        <label class="field">Their words / evidence of intent *<textarea id="f-ev" style="min-height:80px"></textarea></label>
        <label class="field">Date they expressed interest *<input id="f-date" type="date"></label>
        <label class="field">Budget (only if they stated it)<input id="f-budget"></label>
        <label class="field">Preferences (only if stated)<input id="f-pref"></label>
        <label class="field">Public contact channel<input id="f-chan"></label>
        <label class="field">Your score 0–100<input id="f-score" type="number" min="0" max="100" value="50"></label>
        <button class="primary" id="f-save">Save lead</button></div>`;
    $("#drawer").classList.add("open"); $("#drawer-bg").classList.add("open");
    $("#close-drawer").onclick = closeDrawer;
    $("#f-save").onclick = () => {
      const v = (s) => $(s).value.trim();
      if (!v("#f-name") || !/^https?:\/\//.test(v("#f-url")) || !v("#f-ev") || !v("#f-date")) { toast("Name, a source URL, evidence and date are required"); return; }
      const cat = v("#f-cat");
      ST.custom_leads.push({ lead_id: (cat === "Broker" ? "BRK" : cat === "Buyer's Agent" ? "AGT" : cat === "Investor" ? "INV" : "BUY") + "-M-" + uid().toUpperCase(), name: v("#f-name"), category: cat, platform: v("#f-plat"), source_url: v("#f-url"),
        evidence: [v("#f-ev")], interest_date: v("#f-date"), budget: v("#f-budget") || null, preferences: v("#f-pref") || null, contact_channel: v("#f-chan") || null,
        score: Math.max(0, Math.min(100, +v("#f-score") || 0)), match: "Medium", intent: cat === "Direct Buyer" || cat === "Investor" ? "Expressed buying intent (owner-logged)" : "Broker activity",
        confidence: "Owner-logged; verify before contact", outreach: "Respond on the channel where they posted; share the fact sheet after approval.", last_verified: today(), auto: false });
      save(); closeDrawer(); render(); toast("Lead added");
    };
  }

  // ---------- render & events ----------
  function render() {
    const page = (location.hash || "#overview").slice(1);
    const p = PAGES.find(([k]) => k === page) ? page : "overview";
    $("#nav").innerHTML = PAGES.map(([k, t]) => `<a href="#${k}" class="${k === p ? "active" : ""}">${t}${k === "approvals" && pendingApprovals() ? `<span class="badge">${pendingApprovals()}</span>` : ""}</a>`).join("");
    $("#main").innerHTML = R[p]();
    if (R[p].after) R[p].after();
    $("#side-foot").innerHTML = `Data as of ${esc((((D.comparables || {}).radiant_marina_fetched_at) || "").slice(0, 10))}<div class="mode-banner">${MODE === "server" ? "Local server: changes are saved to data/state.json" : "Snapshot: changes are kept in this browser only"}</div><button id="theme">Toggle theme</button>`;
    bind(p);
  }
  function bind(p) {
    document.querySelectorAll("[data-lead]").forEach((el) => el.addEventListener("click", () => openLead(el.dataset.lead)));
    const th = $("#theme"); if (th) th.onclick = () => { const r = document.documentElement; const dark = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; r.dataset.theme = dark ? "light" : "dark"; try { localStorage.setItem("rm-theme", r.dataset.theme); } catch (e) { /* ignore */ } };
    if (p === "database") {
      const q = $("#db-q"); q.oninput = () => { ui.dbSearch = q.value; const pos = q.selectionStart; render(); const n = $("#db-q"); n.focus(); n.setSelectionRange(pos, pos); };
      $("#db-cat").onchange = (e) => { ui.dbCat = e.target.value; render(); };
      $("#db-match").onchange = (e) => { ui.dbMatch = e.target.value; render(); };
      document.querySelectorAll("[data-sort]").forEach((el) => (el.onclick = () => { const k = el.dataset.sort; ui.dbSort = [k, ui.dbSort[0] === k ? -ui.dbSort[1] : -1]; render(); }));
      $("#add-lead").onclick = addLeadForm;
    }
    if (p === "comparables") {
      $("#comp-beds").onchange = (e) => { ui.compBeds = e.target.value; render(); };
      document.querySelectorAll("[data-csort]").forEach((el) => (el.onclick = () => { const k = el.dataset.csort; ui.compSort = [k, ui.compSort[0] === k ? -ui.compSort[1] : 1]; render(); }));
    }
    if (p === "campaigns") {
      document.querySelectorAll("[data-task]").forEach((el) => (el.onchange = () => { const [c, t] = el.dataset.task.split(":"); ST.campaigns[c].tasks[t].done = el.checked; save(); render(); }));
      document.querySelectorAll("[data-camp-status]").forEach((el) => (el.onchange = () => { ST.campaigns[el.dataset.campStatus].status = el.value; save(); }));
    }
    if (p === "timeline") document.querySelectorAll("[data-ms]").forEach((el) => (el.onchange = () => { ST.milestones[el.dataset.ms].done = el.checked; save(); render(); }));
    if (p === "calculator") document.querySelectorAll("[data-calc]").forEach((el) => (el.onchange = () => { const v = el.value === "" ? null : +el.value; ST.calculator[el.dataset.calc] = v; save(); render(); }));
    if (p === "approvals") {
      document.querySelectorAll("[data-appr-text]").forEach((el) => (el.oninput = () => { const a = ST.approvals.find((x) => x.id === el.dataset.apprText); a.text = el.value; save(); }));
      document.querySelectorAll("[data-appr]").forEach((el) => (el.onclick = async () => {
        const [act, id] = el.dataset.appr.split(":"); const a = ST.approvals.find((x) => x.id === id);
        if (act === "approve") { a.status = "approved"; a.approved = today(); if (statusOf(a.lead_id) === "Identified") ST.lead_status[a.lead_id] = "Approved to contact"; }
        if (act === "reject") a.status = "rejected";
        if (act === "reopen") a.status = "pending";
        if (act === "copy") { try { await navigator.clipboard.writeText(a.text); toast("Copied"); } catch (e) { toast("Copy failed - select the text manually"); } return; }
        if (act === "sent") { a.status = "sent"; a.sent = today(); ST.outreach_log.push({ date: today(), lead_id: a.lead_id, lead_name: a.lead_name, channel: a.channel, text: a.text }); ST.lead_status[a.lead_id] = "Contacted"; }
        save(); render();
      }));
    }
    if (p === "refresh" && $("#run-refresh")) $("#run-refresh").onclick = async (e) => {
      e.target.disabled = true; e.target.textContent = "Running… (about 1–2 minutes)";
      try { const r = await fetch("/api/refresh", { method: "POST" }); const j = await r.json(); $("#refresh-out").innerHTML = `<div class="card"><h2>${j.ok ? "Refresh finished" : "Refresh had errors"}</h2><pre class="log">${esc(j.output || j.error)}</pre></div>`; await load(); render(); }
      catch (err) { toast("Refresh failed: " + err.message); e.target.disabled = false; }
    };
  }

  async function load() {
    if (window.__STATIC_DATA__) {
      MODE = "static"; D = window.__STATIC_DATA__;
      let saved = null; try { saved = JSON.parse(localStorage.getItem("rm-sale-desk-state") || "null"); } catch (e) { saved = null; }
      ST = saved || JSON.parse(JSON.stringify(D.state));
    } else {
      const r = await fetch("/api/all", { cache: "no-store" }); D = await r.json(); ST = D.state; MODE = "server";
    }
    ["lead_status", "lead_notes"].forEach((k) => (ST[k] = ST[k] || {}));
    ["approvals", "outreach_log", "custom_leads"].forEach((k) => (ST[k] = ST[k] || []));
  }

  try { const t = localStorage.getItem("rm-theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) { /* ignore */ }
  window.addEventListener("hashchange", () => { closeDrawer(); render(); });
  $("#drawer-bg").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
  load().then(render).catch((e) => { $("#main").innerHTML = `<div class="callout bad"><h3>Could not load data</h3>${esc(e.message)}. Start the server with <code>python3 server.py</code>.</div>`; });
})();
