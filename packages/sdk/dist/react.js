"use strict";
"use client";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/react.tsx
var react_exports = {};
__export(react_exports, {
  BanksiClient: () => BanksiClient,
  BanksiPayButton: () => BanksiPayButton
});
module.exports = __toCommonJS(react_exports);
var import_react = require("react");

// src/client.ts
function getConfig(override) {
  return {
    baseUrl: override?.baseUrl || process.env.BANKSI_URL || "https://banksi.io",
    merchantSlug: override?.merchantSlug || process.env.BANKSI_MERCHANT_SLUG || void 0,
    apiKey: override?.apiKey || process.env.BANKSI_API_KEY || void 0
  };
}
var BanksiClient = class {
  constructor(config) {
    const c = getConfig(config);
    this.baseUrl = c.baseUrl.replace(/\/$/, "");
    this.merchantSlug = c.merchantSlug;
    this.apiKey = c.apiKey;
  }
  headers() {
    const h = { "Content-Type": "application/json" };
    if (this.apiKey) h["Authorization"] = `Bearer ${this.apiKey}`;
    return h;
  }
  async listChains() {
    const res = await fetch(`${this.baseUrl}/api/chains`);
    if (!res.ok) throw new Error(`Banksi API error: ${res.status}`);
    const data = await res.json();
    return data.chains;
  }
  async createPayment(opts) {
    const body = {
      chainId: opts.chainId,
      tokenId: opts.tokenId,
      amount: opts.amount
    };
    if (!this.apiKey) {
      body.merchantSlug = opts.merchantSlug || this.merchantSlug;
    }
    const res = await fetch(`${this.baseUrl}/api/x402/pay`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Banksi API error: ${res.status}`);
    }
    return res.json();
  }
  async verifyPayment(paymentId) {
    const res = await fetch(`${this.baseUrl}/api/payments/${paymentId}/status`, {
      headers: this.headers()
    });
    if (!res.ok) throw new Error(`Banksi API error: ${res.status}`);
    return res.json();
  }
  async isPaymentConfirmed(paymentId) {
    const status = await this.verifyPayment(paymentId);
    return ["CONFIRMED", "SWEPT"].includes(status.status);
  }
};

// src/react.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function BanksiPayButton({
  amount,
  chainId,
  tokenId,
  onPaymentCreated,
  onPaymentConfirmed,
  children,
  className,
  ...config
}) {
  const [client] = (0, import_react.useState)(() => new BanksiClient(config));
  const [chains, setChains] = (0, import_react.useState)([]);
  const [step, setStep] = (0, import_react.useState)("idle");
  const [selectedChain, setSelectedChain] = (0, import_react.useState)(chainId || "");
  const [selectedToken, setSelectedToken] = (0, import_react.useState)(tokenId || "");
  const [payment, setPayment] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)("");
  const [copied, setCopied] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    if (step === "select" && chains.length === 0) {
      client.listChains().then(setChains).catch(() => setError("Failed to load chains"));
    }
  }, [step, chains.length, client]);
  (0, import_react.useEffect)(() => {
    if (!payment || step !== "paying") return;
    const iv = setInterval(async () => {
      try {
        const confirmed = await client.isPaymentConfirmed(payment.paymentId);
        if (confirmed) {
          setStep("done");
          onPaymentConfirmed?.(payment.paymentId);
          clearInterval(iv);
        }
      } catch {
      }
    }, 5e3);
    return () => clearInterval(iv);
  }, [payment, step, client, onPaymentConfirmed]);
  const handlePay = (0, import_react.useCallback)(async () => {
    if (!selectedChain || !selectedToken) return;
    setError("");
    try {
      const result = await client.createPayment({ chainId: selectedChain, tokenId: selectedToken, amount });
      setPayment(result);
      setStep("paying");
      onPaymentCreated?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    }
  }, [client, selectedChain, selectedToken, amount, onPaymentCreated]);
  const handleCopy = (0, import_react.useCallback)(async () => {
    if (!payment) return;
    await navigator.clipboard.writeText(payment.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  }, [payment]);
  if (step === "idle") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => chainId && tokenId ? handlePay() : setStep("select"), className: className || "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700", children: children || `Pay $${amount.toFixed(2)}` });
  }
  const selectedChainData = chains.find((c) => c.id === selectedChain);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-lg space-y-4", children: [
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm text-red-600", children: error }),
    step === "select" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm font-medium text-gray-700", children: "Select network & token" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex flex-wrap gap-2", children: chains.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          onClick: () => {
            setSelectedChain(c.id);
            setSelectedToken("");
          },
          className: `rounded-lg border px-3 py-1.5 text-xs font-medium ${selectedChain === c.id ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600"}`,
          children: c.name
        },
        c.id
      )) }),
      selectedChainData && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex gap-2", children: selectedChainData.tokens.map((tk) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          onClick: () => setSelectedToken(tk.id),
          className: `rounded-lg border px-3 py-1.5 text-xs font-medium ${selectedToken === tk.id ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600"}`,
          children: tk.symbol
        },
        tk.id
      )) }),
      selectedToken && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: handlePay, className: "w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700", children: [
        "Pay $",
        amount.toFixed(2)
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => setStep("idle"), className: "text-xs text-gray-400 hover:text-gray-600", children: "Cancel" })
    ] }),
    step === "paying" && payment && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm text-gray-500", children: "Send exactly" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "text-lg font-bold text-gray-900", children: [
        payment.amountExpected,
        " ",
        payment.tokenSymbol
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "text-xs text-gray-500", children: [
        "on ",
        payment.chainName
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: handleCopy, className: "w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 font-mono text-xs text-gray-800 break-all text-left hover:bg-gray-100", children: payment.address }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-center text-gray-400", children: copied ? "Copied!" : "Tap to copy" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2 text-xs text-gray-500", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "relative flex h-2 w-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "relative h-2 w-2 rounded-full bg-amber-400" })
        ] }),
        "Waiting for payment..."
      ] })
    ] }),
    step === "done" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-center py-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-3", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { className: "h-6 w-6 text-green-600", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2.5, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 13l4 4L19 7" }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm font-semibold text-green-700", children: "Payment Confirmed" })
    ] })
  ] });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BanksiClient,
  BanksiPayButton
});
