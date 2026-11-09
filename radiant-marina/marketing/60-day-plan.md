# 60-day marketing and lead-conversion plan

**Window:** 10 Nov 2026 → 13 Feb 2027. This is two weeks of preparation, then 60 days of active marketing.
**Goal:** a signed MOU by 30 Apr 2027 at the latest, so there is time for the NOC and DARI transfer before 30 Sep 2027.
**Rule:** nothing is published or sent without your approval. The dashboard's Approvals tab enforces this for messages.

The plan is mirrored in the dashboard (*Campaigns & outreach* and *Timeline*) so you can tick tasks off.

---

## Weeks −2 to 0 (10–23 Nov): Prepare. Nothing goes to market until this is done.

| # | Action | Output |
|---|---|---|
| 1 | Ask Radiant for: statement of account, resale/NOC policy (minimum % paid, fee, processing time) and the exact handover-payment terms | Written answers |
| 2 | Download the interim registration certificate from DARI | PDF |
| 3 | Confirm size, floor, view and parking from the SPA floor plan; enter them in `data/property.json` and the calculator | Real figures in all ads |
| 4 | Choose the price band with the dashboard's Pricing tab: **AED 3.45M** if the unit beats competitors on view, floor or size; otherwise **AED 3.35M** | Price decision |
| 5 | Set your floor price, the lowest you'll accept (the calculator shows net cash at each price) | Private number |

**Go/no-go:** if Radiant's minimum-paid threshold is above what you've paid, plan the next instalment before launch.

## Weeks 1–3 (24 Nov–14 Dec): Broker activation

The brokers who already list the 8 competing 3BRs hold the buyers who enquired about 3BRs in your building.

| Day | Action |
|---|---|
| 1–3 | In the dashboard, draft and approve messages to the top 6 scored brokers (Metropolitan Capital, PSI, Kennedy Property, Mirage Capital, Capital Avenue, Unique Homes). Send them yourself. |
| 4–10 | Short calls with responders. Ask: (a) how many 3BR enquiries they've had and why buyers didn't proceed, (b) what achieved prices they've seen, (c) their marketing plan, (d) their commission and exclusivity terms. |
| 10–14 | Appoint **one exclusive** broker (stronger effort, single price in the market) or **at most two** non-exclusive. Avoid five agents posting the same unit at different prices: it signals desperation. |
| 14–21 | Listing goes live on Property Finder, Bayut and Dubizzle with real photos, the floor plan, the payment summary and the ADREC permit. |

**KPI by day 21:** listing live; at least 3 brokers briefed; at least 5 enquiries.

## Weeks 4–6 (15 Dec–4 Jan): Widen reach

- Approve and post the Facebook posts in 3–5 groups whose rules allow them (`facebook-posts.md`).
- Send LinkedIn notes to about 10 people: brokers, relocation leads at ADGM firms, wealth managers (`linkedin.md`).
- Post the Arabic classifieds advert on OpenSooq and Mourjan, where allowed (`ads-ar.md`).
- Run `python3 scripts/refresh.py` weekly and watch for new 3BR listings or price cuts by competitors.
- Log every person who shows interest in the dashboard, with a link and their words.

**KPI by day 42:** at least 15 enquiries, at least 5 qualified (cash for the upfront amount, timeframe under 3 months), at least 2 viewings or document requests.

## Day 30 review (around 14 Jan 2027)

| Signal | Action |
|---|---|
| ≥ 5 qualified buyers and ≥ 1 serious negotiation | Hold the price |
| 2–4 qualified buyers, no offers | Hold for 2 more weeks; improve the advert (photos, plan clarity) |
| < 2 qualified buyers | Step down one band (3.45M → 3.35M, or 3.35M → 3.29M) |
| A competing 3BR drops below 3.2M | Re-run the Pricing tab; differentiate on view, floor or balance rather than matching |

## Weeks 7–9 (15 Jan–13 Feb): Convert

- For each qualified buyer: send the fact sheet, payment schedule and SPA extract. Ask for proof of funds before negotiating.
- Negotiate on terms, not just price: who pays the DARI fee, the timing of the next instalment, the completion date.
- Sign the MOU (sale agreement) with a deposit, typically 10%, held by the broker or a conveyancer.
- Apply for Radiant's NOC immediately after the MOU.

**KPI by day 60:** a written offer within 4% of the asking price, or a re-pricing decision.

## Day 60 review (around 13 Feb 2027)

- **No written offer:** reprice to the median competing ask (currently about 3.27M) and re-brief brokers.
- **Offer received:** compare the net cash with the calculator against your floor price, and decide within 48 hours.

---

## After day 60

| Date | Milestone |
|---|---|
| 30 Apr 2027 | Comfortable latest MOU date |
| 30 Jun 2027 | Hard latest MOU date (NOC + DARI transfer lead time) |
| 30 Sep 2027 | Target: transfer registered |
| 1 Dec 2027 | Developer's listed completion. Selling before this avoids funding the 45% handover payment yourself. |

**Before every instalment:** each payment you make raises the buyer's upfront cash, which narrows the buyer pool. If a sale is close, agree with the buyer who pays the next instalment.
