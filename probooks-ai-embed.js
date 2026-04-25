/**
 * ProBooks AI — Embeddable Floating Widget v2.0
 * Drop one <script> tag into any page of your app.
 * Matches the ProBooks dark navy theme exactly.
 *
 * Usage: <script src="/ai/probooks-ai-embed.js"><\/script>
 */

(function () {
  'use strict';

  // ── Inject CSS ──────────────────────────────────────────────────────────
  const css = `
    #pb-fab {
      position: fixed; bottom: 24px; right: 24px;
      width: 52px; height: 52px;
      background: #16a34a;
      border: none; border-radius: 13px; cursor: pointer;
      z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(22,163,74,0.35), 0 2px 6px rgba(0,0,0,0.3);
      transition: transform 0.18s, box-shadow 0.18s, background 0.15s;
      color: #fff; font-size: 20px;
    }
    #pb-fab:hover {
      transform: translateY(-2px);
      background: #22c55e;
      box-shadow: 0 8px 24px rgba(34,197,94,0.4), 0 4px 10px rgba(0,0,0,0.3);
    }
    #pb-fab-tooltip {
      position: absolute; bottom: calc(100% + 10px); right: 0;
      background: #1e2433; color: #f1f5f9;
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 11px; font-weight: 500;
      padding: 5px 10px; border-radius: 7px;
      white-space: nowrap;
      border: 1px solid rgba(255,255,255,0.07);
      opacity: 0; pointer-events: none;
      transition: opacity 0.15s;
    }
    #pb-fab:hover #pb-fab-tooltip { opacity: 1; }
    #pb-notif {
      position: absolute; top: -4px; right: -4px;
      width: 11px; height: 11px;
      background: #ef4444; border-radius: 50%;
      border: 2px solid #131720; display: none;
    }

    #pb-panel {
      position: fixed; bottom: 88px; right: 24px;
      width: 380px; height: 560px;
      background: #161b27;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      box-shadow: 0 0 0 1px rgba(34,197,94,0.08), 0 20px 60px rgba(0,0,0,0.5);
      z-index: 99998;
      display: none; flex-direction: column;
      overflow: hidden;
      font-family: 'Inter', -apple-system, sans-serif;
    }
    #pb-panel.open {
      display: flex;
      animation: pb-up 0.22s cubic-bezier(0.16,1,0.3,1);
    }
    @keyframes pb-up {
      from { opacity:0; transform:translateY(14px) scale(0.97); }
      to   { opacity:1; transform:none; }
    }

    .pb-hd {
      display: flex; align-items: center; gap: 10px;
      padding: 13px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      background: #131720;
      flex-shrink: 0;
    }
    .pb-hd-logo {
      font-size: 16px; font-weight: 700;
      line-height: 1;
    }
    .pb-hd-logo .pro { color: #f1f5f9; }
    .pb-hd-logo .bks { color: #22c55e; }
    .pb-hd-sub {
      font-size: 10px; color: #64748b;
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .pb-hd-right { margin-left: auto; display:flex; align-items:center; gap:8px; }
    .pb-hd-status {
      display: flex; align-items: center; gap: 5px;
      font-size: 11px; color: #22c55e;
      background: rgba(34,197,94,0.1);
      border: 1px solid rgba(34,197,94,0.2);
      border-radius: 20px; padding: 2px 8px;
    }
    .pb-hd-status.off { color:#ef4444; background:rgba(239,68,68,0.1); border-color:rgba(239,68,68,0.2); }
    .pb-hd-dot { width:5px; height:5px; border-radius:50%; background:currentColor; animation:pb-blink 2s ease infinite; }
    .pb-hd-status.off .pb-hd-dot { animation:none; }
    @keyframes pb-blink { 0%,100%{opacity:1}50%{opacity:0.35} }
    .pb-close {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
      color: #64748b; border-radius: 6px; width: 24px; height: 24px;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; font-size:13px; transition:all 0.12s;
    }
    .pb-close:hover { background:rgba(255,255,255,0.1); color:#f1f5f9; }

    .pb-agent-bar {
      padding: 7px 14px; background: #1e2433;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      font-size: 10.5px; color: #64748b;
      flex-shrink:0;
    }
    .pb-agent-bar span { color: #22c55e; font-weight: 500; }

    .pb-msgs {
      flex: 1; overflow-y: auto; padding: 12px 12px;
      display: flex; flex-direction: column; gap: 10px;
      background: #161b27;
    }
    .pb-msgs::-webkit-scrollbar { width: 3px; }
    .pb-msgs::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 2px; }

    .pb-welcome { text-align:center; padding:20px 10px; }
    .pb-welcome p { font-size:12px; color:#64748b; margin-bottom:12px; line-height:1.55; }
    .pb-chips { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; }
    .pb-chip {
      background:#1e2433; border:1px solid rgba(255,255,255,0.07);
      border-radius:16px; padding:5px 10px;
      font-size:11px; color:#94a3b8; cursor:pointer;
      transition:all 0.13s; font-family:inherit;
    }
    .pb-chip:hover { border-color:rgba(34,197,94,0.3); color:#22c55e; background:rgba(34,197,94,0.08); }

    .pb-row { display:flex; gap:7px; animation:pb-fade 0.22s ease; }
    .pb-row.user { flex-direction:row-reverse; }
    @keyframes pb-fade { from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none} }

    .pb-av {
      width:26px; height:26px; border-radius:7px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      font-size:10px; font-weight:700; align-self:flex-end;
    }
    .pb-row.ai .pb-av { background:rgba(34,197,94,0.12); border:1px solid rgba(34,197,94,0.2); color:#22c55e; }
    .pb-row.user .pb-av { background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.2); color:#3b82f6; }

    .pb-bub {
      max-width: 80%; padding:9px 12px; border-radius:10px;
      font-size:12.5px; line-height:1.6; word-break:break-word;
    }
    .pb-row.ai .pb-bub {
      background:#1e2433; border:1px solid rgba(255,255,255,0.07);
      color:#f1f5f9; border-bottom-left-radius:3px;
    }
    .pb-row.user .pb-bub {
      background:#16a34a; color:#fff; border-bottom-right-radius:3px;
    }
    .pb-bub.offline { background:rgba(245,158,11,0.08); border-color:rgba(245,158,11,0.2); color:#f59e0b; }
    .pb-bub.error   { background:rgba(239,68,68,0.08);  border-color:rgba(239,68,68,0.2);  color:#ef4444; }

    .pb-typing {
      display:flex; align-items:center; gap:4px;
      padding:10px 12px; background:#1e2433;
      border:1px solid rgba(255,255,255,0.07);
      border-radius:10px; border-bottom-left-radius:3px; max-width:52px;
    }
    .pb-typing span {
      width:5px; height:5px; border-radius:50%; background:#22c55e;
      animation:pb-bounce 1.2s ease infinite;
    }
    .pb-typing span:nth-child(2){animation-delay:.2s}
    .pb-typing span:nth-child(3){animation-delay:.4s}
    @keyframes pb-bounce{0%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-4px);opacity:1}}

    .pb-input-area {
      border-top:1px solid rgba(255,255,255,0.07);
      padding:10px 12px; background:#131720; flex-shrink:0;
    }
    .pb-input-row {
      display:flex; align-items:flex-end; gap:8px;
      background:#252d3d; border:1.5px solid rgba(255,255,255,0.07);
      border-radius:9px; padding:8px 10px; transition:border-color 0.15s;
    }
    .pb-input-row:focus-within { border-color:rgba(34,197,94,0.35); }
    .pb-ta {
      flex:1; background:transparent; border:none; outline:none;
      resize:none; font-family:inherit; font-size:12.5px;
      color:#f1f5f9; line-height:1.45; max-height:70px; min-height:18px; overflow-y:auto;
    }
    .pb-ta::placeholder { color:#64748b; }
    .pb-send {
      width:28px; height:28px; background:#16a34a; border:none;
      border-radius:7px; cursor:pointer; display:flex; align-items:center;
      justify-content:center; transition:background 0.13s; color:#fff; flex-shrink:0;
    }
    .pb-send:hover { background:#22c55e; }
    .pb-send:disabled { opacity:0.3; cursor:not-allowed; }
    .pb-hint { font-size:10px; color:#475569; margin-top:6px; text-align:center; }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── Build DOM ─────────────────────────────────────────────────────────
  const fab = document.createElement('button');
  fab.id = 'pb-fab';
  fab.innerHTML = `<span id="pb-fab-tooltip">ProBooks AI</span>✦<span id="pb-notif"></span>`;
  document.body.appendChild(fab);

  const panel = document.createElement('div');
  panel.id = 'pb-panel';
  panel.innerHTML = `
    <div class="pb-hd">
      <div>
        <div class="pb-hd-logo"><span class="pro">Pro</span><span class="bks">Books</span> <span style="font-weight:400;color:#22c55e;font-size:13px">AI</span></div>
        <div class="pb-hd-sub">Multi-Agent Assistant</div>
      </div>
      <div class="pb-hd-right">
        <div class="pb-hd-status" id="pb-net">
          <div class="pb-hd-dot"></div><span>Online</span>
        </div>
        <button class="pb-close" onclick="document.getElementById('pb-panel').classList.remove('open')">✕</button>
      </div>
    </div>
    <div class="pb-agent-bar" id="pb-agent-bar">Ready — <span id="pb-agent-name">ask me anything</span></div>
    <div class="pb-msgs" id="pb-msgs">
      <div class="pb-welcome">
        <p>I'm ProBooks AI. Ask me about your transactions, reports, taxes, forecasts, or any accounting question.</p>
        <div class="pb-chips">
          <button class="pb-chip" onclick="pbChip(this)">📊 Run a report</button>
          <button class="pb-chip" onclick="pbChip(this)">🛡 Check for fraud</button>
          <button class="pb-chip" onclick="pbChip(this)">💰 Cash flow forecast</button>
          <button class="pb-chip" onclick="pbChip(this)">⚖ KRA tax help</button>
          <button class="pb-chip" onclick="pbChip(this)">📝 Journal entry help</button>
        </div>
      </div>
    </div>
    <div class="pb-input-area">
      <div class="pb-input-row">
        <textarea class="pb-ta" id="pb-ta" placeholder="Ask ProBooks AI…" rows="1"
          onkeydown="pbKey(event)" oninput="pbResize(this)"></textarea>
        <button class="pb-send" id="pb-send" onclick="pbSend()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <div class="pb-hint">ProBooks AI · 8 specialist agents</div>
    </div>`;
  document.body.appendChild(panel);

  // ── Toggle ─────────────────────────────────────────────────────────────
  fab.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      document.getElementById('pb-ta').focus();
      document.getElementById('pb-notif').style.display = 'none';
    }
  });

  // ── Network ────────────────────────────────────────────────────────────
  function pbNet() {
    const on = navigator.onLine;
    const el = document.getElementById('pb-net');
    if (!el) return;
    el.className = 'pb-hd-status' + (on ? '' : ' off');
    el.innerHTML = `<div class="pb-hd-dot"></div><span>${on ? 'Online' : 'Offline'}</span>`;
  }
  window.addEventListener('online', pbNet);
  window.addEventListener('offline', pbNet);
  pbNet();

  // ── Mini AI engine ─────────────────────────────────────────────────────
  let pbHist = [], pbBusy = false;

  const KEYWORDS = {
    'Data & Automation ⚡': ['categorize','transaction','payroll','reconcil','invoice scan','receipt','ocr'],
    'Fraud & Anomaly 🛡': ['fraud','anomal','duplicate','unusual','suspicious','flag'],
    'Financial Reporting 📊': ['report','statement','income','balance sheet','revenue','profit','p&l'],
    'Forecasting 📈': ['forecast','predict','cash flow','scenario','what if','budget','trend'],
    'AP / AR 🔗': ['vendor','receivable','payable','overdue','aging','invoice match','collections'],
    'Tax & Compliance ⚖': ['tax','vat','kra','paye','itax','withholding','audit','compliance'],
    'Document Intelligence 📄': ['contract','document','policy','expense claim','classify','archive'],
  };

  const SYS = `You are ProBooks AI, the expert multi-agent accounting assistant built into ProBooks accounting software.
Handle all accounting needs: transactions, fraud detection, reporting, forecasting, AP/AR, KRA tax compliance, document analysis, and general accounting guidance.
Use East African context where relevant: KES currency, KRA/iTax, M-Pesa, NSSF/NHIF, VAT 16%.
Be concise and precise. Format journal entries with Debit/Credit structure. Flag deadlines and risks clearly.`;

  function pbRoute(msg) {
    const low = msg.toLowerCase();
    for (const [agent, kw] of Object.entries(KEYWORDS)) {
      if (kw.some(k => low.includes(k))) return agent;
    }
    return 'Accounting Copilot ✦';
  }

  window.pbResize = function(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 70) + 'px';
  };
  window.pbKey = function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); pbSend(); }
  };
  window.pbChip = function(el) {
    document.getElementById('pb-ta').value = el.textContent.replace(/^[^\w\s]*\s*/,'');
    pbSend();
  };

  function pbAddMsg(text, role, cls) {
    const area = document.getElementById('pb-msgs');
    const wlc = area.querySelector('.pb-welcome');
    if (wlc) wlc.remove();

    const row = document.createElement('div');
    row.className = `pb-row ${role}`;

    const av = document.createElement('div');
    av.className = 'pb-av';
    av.textContent = role === 'ai' ? 'AI' : 'U';

    const bub = document.createElement('div');
    bub.className = `pb-bub ${cls||''}`;
    bub.innerHTML = text
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/\n/g,'<br>');

    if (role === 'ai') { row.appendChild(av); row.appendChild(bub); }
    else { row.appendChild(bub); row.appendChild(av); }

    area.appendChild(row);
    area.scrollTop = area.scrollHeight;
  }

  function pbShowTyping() {
    const area = document.getElementById('pb-msgs');
    const wlc = area.querySelector('.pb-welcome');
    if (wlc) wlc.remove();
    const row = document.createElement('div');
    row.className = 'pb-row ai'; row.id = 'pb-typing';
    const av = document.createElement('div'); av.className = 'pb-av'; av.textContent = 'AI';
    const t = document.createElement('div'); t.className = 'pb-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    row.appendChild(av); row.appendChild(t);
    area.appendChild(row); area.scrollTop = area.scrollHeight;
  }
  function pbHideTyping() { const e = document.getElementById('pb-typing'); if(e) e.remove(); }

  window.pbSend = async function() {
    if (pbBusy) return;
    const ta = document.getElementById('pb-ta');
    const msg = ta.value.trim();
    if (!msg) return;

    ta.value = ''; pbResize(ta);
    pbBusy = true;
    document.getElementById('pb-send').disabled = true;

    pbAddMsg(msg, 'user');

    if (!navigator.onLine) {
      pbAddMsg("You're offline. Connect to the internet to use ProBooks AI.", 'ai', 'offline');
      pbBusy = false; document.getElementById('pb-send').disabled = false;
      return;
    }

    pbShowTyping();
    const agent = pbRoute(msg);
    const nameEl = document.getElementById('pb-agent-name');
    if (nameEl) nameEl.textContent = agent;

    pbHist.push({ role: 'user', content: msg });
    if (pbHist.length > 16) pbHist = pbHist.slice(-16);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (window.ANTHROPIC_API_KEY) {
        headers['x-api-key'] = window.ANTHROPIC_API_KEY;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
      }
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers,
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system: SYS, messages: pbHist })
      });
      const data = await res.json();
      const reply = data.content.map(b => b.text||'').join('\n');
      pbHist.push({ role: 'assistant', content: reply });
      pbHideTyping();
      pbAddMsg(reply, 'ai');
      if (!panel.classList.contains('open')) {
        document.getElementById('pb-notif').style.display = 'block';
      }
    } catch(e) {
      pbHideTyping();
      pbAddMsg(`Error: ${e.message}`, 'ai', 'error');
    }

    pbBusy = false;
    document.getElementById('pb-send').disabled = false;
  };

})();
