# Market Intel Studio

Competitor ad intelligence to creative ideas, in 4 steps:

1. **Your business**: enter name, website, offers. The tool reads your site and builds a profile.
2. **Competitors**: auto-found from live search. Add, remove, untick.
3. **Ad insights and ideas**: per competitor, it extracts USPs and creative types (optionally student expectations and pain points), then consolidates 12+ ideas with example links.
4. **Creatives**: tick any ideas and get 5 to 8 concepts each: hook, scene-by-scene script, headline, primary text, CTA, A/B test tip. English, Hinglish or Hindi.

Research auto-saves on the device (History button). Export as Markdown, JSON, or print to PDF.

---

## Option 1: Deploy on Vercel (for you plus 1 to 2 people)

Your Gemini key stays on the server. Teammates only get an access code.

1. Put this whole folder in a GitHub repository (the `api` folder, `index.html`, `vercel.json`, `package.json` must be at the top level).
2. In Vercel: **Add New > Project**, import that repository, leave all build settings empty.
3. Before clicking Deploy, open **Environment Variables** and add:
   - `GEMINI_API_KEY` = your Gemini key
   - `ACCESS_CODES` = one code per person, comma separated, for example `vansh-2026,priya-x91`
4. Click **Deploy**.
5. Open the live link, click **Settings**, enter your access code, and start.

To remove someone: delete their code from `ACCESS_CODES` in Vercel, then redeploy.
To change the key or codes: edit the variable, then redeploy (Vercel applies variables only on a new deploy).

## Option 2: Run on your own computer, no deployment

Open `index.html` in Chrome, click **Settings**, paste your Gemini key into "Use your own Gemini key". It runs directly from the browser and the key is saved only on that device. Do not host the file publicly with a key inside it.

---

## Getting the best results

- **Ad evidence matters most.** In step 3 each competitor has links to the Meta Ad Library, Google Ads Transparency and YouTube. Open them, take screenshots of their top ads (Ctrl+V pastes straight into the box), and paste any ad copy or YouTube ad links. Results then show "Based on the ads you provided".
- With nothing added, the tool falls back to public web messaging and labels it clearly, so you always know what the findings rest on.
- Example links are checked: only links from your pasted evidence, search results, or the competitor's own pages are shown. Otherwise you get a direct link to browse their live ads.
- Student expectations and pain points can be switched off in step 3.

## Settings

- **Model**: blank uses `gemini-2.5-pro`. If a request times out (Vercel allows 60 seconds per call), switch to `gemini-2.5-flash`. Any model name from Google AI Studio can be typed in.
- **Limits**: the app has no usage cap of its own. Your Gemini plan's quota applies. A full run on 8 competitors takes roughly 20 to 30 Gemini calls. A light per-code limit (40 requests a minute) protects your key.

## Privacy

Business details, screenshots and notes are sent to Google's Gemini API. Saved research stays in each person's own browser. Do not enter confidential data.

## Files

- `index.html`: the whole app
- `api/gemini.js`: server function that holds your key and checks access codes
- `vercel.json`, `package.json`: deployment settings
