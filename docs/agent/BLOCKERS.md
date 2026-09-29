# Blockers (need the owner)

| #   | Needed from owner                                                                                                  | Blocks                            | Interim behaviour                      |
| --- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------- | -------------------------------------- |
| 1   | Real WhatsApp number (and Instagram handles `@usbaofficial`, `@fairycoreforher` confirmation)                      | Launch (AS-17, all order buttons) | Seed placeholder `920000000000` (A-11) |
| 2   | Payment process text for FAQ (C-6)                                                                                 | FAQ completeness                  | FAQ omits payment (A-12)               |
| 3   | Brand story / About text                                                                                           | `/about` content                  | Neutral placeholder (A-13)             |
| 4   | Logo and brand assets (fonts, colours)                                                                             | Final visual identity             | Our palette/typography (A-17)          |
| 5   | Real product photos and catalogue (names, prices, sizes, colours, stock)                                           | Launch content                    | Seed demo data                         |
| 6   | Instagram API / Meta app credentials for the feed (CS-22)                                                          | Live Instagram feed               | Curated section (A-16)                 |
| 7   | Hosting accounts: Render, Neon or Supabase, Cloudflare R2 (or Supabase Storage); domain and DNS access             | Deployment                        | Local Docker only                      |
| 8   | Google Analytics property (AS-19, P3) or approval of Plausible                                                     | Analytics                         | `ANALYTICS_PROVIDER=none`              |
| 9   | Size chart verification against USBA's actual sizing (A-14)                                                        | `/size-guide` accuracy            | Standard EU conversions                |
| 10  | Confirmation of ambiguous items: CS-09 phase; out-of-stock hides vs shows (A-19); Feedback 1-20 source screenshots | Minor                             | Assumptions in docs/ASSUMPTIONS.md     |
