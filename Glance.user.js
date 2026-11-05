// ==UserScript==
// @name         Glance
// @namespace    https://greasyfork.org/
// @version      1.0.0
// @description  Capture your screen and get a short answer from Gemini. Userscript port of the Glance side-panel extension.
// @author       Glance
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      generativelanguage.googleapis.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// ==/UserScript==

(function () {
  'use strict';

  const CSS = `
:root {
  --bg: #17191c;
  --surface: #1f2327;
  --surface-2: #272c32;
  --border: #333a42;
  --text: #e4e7ea;
  --muted: #8d96a0;
  --accent: #93a8c0;
  --accent-ink: #12161a;
  --danger: #d09a8f;
  color-scheme: dark light;
}
@media (prefers-color-scheme: light) {
  :root {
    --bg: #f2f3f4;
    --surface: #ffffff;
    --surface-2: #eceef0;
    --border: #d8dce0;
    --text: #1d2125;
    --muted: #616a74;
    --accent: #3f5a78;
    --accent-ink: #ffffff;
    --danger: #9a4a3c;
  }
}
#glance-root * { box-sizing: border-box; }
#glance-root {
  position: fixed;
  top: 0;
  right: 0;
  width: 360px;
  max-width: 100vw;
  height: 100vh;
  background: var(--bg);
  color: var(--text);
  font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  z-index: 2147483647;
  box-shadow: -4px 0 24px rgba(0,0,0,.25);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform .2s ease;
}
#glance-root.open { transform: translateX(0); }
#glance-root header { display: flex; align-items: center; justify-content: space-between; margin: 0; padding: 12px 14px; border-bottom: 1px solid var(--border); }
#glance-root h1 { font-size: 17px; font-weight: 600; letter-spacing: 0.01em; margin: 0; }
#glance-root .icon-btn { background: none; border: 0; color: var(--muted); padding: 6px; border-radius: 8px; cursor: pointer; display: grid; place-items: center; }
#glance-root .icon-btn:hover { color: var(--text); background: var(--surface); }
#glance-root button:focus-visible, #glance-root input:focus-visible, #glance-root select:focus-visible, #glance-root textarea:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 2px;
}
#glance-root .panel-body { flex: 1; overflow-y: auto; padding: 14px 14px 28px; }
#glance-root .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 14px; }
#glance-root .card[hidden], #glance-root [hidden] { display: none !important; }
#glance-root label { display: block; font-size: 12.5px; color: var(--muted); margin: 10px 0 4px; }
#glance-root label:first-child { margin-top: 0; }
#glance-root label.check { display: flex; align-items: center; gap: 8px; color: var(--text); font-size: 13.5px; margin-top: 14px; }
#glance-root input[type="text"], #glance-root input[type="password"], #glance-root select, #glance-root textarea {
  width: 100%; background: var(--bg); color: var(--text);
  border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; font: inherit;
}
#glance-root textarea { resize: vertical; min-height: 56px; }
#glance-root .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
#glance-root .actions { display: flex; gap: 8px; margin-top: 10px; }
#glance-root button { font: inherit; cursor: pointer; border-radius: 8px; }
#glance-root .primary { flex: 1; background: var(--accent); color: var(--accent-ink); border: 0; padding: 9px 12px; font-weight: 600; }
#glance-root .primary:hover:not(:disabled) { filter: brightness(1.06); }
#glance-root .secondary { background: var(--surface-2); color: var(--text); border: 1px solid var(--border); padding: 9px 12px; }
#glance-root .secondary:hover:not(:disabled) { border-color: var(--muted); }
#glance-root .secondary.small { padding: 4px 12px; font-size: 13px; }
#glance-root button:disabled { opacity: 0.55; cursor: default; }
#glance-root .status-row { display: flex; align-items: center; justify-content: space-between; min-height: 24px; margin: 10px 0 4px; }
#glance-root #status { margin: 0; font-size: 13px; color: var(--muted); }
#glance-root #status.error { color: var(--danger); }
#glance-root .link-btn { background: none; border: 0; color: var(--accent); padding: 2px 4px; font-size: 13px; }
#glance-root figure { margin: 0 0 14px; }
#glance-root figure img { width: 100%; display: block; border-radius: 10px; border: 1px solid var(--border); max-height: 180px; object-fit: cover; object-position: top; }
#glance-root .reply-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
#glance-root .seg { display: inline-flex; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
#glance-root .seg button { background: none; border: 0; color: var(--muted); padding: 3px 10px; font-size: 12.5px; border-radius: 6px; }
#glance-root .seg button[aria-pressed="true"] { background: var(--surface-2); color: var(--text); }
#glance-root #replyText { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 14.5px; line-height: 1.65; user-select: text; }
#glance-root #usage { margin: 12px 0 0; font-size: 12px; color: var(--muted); }
#glance-fab {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2147483646;
  background: var(--accent);
  color: var(--accent-ink);
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  font: 600 13px/1 system-ui, sans-serif;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,.3);
}
#glance-fab:hover { filter: brightness(1.08); }
@media (prefers-reduced-motion: no-preference) {
  #glance-root button { transition: background-color 0.12s, border-color 0.12s, filter 0.12s; }
}
`;

  GM_addStyle(CSS);

  // ---------- humanize (inlined) ----------
  function humanize(input) {
    if (!input) return '';
    const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
    const keepCase = (m, r) => (/^[A-Z]/.test(m) ? cap(r) : r);

    const SWAPS = {
      'in the ever-evolving world of': 'in',
      'navigate the complexities of': 'deal with',
      'navigating the complexities of': 'dealing with',
      'navigate the landscape of': 'work through',
      'navigating the landscape of': 'working through',
      'unlock the full potential of': 'get more out of',
      'unlock the potential of': 'get more out of',
      'unlocking the potential of': 'getting more out of',
      'embark on a journey': 'start',
      'embarking on a journey': 'starting',
      'serves as a testament to': 'shows',
      'is a testament to': 'shows',
      'a testament to': 'proof of',
      'plays a crucial role in': 'matters for',
      'play a crucial role in': 'matter for',
      'plays a vital role in': 'matters for',
      'play a vital role in': 'matter for',
      'plays a key role in': 'matters for',
      'plays a pivotal role in': 'matters for',
      'delve into': 'look into', 'delves into': 'looks into',
      'delved into': 'looked into', 'delving into': 'looking into',
      'robust solution': 'solid option', 'robust framework': 'solid framework',
      'holistic approach': 'broad approach',
      'seamlessly integrate': 'fit in', 'seamlessly integrates': 'fits in',
      'a plethora of': 'plenty of', 'a myriad of': 'many',
      'rich tapestry of': 'mix of', 'realm of': 'area of',
      'cutting-edge': 'new', 'game-changing': 'major', 'game-changer': 'big shift',
      'revolutionary': 'new', 'seamlessly': 'smoothly', 'seamless': 'smooth',
      'crucial': 'important', 'pivotal': 'key', 'robust': 'solid',
      'vibrant': 'lively', 'intricate': 'detailed', 'multifaceted': 'complex',
      'meticulously': 'carefully', 'meticulous': 'careful',
      'plethora': 'plenty', 'myriad': 'many', 'tapestry': 'mix',
      'leverage': 'use', 'leverages': 'uses', 'leveraged': 'used', 'leveraging': 'using',
      'utilize': 'use', 'utilizes': 'uses', 'utilized': 'used', 'utilizing': 'using',
      'optimize': 'improve', 'optimizes': 'improves', 'optimized': 'improved', 'optimizing': 'improving',
      'streamline': 'simplify', 'streamlines': 'simplifies', 'streamlined': 'simplified', 'streamlining': 'simplifying',
      'empower': 'help', 'empowers': 'helps', 'empowered': 'helped', 'empowering': 'helping',
      'foster': 'build', 'fosters': 'builds', 'fostered': 'built', 'fostering': 'building',
      'cultivate': 'build', 'cultivates': 'builds', 'cultivated': 'built', 'cultivating': 'building',
      'showcase': 'show', 'showcases': 'shows', 'showcased': 'showed', 'showcasing': 'showing',
      'underscore': 'show', 'underscores': 'shows', 'underscored': 'showed', 'underscoring': 'showing',
      'elevate': 'raise', 'elevates': 'raises', 'harness': 'use', 'harnesses': 'uses', 'harnessing': 'using'
    };
    const swapRe = new RegExp(
      '\\b(' + Object.keys(SWAPS).sort((a, b) => b.length - a.length).map((k) => k.replace(/[-]/g, '\\-')).join('|') + ')\\b',
      'gi'
    );

    const START = '(^|[.!?]\\s+|\\n)';
    const M = '\u0001';
    const lead = (body) => new RegExp(START + '(?:' + body + ')\\s*', 'gi');

    const LEADS = [
      "(?:it is|it's) (?:important|worth|crucial|essential) (?:to note|noting|to remember|to understand|to mention) that,?",
      "in today's (?:fast-paced world|digital age|digital world|modern world|world),?",
      'at its core,?', 'in essence,?', 'ultimately,?', 'overall,?',
      'in conclusion,?', 'in summary,?', 'to summarize,?', 'to sum up,?',
      'moreover,?', 'furthermore,?', 'additionally,?', 'in addition,?'
    ].map(lead);

    const MID_FLUFF = /\b(?:it is|it's) (?:important|worth|crucial|essential) (?:to note|noting|to remember|to understand|to mention) that,?\s*/gi;

    let t = String(input);
    const store = [];
    t = t.replace(/```[\s\S]*?```|`[^`\n]+`|"[^"\n]{1,200}"|\u201c[^\u201d\n]{1,200}\u201d/g, (m) => {
      store.push(m);
      return '\u0002' + (store.length - 1) + '\u0002';
    });

    t = t.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');
    t = t.replace(/^\s*(?:sure|certainly|absolutely|of course|great question|okay|ok)[!,.]\s*/i, '');
    t = t.replace(/^\s*(?:here'?s|here is) (?:a|an|the) [^\n:]{0,50}:\s*\n/i, '');
    t = t.replace(/\s*(?:I hope (?:this|that) helps|let me know if [^.\n]*|feel free to [^.\n]*|if you (?:have|need) any (?:other|more|further) [^.\n]*)[.!]?\s*$/i, '');

    LEADS.forEach((re) => { t = t.replace(re, '$1' + M); });
    t = t.replace(MID_FLUFF, '');
    t = t.replace(swapRe, (m) => keepCase(m, SWAPS[m.toLowerCase()]));

    t = t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1');
    t = t.replace(/(?<![\w*])\*(?![\s*])([^*\n]+?)\*(?![\w*])/g, '$1');
    t = t.replace(/^\s{0,3}#{1,6}\s+/gm, '');
    t = t.replace(/^\s*[*\u2022]\s+/gm, '- ');
    t = t.replace(/[\u2014\u2015]/g, ' - ').replace(/\s+-\s+/g, (m, off, s) => (m.includes('\n') ? m : ', '));
    t = t.replace(/\s+\u2013\s+/g, ', ');
    t = t.replace(/\s*\u2192\s*/g, ' to ');
    t = t.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '');

    t = t.replace(/\bcannot\b/gi, (m) => keepCase(m, "can't"));
    t = t.replace(/\bwill not\b/gi, (m) => keepCase(m, "won't"));
    t = t.replace(/\b(do|does|did|is|are|was|were|has|have|had|would|should|could) not\b/gi, "$1n't");
    t = t.replace(/\b(it|that|there|here|what|who) is\b(?=\s+[a-z])/gi, "$1's");
    t = t.replace(/\b(you|we|they) are\b(?=\s+[a-z])/gi, "$1're");
    t = t.replace(/\bI am\b/g, "I'm");
    t = t.replace(/\b(I|you|we|they|he|she|it) will\b/g, "$1'll");

    t = t.replace(/,\s*,/g, ',').replace(/\s+([,.;:!?])/g, '$1').replace(/,\s*([.!?])/g, '$1');
    t = t.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
    t = t.replace(new RegExp(M + '\\s*([a-z])', 'g'), (m, c) => c.toUpperCase()).replace(new RegExp(M, 'g'), '');
    t = t.trim();

    t = t.replace(/\u0002(\d+)\u0002/g, (m, i) => store[+i]);
    return t;
  }

  // ---------- UI ----------
  const fab = document.createElement('button');
  fab.id = 'glance-fab';
  fab.textContent = 'Glance';
  document.body.appendChild(fab);

  const root = document.createElement('div');
  root.id = 'glance-root';
  root.innerHTML = `
    <header>
      <h1>Glance</h1>
      <button id="settingsBtn" class="icon-btn" aria-label="Settings" aria-expanded="false" aria-controls="settings">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
      </button>
    </header>
    <div class="panel-body">
      <section id="settings" class="card" hidden>
        <label for="apiKey">Gemini API key</label>
        <input id="apiKey" type="password" autocomplete="off" spellcheck="false" placeholder="Paste your key from Google AI Studio">
        <label for="model">Model</label>
        <input id="model" type="text" spellcheck="false">
        <div class="row">
          <div>
            <label for="detail">Image detail</label>
            <select id="detail">
              <option value="768">Low (cheapest)</option>
              <option value="1024">Medium</option>
              <option value="1536">High</option>
            </select>
          </div>
          <div>
            <label for="maxTokens">Reply length</label>
            <select id="maxTokens">
              <option value="300">Short</option>
              <option value="600">Medium</option>
              <option value="1200">Long</option>
            </select>
          </div>
        </div>
        <label class="check"><input id="humanize" type="checkbox"> Clean up AI-sounding text</label>
      </section>
      <main>
        <label for="prompt" class="sr-only">Question about the screen</label>
        <textarea id="prompt" rows="2" placeholder="Ask something about the screen, or leave blank"></textarea>
        <div class="actions">
          <button id="askTab" class="primary">Capture tab and ask</button>
          <button id="askScreen" class="secondary">Pick a screen</button>
        </div>
        <div class="status-row">
          <p id="status" role="status" aria-live="polite"></p>
          <button id="stop" class="link-btn" hidden>Stop</button>
        </div>
        <figure id="shot" hidden>
          <img id="shotImg" alt="Most recent capture">
        </figure>
        <article id="reply" class="card" hidden>
          <div class="reply-head">
            <div class="seg" role="group" aria-label="Text version">
              <button id="showClean" aria-pressed="true">Cleaned</button>
              <button id="showRaw" aria-pressed="false">Original</button>
            </div>
            <button id="copy" class="secondary small">Copy</button>
          </div>
          <div id="replyText"></div>
          <p id="usage"></p>
        </article>
      </main>
    </div>
  `;
  document.body.appendChild(root);

  const $ = (id) => root.querySelector('#' + id);

  const DEFAULTS = {
    apiKey: '',
    model: 'gemini-2.5-flash-lite',
    detail: 1024,
    maxTokens: 600,
    humanize: true,
    last: null
  };

  const DEFAULT_QUESTION = "What's on my screen? If it shows a question, error, or task, answer or solve it.";

  const SYSTEM = [
    'You read screenshots and answer briefly.',
    'Answer the question directly, with specifics from the screen: names, numbers, exact error text.',
    'Plain text only. No markdown, bold, headings, emoji, or em dashes.',
    'Use contractions. Mix short and long sentences. No greeting, no sign-off, no offer of more help.',
    'Avoid filler words like delve, leverage, seamless, robust, crucial, landscape, tapestry, testament.',
    'If something is unreadable, say so instead of guessing.'
  ].join(' ');

  let settings = { ...DEFAULTS };
  let reply = { raw: '', clean: '' };
  let view = 'clean';
  let controller = null;

  function loadSettings() {
    settings.apiKey = GM_getValue('apiKey', DEFAULTS.apiKey);
    settings.model = GM_getValue('model', DEFAULTS.model);
    settings.detail = Number(GM_getValue('detail', DEFAULTS.detail));
    settings.maxTokens = Number(GM_getValue('maxTokens', DEFAULTS.maxTokens));
    settings.humanize = GM_getValue('humanize', DEFAULTS.humanize);
    const last = GM_getValue('last', null);
    $('apiKey').value = settings.apiKey;
    $('model').value = settings.model;
    $('detail').value = String(settings.detail);
    $('maxTokens').value = String(settings.maxTokens);
    $('humanize').checked = settings.humanize;
    if (last && last.raw) showReply(last.raw, last.usage);
    if (!settings.apiKey) openSettings();
  }

  function saveSettings() {
    settings.apiKey = $('apiKey').value.trim();
    settings.model = $('model').value.trim() || DEFAULTS.model;
    settings.detail = Number($('detail').value);
    settings.maxTokens = Number($('maxTokens').value);
    settings.humanize = $('humanize').checked;
    GM_setValue('apiKey', settings.apiKey);
    GM_setValue('model', settings.model);
    GM_setValue('detail', settings.detail);
    GM_setValue('maxTokens', settings.maxTokens);
    GM_setValue('humanize', settings.humanize);
    if (reply.raw) renderReply();
  }

  function openSettings() {
    $('settings').hidden = false;
    $('settingsBtn').setAttribute('aria-expanded', 'true');
  }

  $('settingsBtn').addEventListener('click', () => {
    const open = $('settings').hidden;
    $('settings').hidden = !open;
    $('settingsBtn').setAttribute('aria-expanded', String(open));
  });
  ['apiKey', 'model', 'detail', 'maxTokens', 'humanize'].forEach((id) => $(id).addEventListener('change', saveSettings));

  // ---------- capture ----------
  async function captureTab() {
    // Approximate the current tab with html2canvas (extension API not available).
    const canvas = await html2canvas(document.body, {
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false
    });
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  async function captureScreen() {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    try {
      const video = document.createElement('video');
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      await new Promise((r) => setTimeout(r, 300));
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.9);
    } finally {
      stream.getTracks().forEach((t) => t.stop());
    }
  }

  function downscale(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, settings.detail / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => reject(new Error('Could not read the capture.'));
      img.src = dataUrl;
    });
  }

  // ---------- Gemini (GM_xmlhttpRequest to avoid CORS) ----------
  function askGemini(base64, question) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.model)}:generateContent`;
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: 'image/jpeg', data: base64 } },
          { text: question || DEFAULT_QUESTION }
        ]
      }],
      generationConfig: { maxOutputTokens: settings.maxTokens, temperature: 0.5 }
    });

    return new Promise((resolve, reject) => {
      const req = GM_xmlhttpRequest({
        method: 'POST',
        url,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': settings.apiKey
        },
        data: body,
        onload(res) {
          if (res.status >= 200 && res.status < 300) {
            try {
              const json = JSON.parse(res.responseText);
              const text = (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
              if (!text) {
                const why = json.promptFeedback?.blockReason || json.candidates?.[0]?.finishReason || 'empty reply';
                reject(Object.assign(new Error(`Gemini returned no text (${why}).`), { status: res.status }));
                return;
              }
              const u = json.usageMetadata || {};
              resolve({ text, usage: { input: u.promptTokenCount, output: u.candidatesTokenCount } });
            } catch (e) {
              reject(e);
            }
          } else {
            let detail = '';
            try { detail = JSON.parse(res.responseText).error?.message || ''; } catch (_) {}
            const err = new Error(detail || `Request failed (${res.status})`);
            err.status = res.status;
            reject(err);
          }
        },
        onerror() { reject(new Error('Network error')); },
        ontimeout() { reject(new Error('Request timed out')); }
      });
      // Note: GM_xmlhttpRequest doesn't support AbortSignal natively in all managers;
      // stop button sets a flag checked before resolve.
      controller = { abort: () => { try { req.abort(); } catch (_) {} } };
    });
  }

  function friendlyError(e) {
    if (e.name === 'AbortError') return 'Stopped.';
    const msg = e.message || String(e);
    if (e.status === 400 && /api key/i.test(msg)) return 'Gemini rejected the API key. Check it in settings.';
    if (e.status === 403) return 'The key was accepted but not allowed to use this model.';
    if (e.status === 404) return 'Model not found. Check the model name in settings.';
    if (e.status === 429) return 'Rate limit reached. Wait a minute, or check your quota in AI Studio.';
    if (/cannot be captured|cannot access|chrome:\/\/|extensions gallery/i.test(msg)) {
      return "Chrome doesn't allow capturing this page. Switch to a regular website and try again.";
    }
    if (e.name === 'NotAllowedError') return 'Screen selection was cancelled.';
    return msg;
  }

  function setStatus(text, isError) {
    $('status').textContent = text || '';
    $('status').classList.toggle('error', !!isError);
  }

  function setBusy(busy) {
    $('askTab').disabled = busy;
    $('askScreen').disabled = busy;
    $('stop').hidden = !busy;
  }

  function showReply(raw, usage) {
    reply.raw = raw;
    reply.clean = humanize(raw);
    $('reply').hidden = false;
    renderReply();
    $('usage').textContent = usage && usage.input != null
      ? `${usage.input} tokens in, ${usage.output ?? 0} out`
      : '';
  }

  function renderReply() {
    const useClean = settings.humanize && view === 'clean';
    $('replyText').textContent = useClean ? reply.clean : reply.raw;
    $('showClean').setAttribute('aria-pressed', String(view === 'clean'));
    $('showRaw').setAttribute('aria-pressed', String(view === 'raw'));
    $('showClean').disabled = !settings.humanize;
  }

  async function run(source) {
    if (!settings.apiKey) {
      openSettings();
      setStatus('Add your Gemini API key first.', true);
      return;
    }
    setBusy(true);
    try {
      setStatus(source === 'tab' ? 'Capturing tab...' : 'Choose a screen or window to share...');
      const full = source === 'tab' ? await captureTab() : await captureScreen();
      const small = await downscale(full);
      $('shotImg').src = small;
      $('shot').hidden = false;

      setStatus('Asking Gemini...');
      const { text, usage } = await askGemini(small.split(',')[1], $('prompt').value.trim());
      showReply(text, usage);
      GM_setValue('last', { raw: text, usage });
      setStatus('');
    } catch (e) {
      setStatus(friendlyError(e), e.name !== 'AbortError');
    } finally {
      controller = null;
      setBusy(false);
    }
  }

  $('askTab').addEventListener('click', () => run('tab'));
  $('askScreen').addEventListener('click', () => run('screen'));
  $('stop').addEventListener('click', () => controller && controller.abort());
  $('prompt').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run('tab'); }
  });

  $('showClean').addEventListener('click', () => { view = 'clean'; renderReply(); });
  $('showRaw').addEventListener('click', () => { view = 'raw'; renderReply(); });

  $('copy').addEventListener('click', async () => {
    const text = $('replyText').textContent;
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    $('copy').textContent = 'Copied';
    setTimeout(() => ($('copy').textContent = 'Copy'), 1400);
  });

  fab.addEventListener('click', () => root.classList.toggle('open'));

  loadSettings();
})();
