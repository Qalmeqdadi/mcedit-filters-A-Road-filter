#!/usr/bin/env python3
"""On-demand market & broker refresh for the Radiant Marina sale dashboard.

What it does (only public pages that Property Finder's robots.txt allows):
  1. Every listing in Radiant Marina Towers (building SEO page + ?page=N).
  2. Every 3-bedroom listing on Al Reem Island (SEO page + ?page=N), kept as off-plan comparables.
  3. The Radiant Marina Towers new-projects page (delivery date, payment plans, launch prices).
  4. The public profile of every agent holding a 2BR/3BR Radiant Marina listing
     (licence number, languages, claimed sales on Al Reem Island).
Then it diffs against the previous run and flags new listings, removed listings and price changes,
and refreshes the auto-generated broker leads. Manual lead edits and pipeline state are never touched.

It does NOT read Facebook, LinkedIn, Reddit, Bayut or Dubizzle: those need a login or block automated
clients. Buyer-request discovery for those platforms is done with the research prompt in
RESEARCH_PROMPT.md (Claude + web search) and logged in data/manual_findings.json.

Usage:  python3 scripts/refresh.py [--max-reem-pages 7] [--skip-agents]
Requires outbound HTTPS to www.propertyfinder.ae.
"""
import argparse, datetime as dt, json, os, re, sys, time, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
PF = "https://www.propertyfinder.ae"
BUILDING = PF + "/en/buy/abu-dhabi/properties-for-sale-al-reem-island-shams-abu-dhabi-radiant-marina-towers.html"
REEM_3BR = PF + "/en/buy/abu-dhabi/3-bedroom-apartments-for-sale-al-reem-island.html"
PROJECT = PF + "/en/new-projects/radiant-enterprises-real-estate/radiant-marina-towers"
RM_LOCATION_ID = "14586"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
DELAY = 1.5  # seconds between requests


def now():
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en"})
    with urllib.request.urlopen(req, timeout=40) as r:
        body = r.read().decode("utf-8", "replace")
    time.sleep(DELAY)
    return body


def next_data(html):
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        raise ValueError("page has no embedded data (layout changed or request blocked)")
    return json.loads(m.group(1))["props"]["pageProps"]


def parse_listing(l):
    pr = l.get("property") or {}
    if not pr:
        return None
    size = (pr.get("size") or {}).get("value")
    price = (pr.get("price") or {}).get("value")
    loc = pr.get("location") or {}
    agent = pr.get("agent") or {}
    broker = pr.get("broker") or {}
    desc = pr.get("description") or ""
    view = next((v for v in ["Full Sea", "Sea", "Canal", "Marina", "Mangrove", "City"]
                 if re.search(v + r"\s*View", (pr.get("title") or "") + " " + desc, re.I)), None)
    floor = None
    fm = re.search(r"\b(High|Mid|Low)[\s-]*floor", (pr.get("title") or "") + " " + desc, re.I)
    if fm:
        floor = fm.group(1).capitalize()
    plan = None
    pm = re.search(r"\b(\d{2})\s*/\s*(\d{2})\b", (pr.get("title") or "") + " " + desc)
    if pm and int(pm.group(1)) + int(pm.group(2)) == 100:
        plan = f"{pm.group(1)}/{pm.group(2)}"
    return {
        "id": pr.get("id"),
        "source": "Property Finder",
        "url": pr.get("share_url"),
        "title": (pr.get("title") or "").strip(),
        "tower": loc.get("name"),
        "location_id": loc.get("id"),
        "bedrooms": pr.get("bedrooms"),
        "bathrooms": pr.get("bathrooms"),
        "size_sqft": size,
        "price_aed": price,
        "ppsf": round(price / size) if price and size else None,
        "completion_status": pr.get("completion_status"),
        "view_hint": view,
        "floor_hint": floor,
        "payment_plan_hint": plan,
        "listed_date": (pr.get("listed_date") or "")[:10],
        "agent": (agent.get("name") or "").strip(),
        "agent_id": agent.get("id"),
        "agent_slug": agent.get("slug"),
        "super_agent": agent.get("is_super_agent"),
        "agent_languages": agent.get("languages") or [],
        "broker": broker.get("name"),
        "broker_slug": broker.get("slug"),
        "permit": pr.get("rera"),
        "verified_listing": pr.get("is_verified"),
        "price_type": "asking",
        "building_check": ("Listing text names a different Radiant building and never says Radiant Marina - "
                           "confirm the unit really is in " + str(loc.get("name")))
                          if re.search(r"radiant (square|viewz|elite|garden|waves)", desc, re.I)
                          and not re.search(r"radiant marina", desc, re.I) else None,
    }


def crawl_search(base, max_pages):
    out, seen, total = [], set(), None
    for page in range(1, max_pages + 1):
        url = base if page == 1 else f"{base}?page={page}"
        pp = next_data(get(url))
        sr = pp.get("searchResult") or {}
        meta = sr.get("meta") or {}
        total = meta.get("total_count", total)
        rows = [parse_listing(l) for l in sr.get("listings", [])]
        rows = [r for r in rows if r and r["id"] not in seen]
        for r in rows:
            seen.add(r["id"])
        out.extend(rows)
        if page >= (meta.get("page_count") or 1) or not rows:
            break
    return out, total


def project_facts():
    pp = next_data(get(PROJECT))
    d = pp.get("detailResult") or {}
    units = []
    for grp in d.get("units") or []:
        for u in grp.get("units") or []:
            for x in u.get("list") or []:
                units.append({"bedrooms": x.get("bedrooms"), "area_sqft": x.get("areaFrom"),
                              "launch_price_from": x.get("startingPrice")})
    plans = []
    for p in d.get("paymentPlans") or []:
        plans.append({"title": p.get("title"),
                      "phases": {ph.get("label"): ph.get("value") for ph in p.get("phases") or []}})
    return {
        "source_url": PROJECT,
        "fetched_at": now(),
        "developer": (d.get("developer") or {}).get("name"),
        "delivery_date": (d.get("deliveryDate") or "")[:10],
        "sales_phase": d.get("salesPhase"),
        "starting_price": d.get("startingPrice"),
        "min_resale_price": d.get("minResalePrice"),
        "timeline": [{"title": t.get("title") or t.get("phaseKey"), "date": (t.get("rawDate") or "")[:10],
                      "completed": t.get("completed")} for t in d.get("timelinePhases") or []],
        "launch_units": units,
        "payment_plans": plans,
        "historical_transactions": pp.get("historicalTransactions"),
    }


def agent_profile(agent_id, slug):
    url = f"{PF}/en/agent/{slug}-{agent_id}"
    pp = next_data(get(url))
    a = pp.get("agent") or {}
    if not a.get("name"):
        raise ValueError(f"agent profile {agent_id} is empty or inactive")
    sales = []
    for t in a.get("claimedTransactionsList") or []:
        loc = t.get("location") or {}
        if t.get("dealType") == "Sale" and loc.get("community") == "Al Reem Island":
            sales.append({"tower": loc.get("tower"), "bedrooms": t.get("bedroom"), "price_aed": t.get("price"),
                          "date": t.get("date"), "property_type": t.get("propertyType")})
    return {
        "agent_id": agent_id, "name": (a.get("name") or "").strip(), "profile_url": url,
        "position": a.get("position"), "licence_no": a.get("licenseNumber") or None,
        "experience_since": a.get("experienceSince"), "super_agent": a.get("superagent"),
        "languages": [x.get("name") for x in a.get("languages") or []],
        "nationality": (a.get("nationality") or {}).get("name"),
        "linkedin": a.get("linkedinAddress") or None,
        "total_listings": a.get("totalProperties"),
        "claimed_sales_count": a.get("claimedTransactionsSale"),
        "claimed_sales_avg_aed": a.get("claimedTransactionsSaleAVGAmount"),
        "rating": a.get("averageRating"),
        "reem_claimed_sales": sales,
    }


def load(name, default):
    p = os.path.join(DATA, name)
    if os.path.exists(p):
        with open(p, encoding="utf8") as f:
            return json.load(f)
    return default


def save(name, obj):
    with open(os.path.join(DATA, name), "w", encoding="utf8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)


def diff(prev, cur, missing_prev):
    """Compare runs. Portal pagination is not stable (the site reports more listings than paging returns),
    so a listing only counts as removed after it is missing from two consecutive runs."""
    pm = {l["id"]: l for l in prev}
    cm = {l["id"]: l for l in cur}
    flags, missing = [], {}
    for i, l in cm.items():
        if i not in pm and i not in missing_prev:
            flags.append({"type": "new_listing", "id": i, "bedrooms": l["bedrooms"], "price_aed": l["price_aed"],
                          "size_sqft": l["size_sqft"], "broker": l["broker"], "url": l["url"]})
        elif i in pm and pm[i]["price_aed"] != l["price_aed"]:
            flags.append({"type": "price_change", "id": i, "bedrooms": l["bedrooms"], "from": pm[i]["price_aed"],
                          "to": l["price_aed"], "broker": l["broker"], "url": l["url"]})
    for i, l in {**pm, **missing_prev}.items():
        if i in cm:
            continue
        runs = missing_prev.get(i, {}).get("missing_runs", 0) + 1
        if runs >= 2:
            flags.append({"type": "removed_listing", "id": i, "bedrooms": l["bedrooms"], "price_aed": l["price_aed"],
                          "broker": l["broker"], "url": l["url"],
                          "note": "Missing in 2 consecutive runs: sold, withdrawn or expired. Not proof of a sale."})
        else:
            missing[i] = {**l, "missing_runs": runs}
    return flags, missing


def score_broker(agency, listings, profiles):
    """Lead score 0-100 for a brokerage, from verifiable activity only."""
    big = [l for l in listings if l["bedrooms"] in ("2", "3")]
    three = [l for l in listings if l["bedrooms"] == "3"]
    agents = {l["agent_id"] for l in listings}
    profs = [profiles[a] for a in agents if a in profiles]
    radiant_sales = [s for p in profs for s in p["reem_claimed_sales"]
                     if s["tower"] and "Radiant" in s["tower"]]
    big_sales = [s for p in profs for s in p["reem_claimed_sales"] if s["bedrooms"] in ("3", "4")]
    langs = {lang for l in listings for lang in l["agent_languages"]}
    s = 0
    s += min(len(listings), 16) * 1.5          # depth of presence in the tower (max 24)
    s += min(len(three), 2) * 10                # actively marketing a competing 3BR (max 20)
    s += min(len(big) - len(three), 2) * 4      # 2BR family-size stock (max 8)
    s += min(len(radiant_sales), 4) * 4         # claimed sales in Radiant buildings (max 16)
    s += min(len(big_sales), 2) * 8             # claimed 3BR+ sales on Reem (max 16)
    s += 6 if any(p.get("super_agent") for p in profs) or any(l["super_agent"] for l in listings) else 0
    s += 5 if len(langs - {"English", "Arabic"}) else 0  # reach beyond EN/AR (Russian, Hindi, ...)
    s += 5 if any(p.get("licence_no") for p in profs) else 0
    return min(round(s), 100), radiant_sales, big_sales, sorted(langs)


def build_broker_leads(rm, profiles, today):
    by = {}
    for l in rm:
        by.setdefault(l["broker"], []).append(l)
    leads = []
    for agency, ls in by.items():
        score, rs, bs, langs = score_broker(agency, ls, profiles)
        three = [l for l in ls if l["bedrooms"] == "3"]
        rank = {"3": 0, "2": 1}
        best = sorted(ls, key=lambda l: (rank.get(l["bedrooms"], 2), l["listed_date"] or ""))
        contact_agent = (best[0]["agent"], best[0]["agent_id"]) if best else (None, None)
        prof = profiles.get(contact_agent[1]) if contact_agent[1] else None
        evidence = [f"{len(ls)} active listing(s) in Radiant Marina Towers"]
        if three:
            evidence.append("Marketing 3BR at " + ", ".join(f"AED {l['price_aed']:,}" for l in three))
        if rs:
            bed_rank = {"4": 0, "3": 1, "2": 2, "1": 3}
            rs = sorted(rs, key=lambda x: (bed_rank.get(x["bedrooms"], 4), x["date"] or ""), reverse=False)
            evidence.append("Agent-claimed Radiant sales: " + "; ".join(
                f"{'Studio' if x['bedrooms'] == 'studio' else x['bedrooms'] + 'BR'} {x['tower']} AED {x['price_aed']:,} ({x['date']})" for x in rs[:4]))
        leads.append({
            "lead_id": "BRK-" + re.sub(r"[^A-Z0-9]", "", (agency or "UNK").upper())[:10],
            "name": agency,
            "contact_person": contact_agent[0],
            "category": "Broker",
            "platform": "Property Finder",
            "source_url": best[0]["url"] if best else ls[0]["url"],
            "profile_url": prof["profile_url"] if prof else None,
            "licence_no": prof["licence_no"] if prof else None,
            "budget": None,
            "preferences": "Lists Radiant Marina stock; 3BR" if three else "Lists Radiant Marina stock",
            "interest_date": max(l["listed_date"] for l in ls),
            "contact_channel": "Property Finder agent profile / listing enquiry form",
            "languages": langs,
            "match": "High" if three else ("Medium" if any(l["bedrooms"] == "2" for l in ls) else "Low"),
            "intent": "Broker activity (not a buyer)",
            "score": score,
            "confidence": "High - read from live portal data" if prof else "Medium - listing data only",
            "evidence": evidence,
            "outreach": ("Offer a co-broke/exclusive on a 3BR priced against their own listing; ask whether they "
                         "hold buyers who enquired on their 3BR.") if three else
                        ("Ask if any 2BR/1BR enquirers want to upsize to 3BR; offer standard 2% co-broke."),
            "auto": True,
            "last_verified": today,
        })
    leads.sort(key=lambda x: -x["score"])
    return leads


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-reem-pages", type=int, default=7)
    ap.add_argument("--max-building-pages", type=int, default=10)
    ap.add_argument("--skip-agents", action="store_true")
    a = ap.parse_args()
    today = dt.date.today().isoformat()
    log = {"started_at": now(), "steps": [], "flags": [], "errors": []}

    def step(name, fn):
        try:
            r = fn()
            log["steps"].append({"step": name, "ok": True})
            return r
        except (urllib.error.URLError, ValueError, TimeoutError, OSError) as e:
            log["steps"].append({"step": name, "ok": False, "error": str(e)})
            log["errors"].append(f"{name}: {e}")
            return None

    comps = load("comparables.json", {})
    prev_rm = [l for l in comps.get("radiant_marina", []) if not l.get("not_seen_last_run")]

    def crawl_building_twice():
        # The portal's paging is not stable between requests, so two passes are merged.
        r1, total = crawl_search(BUILDING, a.max_building_pages)
        r2, _ = crawl_search(BUILDING, a.max_building_pages)
        seen = {r["id"] for r in r1}
        return r1 + [r for r in r2 if r["id"] not in seen], total

    rm = step("radiant_marina_listings", crawl_building_twice)
    reem = step("reem_3br_listings", lambda: crawl_search(REEM_3BR, a.max_reem_pages))
    proj = step("project_page", project_facts)

    if rm:
        rm_rows, rm_total = rm
        rm_rows = [r for r in rm_rows if r["location_id"] == RM_LOCATION_ID]
        log["flags"], comps["radiant_marina_unseen"] = diff(prev_rm, rm_rows, comps.get("radiant_marina_unseen", {}))
        # A listing missed once is kept (marked) until it is missed twice, so scores don't swing on paging noise.
        comps["radiant_marina"] = rm_rows + [{**l, "not_seen_last_run": True}
                                             for l in comps["radiant_marina_unseen"].values()]
        comps["radiant_marina_total_reported"] = rm_total
        comps["radiant_marina_fetched_at"] = now()
    if reem:
        reem_rows, reem_total = reem
        comps["reem_3br"] = [r for r in reem_rows if r["bedrooms"] == "3"]
        comps["reem_3br_total_reported"] = reem_total
        comps["reem_3br_fetched_at"] = now()
    if proj:
        comps["project"] = proj
    save("comparables.json", comps)

    profiles = {p["agent_id"]: p for p in load("agents.json", [])}
    if rm and not a.skip_agents:
        targets = {(l["agent_id"], l["agent_slug"]) for l in comps["radiant_marina"] if l["bedrooms"] in ("2", "3")}
        for aid, slug in sorted(targets):
            p = step(f"agent_{aid}", lambda aid=aid, slug=slug: agent_profile(aid, slug))
            if p:
                p["fetched_at"] = now()
                profiles[aid] = p
        save("agents.json", sorted(profiles.values(), key=lambda p: p["name"]))
        txs = []
        for p in profiles.values():
            for s in p["reem_claimed_sales"]:
                txs.append({**s, "agent": p["name"], "agent_profile": p["profile_url"],
                            "price_type": "agent-claimed sale (Property Finder), not registry-verified"})
        txs.sort(key=lambda t: t["date"] or "", reverse=True)
        save("claimed_transactions.json", txs)

    if comps.get("radiant_marina"):
        leads = load("leads.json", {"manual": [], "auto": []})
        old = {l["lead_id"]: l for l in leads.get("auto", [])}
        new = build_broker_leads(comps["radiant_marina"], profiles, today)
        for l in new:
            if l["lead_id"] not in old:
                log["flags"].append({"type": "new_broker", "lead_id": l["lead_id"], "name": l["name"],
                                     "score": l["score"]})
        leads["auto"] = new
        leads["auto_generated_at"] = now()
        save("leads.json", leads)

    log["finished_at"] = now()
    os.makedirs(os.path.join(DATA, "snapshots"), exist_ok=True)
    with open(os.path.join(DATA, "snapshots", f"{today}.json"), "w", encoding="utf8") as f:
        json.dump({"log": log, "radiant_marina": comps.get("radiant_marina", [])}, f, ensure_ascii=False)
    history = load("refresh_log.json", [])
    history.insert(0, log)
    save("refresh_log.json", history[:50])
    ok = sum(s["ok"] for s in log["steps"])
    print(f"refresh: {ok}/{len(log['steps'])} steps ok, {len(log['flags'])} flags")
    for fl in log["flags"][:30]:
        print("  FLAG", json.dumps(fl, ensure_ascii=False))
    for e in log["errors"]:
        print("  ERROR", e)
    return 0 if not log["errors"] else 1


if __name__ == "__main__":
    sys.exit(main())
