# On-demand research workflow

The refresh has two halves, because no single tool reaches every source legitimately.

## Half 1: automated (Property Finder)

```bash
python3 scripts/refresh.py
```

Or press **Run refresh now** on the dashboard's *Research refresh* tab. It takes about 2 minutes and does the following:

- Re-reads every Radiant Marina Towers listing (two passes, because the portal's paging is unstable), every Al Reem 3BR listing and the project page.
- Re-reads the Property Finder profile of each agent holding a 2BR/3BR in the towers (licence, languages, claimed sales).
- Flags **new listings**, **price changes**, **removed listings** (only after a listing is missing from two runs in a row) and **new brokers**.
- Re-scores broker leads. Your pipeline statuses, notes and approvals are never overwritten.
- Writes `data/refresh_log.json` (shown in the dashboard) and a dated snapshot in `data/snapshots/`.

It only uses paths that Property Finder's robots.txt allows, waits 1.5 s between requests, and makes about 35 requests per run. Run it **weekly**, not more often.

**Not automated:** no recurring schedule is configured. If you want one later, run the script on your own computer with cron or Task Scheduler, or ask Claude to set up a scheduled cloud task, and test it before relying on it.

## Half 2: assisted (Claude + web search, plus you for logged-in sites)

Paste the prompt below into a Claude Code session opened on this repository. Claude can search the web but cannot log in to Facebook, LinkedIn or Instagram. The prompt therefore also gives you a short manual checklist for those sites.

```text
You are refreshing buyer and broker research for the owner of a 3BR off-plan apartment in
Radiant Marina Towers, Al Reem Island, Abu Dhabi (see radiant-marina/RESEARCH.md for context).

1. Run: python3 radiant-marina/scripts/refresh.py  and summarise the flags (new/removed 3BRs, price
   changes, new brokers).
2. Web-search in English AND Arabic for public buying requests posted in the last 30 days, e.g.
   "looking to buy 3 bedroom Reem Island", "Radiant Marina buyer", "client looking for 3BR Reem",
   "مطلوب شراء شقة ثلاث غرف جزيرة الريم", "مطلوب شقة للشراء الريم", "مستثمر يبحث عن شقة أبوظبي".
   Also search news for Radiant Marina construction progress / handover updates and new Abu Dhabi
   off-plan resale rules (ADREC, DARI).
3. Only record a lead if there is a public URL, an identifiable poster, a date and the poster's own
   words showing buying intent. Never invent or infer leads. Put anything doubtful under
   "rejected_candidates" in radiant-marina/data/leads.json with the reason.
4. Append verified leads to the "manual" array in radiant-marina/data/leads.json using the same fields as
   existing leads (lead_id prefix BUY-/INV-/AGT-/BRK-, category, platform, source_url, evidence,
   interest_date, budget only if stated, contact_channel, score, match, intent, confidence,
   outreach, last_verified). Add each executed query to market.json "buyer_intent_search_log".
5. Do not contact anyone, post anything or send any message. Report what you found, with links, and
   list which sources you could not reach.
```

### Manual checklist for logged-in platforms (about 20 minutes a week)

| Platform | Where | Search for | Log it if |
|---|---|---|---|
| Facebook | Search Groups for "Abu Dhabi property investors", "Al Reem Island", "Abu Dhabi real estate" (these are search terms, not verified group names). Join 3–5 active ones. | `Reem 3 bedroom`, `Radiant`, `looking to buy`, `مطلوب الريم` | Someone asks to buy and gives a budget, area or timeframe |
| Facebook Marketplace | Property → Abu Dhabi | `Radiant Marina` | Watch competing owner listings and prices |
| LinkedIn | Posts search, past month | `Reem Island 3BR client`, `requirement Reem Island` | A broker posts a buyer requirement that matches |
| Instagram | Hashtags `#reemisland` `#abudhabirealestate` | Broker "requirement" stories | Same as above |
| Dubizzle / Bayut / Property Finder | Your saved search for Radiant Marina 3BR | New listings or price cuts | (the automated refresh covers Property Finder) |

Add anything you find in the dashboard via **Broker & investor DB → Add a lead you found**. The form will not save without a source link, the poster's words and a date.
