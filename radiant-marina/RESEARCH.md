# Radiant Marina 3BR: buyer, broker and market research

**Prepared:** 9 November 2026 · **Property:** 3-bedroom off-plan apartment, Radiant Marina Towers, Shams Abu Dhabi, Al Reem Island
**Owner's objective:** sell at AED 3.5M by 30 September 2027 (original price ≈ AED 3.03M; ≈ AED 950K paid, to be verified)

Every figure below links to its source. Asking prices are labelled as asking prices; nothing is presented as a transaction unless it is one.

---

## 0. Capabilities used, and what could not be reached

| Capability | Status | Effect on this report |
|---|---|---|
| Web search (English + Arabic) | ✅ Worked (US-indexed) | Used for buyer-intent searches, market news, resale rules |
| Property Finder public pages | ✅ Read directly (robots.txt-allowed paths only) | Primary data: 143 of 178 reported Radiant Marina listings, all 3BR comparables, project page, 15+ agent profiles |
| Bayut, Dubizzle search pages | ⛔ Bot protection, not bypassed | Only search-result snippets, marked *unverified* |
| Facebook groups, Marketplace, LinkedIn, Instagram, Reddit | ⛔ Login needed or not indexed | **No posts could be read.** Covered by manual steps (`RESEARCH_PROMPT.md`) |
| ADREC / DARI / DMT official sites | ⛔ adrec.gov.ae and dmt.gov.ae did not respond; dari.ae is an app | Official fee schedule **not confirmed**; agency guides used and labelled |
| Registry transaction data for the building | ⛔ None published (Property Finder's `historicalTransactions` is empty for this project) | Achieved-price evidence limited to **agent-claimed** sales |
| Scheduler | ⚠️ Available but **not set up** | Refresh is on demand (`scripts/refresh.py` or the dashboard button) |

To reach the portals, this session's cloud environment had a network allowlist added (with your approval) for propertyfinder.ae, bayut.com, dubizzle.com, dari.ae, adrec.gov.ae, dmt.gov.ae, abu-dhabi.realestate and web.remapp.ae.

---

## 1. Buyer discovery: what was found

### 1.1 Direct buyers and investors with stated intent: **none verified**

Eleven English and Arabic searches looked for people asking to buy (*"looking to buy 3 bedroom Al Reem"*, *"مطلوب شراء شقة ثلاث غرف جزيرة الريم"*, *"مستثمر يبحث عن شقة أبوظبي"*, *"Radiant Marina wanted"*, *"requirement 3BR Reem"*, LinkedIn/Facebook/Reddit site searches). The full log is in `data/market.json`. Every result was a seller listing, a guide or unrelated. **No identifiable person publicly asking to buy a 3BR in Radiant Marina, or on Reem, was found**, so none is listed. Candidates that looked like leads but failed verification are in the dashboard's *Rejected candidates* list (four snippet-sourced brokers whose profiles are now inactive, and an off-topic forum thread).

This is normal for Abu Dhabi. Buyers rarely post public "wanted" ads; they enquire on portal listings and brokers hold those enquiries. So the realistic route to buyers is:

1. **Brokers who already market competing 3BRs in your towers.** Their enquiry inboxes hold the buyers who wanted a Radiant Marina 3BR.
2. **Your own listing**, through one or two of those brokers, on Property Finder, Bayut and Dubizzle.
3. **Investor networks you join yourself** (Facebook groups, LinkedIn, WhatsApp groups), using the approved posts.

### 1.2 Brokers: 49 brokerages active in Radiant Marina Towers (verified, live)

Every brokerage with a live Property Finder listing in the towers is in `data/leads.json` and the dashboard. Each is scored from activity anyone can check (see the *Lead scoring* tab). **Shortlist, strongest first:**

| # | Brokerage · agent | Why they matter | Evidence (Property Finder, 9 Nov 2026) |
|---|---|---|---|
| 1 | **Metropolitan Capital Real Estate** · Jofel Bejec Amarilliento ([profile](https://www.propertyfinder.ae/en/agent/jofel-bejec-amarilliento-344314)) | Deepest presence in the towers, and the most Radiant 3BR deals | ~20 active listings in the towers, including a 3BR at AED 3,299,999 (2,236 sqft, full sea view). The agent claims 40 sales, including **3BR Radiant Square at AED 3.30M (Dec 2025) and AED 2.90M (Feb 2026)**. The agency's languages include Russian, Turkish, French and Italian. |
| 2 | **PSI Assets Real Estates** · Ahmad Assad Issam Altaha ([profile](https://www.propertyfinder.ae/en/agent/ahmad-assad-issam-altaha-273996)) | Second-deepest presence in the towers; 3BR and 2BR stock | ~14 listings in the towers incl. a 3BR at AED 3.30M (1,692 sqft) and 2BR+M at AED 2.40M. Agent claims a **3BR Sun Tower (Reem) sale at AED 3.15M (Sep 2026)**. Agency languages include Hindi and French. |
| 3 | **Kennedy Property** · Deepak Sharma, licence 202401049401 ([profile](https://www.propertyfinder.ae/en/agent/deepak-sharma-204164), [LinkedIn](https://www.linkedin.com/in/deepak-sharma-97775690)) | Reaches Indian/South Asian buyers; closed a Radiant 3BR | Listing a 3BR at AED 3.25M. Claims a **3BR Radiant Square sale at AED 2.825M (Aug 2026)**. Speaks Hindi, Urdu, Punjabi. ⚠️ Their listing text describes Radiant Square, so the building needs confirming. |
| 4 | **Mirage Capital Properties** · Hind Obaid, licence cn-1180810 ([profile](https://www.propertyfinder.ae/en/agent/hind-obaid-270356)) | High-ticket closer; 10 listings in the towers | 3BR at AED 3.30M (1,771 sqft, sea view). 18 claimed sales, average AED 4.28M, including a 2BR in Radiant Square. |
| 5 | **Unique Homes Worldwide** · Ramsi Abusida, licence CN-2753144 ([profile](https://www.propertyfinder.ae/en/agent/ramsi-abusida-253788)) | Senior (VP Sales); German/Spanish reach | 3BR at AED 3.20M (1,833 sqft, high floor). In the market since 2012. |
| 6 | **Capital Avenue Real Estate** · Mahmoud Alsibai ([profile](https://www.propertyfinder.ae/en/agent/mahmoud-alsibai-295215)) | Holds the largest-layout competing 3BR | 3BR at AED 3,235,020 (2,205 sqft, corner, partial sea view). |

Others worth a message: **Royal Lounge Properties** (Nabil Al Bitar, rated 4.6/5, claims a Reem Hills 3BR duplex sale at AED 3.45M), **Masterpiece Property** (Yara Kassem; their 3BR at AED 3.30M has been listed since **8 April 2026**, which shows 3.3M is not clearing), and **Mark Home** (Mohamed Adel; 3BR at AED 3.20M, full sea view).

**Recommended approach for all of them:** a personal co-broke message, approved in the dashboard (English and Arabic templates ready). Ask: *"Do you have buyers who enquired on your 3BR and didn't proceed?"* and *"What have similar units actually achieved?"* Then appoint one exclusive broker, or at most two.

### 1.3 Where the buyers come from (demand signals)

- Expatriate residents and foreign investors were the top Abu Dhabi buyer groups in H1 2026. **China, India, Russia and the UK** lead the nationalities (ADREC data via [Khaleej Times](https://www.khaleejtimes.com/business/expat-residents-foreign-investors-top-abu-dhabi-property-buyers-in-2026)). 116 nationalities bought in H1 2026, up from 82 ([AGBI](https://www.agbi.com/analysis/real-estate/2026/08/abu-dhabi-property-sales-exceed-2025-by-mid-august/)). Brokers with Hindi/Urdu (Kennedy, PSI) and Russian (Metropolitan, Town Properties, Megapolis) coverage map to this.
- ADGM's expansion onto Al Maryah and Al Reem is bringing finance professionals who need 3BR family homes ([Cavendish Maxwell](https://cavendishmaxwell.com/news/btn-exclusive-the-state-of-uae-real-estate-from-those-that-know)). Hence the LinkedIn templates aimed at relocation and HR leads.
- Off-plan is 81% of Abu Dhabi sales in Q3 2026, but Q3 volume fell 19% quarter on quarter ([Gulf News / Savills](https://gulfnews.com/business/property/abu-dhabi-records-dh215-billion-in-residential-property-sales-in-q3-2026-across-6085-transactions-1.500717696)). Demand is there but moderating, which argues against over-pricing.

---

## 2. Market intelligence

### 2.1 Active 3BR inventory in Radiant Marina Towers (asking prices, Property Finder, 9 Nov 2026)

| Asking (AED) | Sqft | AED/sqft | View · floor (from listing text) | Listed | Broker |
|---:|---:|---:|---|---|---|
| 3,200,000 | 1,833 | 1,746 | – · High | 2026-09-25 | Unique Homes Worldwide |
| 3,200,000 | 1,926 | 1,661 | Full sea | 2026-11-07 | Mark Home |
| 3,235,020 | 2,205 | 1,467 | Partial sea, corner | 2026-11-03 | Capital Avenue |
| 3,250,000 | 2,205 | 1,474 | Full sea · High | 2026-11-06 | Kennedy Property ⚠️ building to confirm |
| 3,299,999 | 2,236 | 1,476 | Full sea · Low, private yard | 2026-10-15 | Metropolitan Capital |
| 3,300,000 | 1,833 | 1,800 | Canal · High | **2026-04-08** | Masterpiece Property |
| 3,300,000 | 1,692 | 1,950 | Sea | 2026-10-20 | PSI |
| 3,300,000 | 1,771 | 1,863 | Sea | 2026-09-25 | Mirage Capital |

**Range AED 3.20M–3.30M, median 3.275M; AED/sqft median 1,704 (range 1,467–1,950).** Sellers price 3BRs at a flat ~3.2–3.3M whatever the size, so the building has a price ceiling rather than a per-sqft rate. One listing has sat at 3.3M for seven months.

The towers have 178 listings in total, mostly 1BRs. Seven 2BRs ask AED 2.10M–2.95M.

Older or unverified 3BR asks seen in search snippets (Bayut/Dubizzle, dates mostly unknown): AED 2.817M (1,833 sqft, 55/45 plan), 3.074M (2,195 sqft), 3.25M (2,196 sqft, 30/70 plan), 3.25M (1,693 sqft, canal view).

### 2.2 Project facts ([Property Finder project page](https://www.propertyfinder.ae/en/new-projects/radiant-enterprises-real-estate/radiant-marina-towers))

- Developer: Radiant (listed as Radiant Enterprises Real Estate). Construction started 28 Oct 2024. **Sold out 22 Dec 2025.** **Expected completion 1 Dec 2027.**
- 3BR launch type: 1,883 sqft from **AED 2.30M** (≈ AED 1,221/sqft). Your AED 3.03M purchase suggests a larger, higher or later-priced unit; confirm against the SPA.
- Payment plans offered: 10/45/45, 25/30/45, 30/40/30, 60/35/5 (down payment / during construction / handover).

### 2.3 Transactions: what is and isn't known

- **No registry transactions are published for Radiant Marina Towers.** Property Finder's transaction field for the project is empty, and DARI/ADREC data could not be reached.
- **Agent-claimed sales** (from agents' Property Finder profiles: self-reported and not registry-verified, sizes not given). These are the closest public evidence of achieved prices:
  - Radiant Marina Towers 1BR: AED 1.19M (30 Jan 2026), AED 1.19M (4 Feb 2026)
  - **Radiant Square 3BR** (same developer, neighbouring completed towers): **AED 3.30M (27 Dec 2025), 2.90M (28 Feb 2026), 2.825M (3 Aug 2026)**
  - Sun Tower 3BR (Reem, completed): AED 3.15M (1 Sep 2026)
  - Reem Hills 3BR duplex: AED 3.45M (1 Feb 2026)
- Area level: Al Reem apartments +17.3% YoY to H1 2026 (Cavendish Maxwell); YTD-2026 median AED 1,704/sqft and 5.8% gross yield ([ADX Interact](https://adxinteract.com/area/al-reem-island)).
- Across 127 Reem 3BR listings, the off-plan median is AED 1,613/sqft (47 listings) and the completed median AED 1,620/sqft (80 listings). Radiant Marina's 3BRs ask at a premium to both.

### 2.4 Price estimate

| | AED |
|---|---|
| **Realistic listing price** | **3.35M** (standard unit) to **3.45M** (high floor / full sea view / 2,000+ sqft / lower balance) |
| **Likely agreed price** | **3.15M–3.30M** (3–6% below asking; in line with claimed Radiant 3BR sales of 2.83–3.30M) |
| **Your AED 3.5M target** | 6.1% above the highest competing ask. Achievable only with an exceptional unit or further growth. Re-test in spring 2027 if competing asks climb past ~3.4M. |
| **Break-even (premium covers your selling costs)** | ≈ **3.13M** |

### 2.5 Expected net proceeds

Assumptions: you have paid AED 950K and make no further instalments before the sale; 2% commission + 5% VAT; DARI fee 2% split 50/50; NOC AED 5K. All of these can be changed in the calculator.

| Agreed price | Premium | Selling costs | **Cash to you** | **Net gain** | Buyer pays you at transfer |
|---:|---:|---:|---:|---:|---:|
| 3,150,000 | 120,000 | 102,650 | 967,350 | 17,350 | 1,070,000 |
| 3,250,000 | 220,000 | 105,750 | 1,064,250 | 114,250 | 1,170,000 |
| 3,350,000 | 320,000 | 108,850 | 1,161,150 | 211,150 | 1,270,000 |
| 3,450,000 | 420,000 | 111,950 | 1,258,050 | 308,050 | 1,370,000 |
| 3,500,000 | 470,000 | 113,500 | 1,306,500 | 356,500 | 1,420,000 |

### 2.6 Remaining developer payments

- Balance after AED 950K paid: **≈ AED 2.08M**. The buyer takes this over.
- Paid share: **31.4%**. If you are on the 10/45/45 plan, the 45% handover payment (≈ AED 1.36M) falls due at completion (listed Dec 2027). The rest of the balance (≈ AED 0.72M) is construction instalments due before then. **Get the exact schedule from Radiant.**
- Each instalment you pay before selling is refunded by the buyer, but it raises the cash they must bring and narrows the pool.

### 2.7 Fees and possible restrictions (to confirm)

- **DARI registration:** cited by several guides as **2% of the contract value** plus an e-service fee (≈ AED 400 + VAT). Who pays is negotiable. Not confirmed on an official page.
- **Developer NOC:** required. Guides cite AED 500–5,000 or a 1–2% assignment fee, and a **minimum paid of 30–40%**. At 31.4% you may be just over a 30% threshold. **A 40% threshold would need ≈ AED 262K more paid first.** Ask Radiant in writing.
- **Broker commission:** 2% norm plus 5% VAT; negotiable for an exclusive.
- **Advertising:** Abu Dhabi portal ads run through licensed brokers with an ADREC permit number. Check before posting yourself.

### 2.8 Risks of selling before handover

1. NOC refusal or delay (minimum-paid rule, arrears, processing time).
2. A thin financing pool. Few lenders fund off-plan resales, so buyers need cash for the upfront amount.
3. Competing supply: 8 other 3BRs now, and more investors flipping as handover nears.
4. Timing: if completion is called early, the 45% handover payment arrives sooner; if it slips, buyer interest may cool.
5. Unverified fees: agree the split of the DARI fee and the NOC fee in the MOU.

---

## 3. What to do this week

1. Get the SPA, the Radiant statement of account and Radiant's resale/NOC policy (minimum % paid, fee, timing).
2. Enter size, floor and view in the dashboard and decide: **list at 3.45M or 3.35M**.
3. Approve co-broke messages to brokers 1–6 above and send them yourself.
4. Join 3–5 Abu Dhabi property investor groups and run the manual social search in `RESEARCH_PROMPT.md`; log any real buyer you find.

---

## Sources

- Property Finder: [Radiant Marina Towers listings](https://www.propertyfinder.ae/en/buy/abu-dhabi/properties-for-sale-al-reem-island-shams-abu-dhabi-radiant-marina-towers.html) · [3BR listings](https://www.propertyfinder.ae/en/buy/abu-dhabi/3-bedroom-apartments-for-sale-al-reem-island-shams-abu-dhabi-radiant-marina-towers.html) · [project page](https://www.propertyfinder.ae/en/new-projects/radiant-enterprises-real-estate/radiant-marina-towers) · [area insights](https://www.propertyfinder.ae/en/area-insights/abu-dhabi/al-reem-island-shams-abu-dhabi-radiant-marina-towers) · [Reem 3BR listings](https://www.propertyfinder.ae/en/buy/abu-dhabi/3-bedroom-apartments-for-sale-al-reem-island.html) · agent profiles linked above
- Bayut (snippets): [11102835](https://www.bayut.com/property/details-11102835.html) · [11405362](https://www.bayut.com/property/details-11405362.html) · [12040552](https://www.bayut.com/ar/property/details-12040552.html) · [owner-direct Reem listings](https://www.bayut.com/ar/s/apartments-for-sale-in-abu-dhabi-al-reem-island-direct-from-owner/) · [resale guide](https://www.bayut.com/mybayut/resell-off-plan-property-abu-dhabi/)
- Dubizzle (snippets): [235614](https://abudhabi.dubizzle.com/property-for-sale/residential/apartment/2026/5/22/canal-view-3brmaids-closed-kitchen-wate-3-235614/) · [project page](https://abudhabi.dubizzle.com/new-projects/radiant-real-estate/radiant-marina-towers/)
- [abu-dhabi.realestate / Metropolitan Capital listing](https://abu-dhabi.realestate/buy/canal-view-3brmaids-closed-kitchen-waterfront-mcs-41395)
- Market: [Gulf News, Q3 2026](https://gulfnews.com/business/property/abu-dhabi-records-dh215-billion-in-residential-property-sales-in-q3-2026-across-6085-transactions-1.500717696) · [Khaleej Times, 2026 buyers](https://www.khaleejtimes.com/business/expat-residents-foreign-investors-top-abu-dhabi-property-buyers-in-2026) · [Khaleej Times, 2025 expat share](https://www.khaleejtimes.com/business/property/more-expats-buying-homes-abu-dhab) · [AGBI](https://www.agbi.com/analysis/real-estate/2026/08/abu-dhabi-property-sales-exceed-2025-by-mid-august/) · [ADX Interact](https://adxinteract.com/area/al-reem-island) · [Esto](https://estoplot.app/areas/abu-dhabi/ad-reem/) · [Cavendish Maxwell](https://cavendishmaxwell.com/news/btn-exclusive-the-state-of-uae-real-estate-from-those-that-know)
- Resale rules (third-party guides): [oplusrealty](https://oplusrealty.com/adrec-abu-dhabi-real-estate-centre-guide-2026/) · [eastfaceuae](https://eastfaceuae.com/guides/abu-dhabi-property-purchase-costs-and-fees) · [wowdeals](https://www.wowdeals.me/blog/resell-off-plan-property-abu-dhabi) · [equityedge](https://www.equityedge.ae/tools/resale-transfer-calculator) · [WeNest](https://wenestre.com/locations/al-reem-island-abu-dhabi-property-investment/)
