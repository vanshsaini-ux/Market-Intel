# Market Intel Studio v2 (API version)

Enter your course details once. The tool then builds:
1. Summary table: competitors with similar courses, offer price, USPs in their ads, ad type (video/static), ad links
2. Comparison table: how you stand out, dimension by dimension
3. Detailed "good to know" cards with chips that jump to each competitor
4. A table of every referenced ad, each with its own link (checked live where possible)
5. 12 ideas, each with the ads that inspired it and a ready-to-paste ChatGPT image prompt, then full concepts with prompts for the ideas you tick

## Update your existing Vercel site
In your GitHub repo:
1. Replace `index.html` with the new one.
2. Replace `api/gemini.js` with the new one.
3. Add the new file `api/check.js` (inside the `api` folder).
4. Replace `vercel.json` with the new one.
5. Commit. Vercel redeploys on its own. Your existing variables (GEMINI_API_KEY, ACCESS_CODES) keep working.

If Vercel rejects the deploy with a message about `maxDuration`, open `vercel.json` and change `300` to `60`, then commit again. In that case, set a faster model under Settings > Research model.

## Notes
- A scan takes about 5 to 10 minutes (about 10 to 12 Gemini calls). You land on the report as soon as competitors are found and the table fills in as research finishes.
- "Direct" ad links come only from URLs the research actually found. The server checks they are live (YouTube and normal web pages). Facebook, Instagram and LinkedIn pages cannot be checked automatically, so they are shown in grey: open to confirm. Amber links search Meta Ad Library; they are not a single ad.
- Add your own evidence (ad links, text, screenshots) in any competitor's details and click "Re-research with my evidence" for better accuracy.
- With your own Gemini key typed into Settings (no access code), link checking is skipped.
