"use client";
import {
  BanksiClient
} from "./chunk-7MKH6B3K.mjs";

// src/react.tsx
import { useState, useEffect, useCallback } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
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
  const [client] = useState(() => new BanksiClient(config));
  const [chains, setChains] = useState([]);
  const [step, setStep] = useState("idle");
  const [selectedChain, setSelectedChain] = useState(chainId || "");
  const [selectedToken, setSelectedToken] = useState(tokenId || "");
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (step === "select" && chains.length === 0) {
      client.listChains().then(setChains).catch(() => setError("Failed to load chains"));
    }
  }, [step, chains.length, client]);
  useEffect(() => {
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
  const handlePay = useCallback(async () => {
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
  const handleCopy = useCallback(async () => {
    if (!payment) return;
    await navigator.clipboard.writeText(payment.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  }, [payment]);
  if (step === "idle") {
    return /* @__PURE__ */ jsx("button", { onClick: () => chainId && tokenId ? handlePay() : setStep("select"), className: className || "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700", children: children || `Pay $${amount.toFixed(2)}` });
  }
  const selectedChainData = chains.find((c) => c.id === selectedChain);
  return /* @__PURE__ */ jsxs("div", { className: "w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-lg space-y-4", children: [
    error && /* @__PURE__ */ jsx("p", { className: "text-sm text-red-600", children: error }),
    step === "select" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-gray-700", children: "Select network & token" }),
      /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: chains.map((c) => /* @__PURE__ */ jsx(
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
      selectedChainData && /* @__PURE__ */ jsx("div", { className: "flex gap-2", children: selectedChainData.tokens.map((tk) => /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setSelectedToken(tk.id),
          className: `rounded-lg border px-3 py-1.5 text-xs font-medium ${selectedToken === tk.id ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600"}`,
          children: tk.symbol
        },
        tk.id
      )) }),
      selectedToken && /* @__PURE__ */ jsxs("button", { onClick: handlePay, className: "w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700", children: [
        "Pay $",
        amount.toFixed(2)
      ] }),
      /* @__PURE__ */ jsx("button", { onClick: () => setStep("idle"), className: "text-xs text-gray-400 hover:text-gray-600", children: "Cancel" })
    ] }),
    step === "paying" && payment && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500", children: "Send exactly" }),
      /* @__PURE__ */ jsxs("p", { className: "text-lg font-bold text-gray-900", children: [
        payment.amountExpected,
        " ",
        payment.tokenSymbol
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-xs text-gray-500", children: [
        "on ",
        payment.chainName
      ] }),
      /* @__PURE__ */ jsx("button", { onClick: handleCopy, className: "w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 font-mono text-xs text-gray-800 break-all text-left hover:bg-gray-100", children: payment.address }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-center text-gray-400", children: copied ? "Copied!" : "Tap to copy" }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs text-gray-500", children: [
        /* @__PURE__ */ jsxs("span", { className: "relative flex h-2 w-2", children: [
          /* @__PURE__ */ jsx("span", { className: "absolute h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" }),
          /* @__PURE__ */ jsx("span", { className: "relative h-2 w-2 rounded-full bg-amber-400" })
        ] }),
        "Waiting for payment..."
      ] })
    ] }),
    step === "done" && /* @__PURE__ */ jsxs("div", { className: "text-center py-2", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-3", children: /* @__PURE__ */ jsx("svg", { className: "h-6 w-6 text-green-600", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2.5, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 13l4 4L19 7" }) }) }),
      /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-green-700", children: "Payment Confirmed" })
    ] })
  ] });
}
export {
  BanksiClient,
  BanksiPayButton
};
