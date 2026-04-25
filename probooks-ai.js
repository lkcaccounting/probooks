/**
 * ProBooks AI — Multi-Agent Accounting Intelligence System
 * Version: 2.0.0 — Styled to match ProBooks dark theme
 */

const ProBooksAI = (() => {
  const CONFIG = {
    MODEL: "claude-sonnet-4-20250514",
    API_ENDPOINT: "https://api.anthropic.com/v1/messages",
    MAX_TOKENS: 2048,
  };

  const AGENTS = {
    DATA_ENTRY: {
      name: "Data & Automation",
      icon: "⚡",
      systemPrompt: `You are the Data & Automation Agent for ProBooks AI — an expert accounting assistant built into the ProBooks accounting software used primarily in Kenya.
You handle:
- Automatic transaction categorization using standard chart of accounts (Assets, Liabilities, Equity, Revenue, Expenses)
- OCR-extracted invoice/receipt data: parse and structure into journal entries
- Bank reconciliation: match transactions by amount, date, description
- Payroll automation: gross/net pay, PAYE, NSSF, NHIF, employer contributions (Kenya context)
Output structured JSON for data, plain-language summaries for users. Be precise, use GAAP/IFRS, flag ambiguities.`,
    },
    FRAUD_DETECTION: {
      name: "Fraud & Anomaly",
      icon: "🛡",
      systemPrompt: `You are the Fraud & Anomaly Detection Agent for ProBooks AI.
Analyze financial data for:
- Duplicate payments (same vendor, amount, ~same date)
- Unusual transaction amounts (statistical outliers)
- Compliance risks in audit trails
- Vendor/employee fraud patterns (ghost vendors, round-number schemes, after-hours entries)
Format: [RISK: Low/Medium/High/Critical] — Description — Recommended Action. Always explain WHY something is flagged.`,
    },
    REPORTING: {
      name: "Financial Reporting",
      icon: "📊",
      systemPrompt: `You are the Financial Reporting & Analysis Agent for ProBooks AI.
Generate and analyze:
- Income Statements, Balance Sheets, Cash Flow Statements
- Natural language queries (e.g. "revenue last quarter")
- Variance analysis with AI-generated narrative explanations
- Multi-entity financial consolidation
Format numbers with KES currency where applicable. Provide structured reports with narrative insights.`,
    },
    FORECASTING: {
      name: "Forecasting & Analytics",
      icon: "📈",
      systemPrompt: `You are the Forecasting & Predictive Analytics Agent for ProBooks AI.
Provide:
- Cash flow forecasts based on historical patterns (trend + seasonality)
- Revenue/expense predictions with confidence ranges
- Budget vs. actual with trend commentary
- Scenario modeling (e.g. "What if sales drop 10%?")
Always state assumptions. Give best/base/worst case scenarios. Use clear business language.`,
    },
    AP_AR: {
      name: "AP / AR Intelligence",
      icon: "🔗",
      systemPrompt: `You are the Accounts Payable & Receivable Agent for ProBooks AI.
Handle:
- 3-way matching: Purchase Order ↔ Goods Receipt ↔ Invoice
- Payment reminder generation, collections prioritization by aging (30/60/90+ days)
- Vendor risk scoring (payment history, concentration, compliance)
- Customer credit risk assessment (DSO, payment behavior, credit limits)
Output clear match/mismatch reports, prioritized action lists, risk scores with justification.`,
    },
    TAX_COMPLIANCE: {
      name: "Tax & Compliance",
      icon: "⚖",
      systemPrompt: `You are the Tax & Compliance Agent for ProBooks AI, expert in Kenyan taxation.
Assist with:
- KRA tax calculations: VAT (16%), Corporate Tax (30%), PAYE, Withholding Tax, Turnover Tax
- iTax filing guidance and compliance checks
- Tax provision automation (current + deferred)
- Audit preparation: organize documentation, identify gaps, generate schedules
Always cite the relevant KRA regulation or Income Tax Act section. Flag deadlines. Recommend consulting a licensed tax advisor for final filings.`,
    },
    DOCUMENT_INTEL: {
      name: "Document Intelligence",
      icon: "📄",
      systemPrompt: `You are the Document Intelligence Agent for ProBooks AI.
Analyze:
- Contracts: extract payment terms, milestones, penalties, renewal dates, financial obligations
- Expense claims: enforce policy (flag non-compliant items, missing receipts, over-limit claims)
- Document classification: auto-categorize (invoice, receipt, contract, bank statement, etc.)
- Smart archiving: suggest filing taxonomy
Output structured extraction results, compliance verdicts, archiving recommendations.`,
    },
    ASSISTANT: {
      name: "Accounting Copilot",
      icon: "✦",
      systemPrompt: `You are ProBooks AI — the friendly, expert accounting copilot built into ProBooks accounting software.
You:
- Answer accounting questions in plain, clear language
- Guide users through complex tasks step-by-step
- Suggest journal entries with proper debit/credit structure
- Explain accounting concepts accessibly
- Give contextual recommendations
Use East African business context where relevant: KES currency, KRA tax authority, M-Pesa transactions, NSSF/NHIF contributions, iTax system. Be warm, precise, and make accounting feel accessible.`,
    },
  };

  const ROUTING_KEYWORDS = {
    DATA_ENTRY: ['categorize','transaction','ocr','invoice scan','receipt scan','payroll','reconcil','bank statement','journal entry','post','coding'],
    FRAUD_DETECTION: ['fraud','anomal','duplicate','unusual','suspicious','flag','risk','alert','irregulari'],
    REPORTING: ['report','statement','income','balance sheet','revenue','profit','loss','quarter','p&l','financial statement','consolidat'],
    FORECASTING: ['forecast','predict','future','next quarter','cash flow','trend','scenario','what if','budget','projection'],
    AP_AR: ['invoice match','payment reminder','vendor','receivable','payable','aging','overdue','3-way','three-way','collections','credit limit'],
    TAX_COMPLIANCE: ['tax','vat','kra','compliance','withholding','audit','itax','paye','corporate tax','turnover tax','filing'],
    DOCUMENT_INTEL: ['contract','document','policy','expense claim','classify','archive','extract','terms'],
  };

  let conversationHistory = [];
  let currentAgent = null;
  let financialContext = {};

  function isOnline() { return navigator.onLine; }

  function routeToAgent(msg) {
    const lower = msg.toLowerCase();
    for (const [key, keywords] of Object.entries(ROUTING_KEYWORDS)) {
      if (keywords.some(k => lower.includes(k))) return AGENTS[key];
    }
    return AGENTS.ASSISTANT;
  }

  async function callClaude(messages, systemPrompt, maxTokens) {
    const body = { model: CONFIG.MODEL, max_tokens: maxTokens || CONFIG.MAX_TOKENS, messages };
    if (systemPrompt) body.system = systemPrompt;

    // Support optional API key injection for dev
    const headers = { 'Content-Type': 'application/json' };
    if (window.ANTHROPIC_API_KEY) {
      headers['x-api-key'] = window.ANTHROPIC_API_KEY;
      headers['anthropic-version'] = '2023-06-01';
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
    }

    const res = await fetch(CONFIG.API_ENDPOINT, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `API ${res.status}`); }
    const data = await res.json();
    return data.content.map(b => b.text || '').join('\n');
  }

  async function chat(userMessage) {
    if (!isOnline()) {
      return { success: false, offline: true, message: "You're currently offline. Please connect to the internet to use ProBooks AI." };
    }
    try {
      const agent = routeToAgent(userMessage);
      currentAgent = agent;
      conversationHistory.push({ role: 'user', content: userMessage });
      const history = conversationHistory.slice(-20);
      let system = agent.systemPrompt;
      if (Object.keys(financialContext).length) system += `\n\nContext: ${JSON.stringify(financialContext)}`;
      const response = await callClaude(history, system);
      conversationHistory.push({ role: 'assistant', content: response });
      return { success: true, agent, message: response };
    } catch (err) {
      return { success: false, error: true, message: `ProBooks AI error: ${err.message}` };
    }
  }

  function setContext(ctx) { financialContext = { ...financialContext, ...ctx }; }
  function clearHistory() { conversationHistory = []; currentAgent = null; }

  return { chat, setContext, clearHistory, isOnline, currentAgent: () => currentAgent, AGENTS, version: '2.0.0' };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ProBooksAI;
