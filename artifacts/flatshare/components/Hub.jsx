"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckSquare, FileText, Home, Loader2, Upload, Plus, CheckCircle } from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const roommates = [
  { name: "Sarah", initials: "SA" },
  { name: "Amir", initials: "AM" },
  { name: "Mei", initials: "ME" },
  { name: "Jake", initials: "JA" },
];

const tabs = [
  { id: "bills", label: "Bills", Icon: Home },
  { id: "docs", label: "Docs", Icon: FileText },
  { id: "chores", label: "Chores", Icon: CheckSquare },
];

async function getApiError(response, fallback) {
  let payload;
  try {
    const contentType = response.headers.get("content-type") || "";
    payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch {
    payload = null;
  }
  if (typeof payload === "string" && payload.trim()) {
    try {
      payload = JSON.parse(payload);
    } catch {
      return payload.trim();
    }
  }
  const message = payload?.error ?? payload?.message;
  return typeof message === "string" && message.trim()
    ? message.trim()
    : fallback;
}

export default function Hub() {
  const [activeTab, setActiveTab] = useState("bills");
  
  // --- BILLS STATE ---
  const [bills, setBills] = useState([
    { id: 1, name: "Electricity - October", amount: 120, payer: "Sarah", split: 4, settled: false, due: "Pending" },
    { id: 2, name: "Wifi - October", amount: 36, payer: "Amir", split: 4, settled: false, due: "Pending" },
  ]);
  const [newBillName, setNewBillName] = useState("");
  const [newBillAmount, setNewBillAmount] = useState("");
  const [newBillPayer, setNewBillPayer] = useState("Sarah");

  // --- CHORES STATE ---
  const [chores, setChores] = useState([
    { id: "bins", name: "Take out bins", assignee: "Mei", due: "Today", done: false },
    { id: "bathroom", name: "Clean bathroom", assignee: "Jake", due: "Tomorrow", done: false },
    { id: "kitchen", name: "Wipe down kitchen", assignee: "Sarah", due: "Thu, 23 May", done: true },
  ]);
  const [newChoreName, setNewChoreName] = useState("");
  const [newChoreAssignee, setNewChoreAssignee] = useState("Unassigned");
  const [newChoreDue, setNewChoreDue] = useState("");

  // --- DOCS STATE ---
  const [documentText, setDocumentText] = useState("");
  const [fileName, setFileName] = useState("");
  const [language, setLanguage] = useState("Spanish");
  const [summary, setSummary] = useState("");
  const [translation, setTranslation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const audioRef = useRef(null);
  const analysisRequest = useRef(null);
  const audioRequest = useRef(null);

  // --- FX STATE ---
  const [fxCurrency, setFxCurrency] = useState("GBP"); 
  const exchangeRates = {
    GBP: { symbol: "£", rate: 1.00, name: "British Pounds" },
    EUR: { symbol: "€", rate: 1.17, name: "Euros" },
    USD: { symbol: "$", rate: 1.27, name: "US Dollars" },
    INR: { symbol: "₹", rate: 105.50, name: "Indian Rupees" },
    CNY: { symbol: "¥", rate: 9.20, name: "Chinese Yuan" },
  };

  // --- DYNAMIC CALCULATIONS ---
  const unsettledBills = bills.filter(b => !b.settled);
  const totalUnsettled = unsettledBills.reduce((sum, bill) => sum + bill.amount, 0);
  const myShare = unsettledBills.reduce((sum, bill) => sum + (bill.amount / bill.split), 0).toFixed(2);
  const completedChores = chores.filter(c => c.done).length;

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => () => {
    analysisRequest.current?.abort();
    audioRequest.current?.abort();
  }, []);

  function remind(name) {
    alert(`Reminder email sent to ${name}!`);
  }

  // --- BILL FUNCTIONS ---
  function addBill(e) {
    e.preventDefault();
    if (!newBillName.trim() || !newBillAmount) return;

    const newBill = {
      id: Date.now(),
      name: newBillName.trim(),
      amount: parseFloat(newBillAmount),
      payer: newBillPayer,
      split: 4,
      settled: false,
      due: "Added manually"
    };

    setBills([...bills, newBill]);
    setNewBillName("");
    setNewBillAmount("");
  }

  function toggleBillSettled(id) {
    setBills(bills.map(b => b.id === id ? { ...b, settled: !b.settled } : b));
  }

  // --- CHORE FUNCTIONS ---
  function toggleChore(id) {
    setChores((current) => current.map((chore) => chore.id === id ? { ...chore, done: !chore.done } : chore));
  }

  function addChore(e) {
    e.preventDefault();
    if (!newChoreName.trim()) return;
    const newChore = {
      id: Date.now().toString(),
      name: newChoreName.trim(),
      assignee: newChoreAssignee,
      due: newChoreDue ? newChoreDue : "No date",
      done: false,
    };
    setChores([...chores, newChore]);
    setNewChoreName("");
    setNewChoreAssignee("Unassigned");
    setNewChoreDue("");
  }

  // --- DOC FUNCTIONS ---
  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setAnalyzeError("");
    setDocumentText(""); 

    if (file.type === "application/pdf") {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item) => item.str).join(" ");
          fullText += pageText + "\n";
        }
        setDocumentText(fullText);
      } catch (error) {
        setAnalyzeError("Failed to read the PDF. Please try pasting the text instead.");
      }
    } else {
      const text = await file.text();
      setDocumentText(text);
    }
  }

  async function analyzeDocument() {
    const text = documentText.trim();
    if (!text || isLoading) return;
    analysisRequest.current?.abort();
    const controller = new AbortController();
    analysisRequest.current = controller;
    setIsLoading(true);
    setAnalyzeError("");
    setAudioError("");
    setSummary("");
    setTranslation("");
    
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
        signal: controller.signal,
      });
      
      if (!response.ok) {
        throw new Error(await getApiError(response, `Analysis failed (${response.status}). Please try again.`));
      }
      
      const payload = await response.json();
      
      let finalSummary = "";
      let finalTranslation = "";
      let finalBill = null;

      if (payload.summary && payload.translation) {
        finalSummary = payload.summary;
        finalTranslation = payload.translation;
        finalBill = payload.extractedBill;
      } else {
        const rawString = payload.summary || payload.translation || JSON.stringify(payload);
        const firstBrace = rawString.indexOf("{");
        const lastBrace = rawString.lastIndexOf("}");
        
        if (firstBrace !== -1 && lastBrace !== -1) {
          try {
            const parsed = JSON.parse(rawString.slice(firstBrace, lastBrace + 1));
            finalSummary = parsed.summary;
            finalTranslation = parsed.translation;
            finalBill = parsed.extractedBill;
          } catch (e) {
            throw new Error("The AI response was garbled. Please try again.");
          }
        } else {
          finalSummary = rawString;
          finalTranslation = rawString;
        }
      }

      if (!finalSummary || !finalTranslation) {
        throw new Error("We couldn't read the analysis response. Please try again.");
      }

      const formatText = (val) => {
        if (typeof val === "string") return val.trim();
        if (Array.isArray(val)) return val.join("\n");
        if (typeof val === "object" && val !== null) return JSON.stringify(val, null, 2);
        return String(val).trim();
      };

      const safeSummary = formatText(finalSummary);
      const safeTranslation = formatText(finalTranslation);

      setSummary(safeSummary); 
      setTranslation(safeTranslation);

      if (finalBill) {
        const newBill = {
          id: Date.now(),
          name: finalBill.name || "Extracted Bill",
          amount: parseFloat(finalBill.amount) || 0,
          payer: "Sarah", 
          split: 4,
          settled: false,
          due: finalBill.dueDate || "From Document"
        };
        
        setBills((prevBills) => [...prevBills, newBill]);
        
        setTimeout(() => {
          alert(`🤖 AI Agent extracted a bill from your document: ${newBill.name} (£${newBill.amount}). It has been added to your Bills tab!`);
          setActiveTab("bills");
        }, 500);
      }

    } catch (error) {
      if (error.name !== "AbortError") {
        const message = error.message || "Something went wrong. Please try again.";
        setAnalyzeError(message);
        console.error("Analysis Error:", error);
      }
    } finally {
      if (analysisRequest.current === controller) setIsLoading(false);
    }
  }

  async function listenToSummary() {
    if (!summary || audioLoading) return;
    audioRequest.current?.abort();
    const controller = new AbortController();
    audioRequest.current = controller;
    setAudioLoading(true);
    setAudioError("");
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl("");
    }
    try {
      const response = await fetch("/api/elevenlabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: summary }), 
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(await getApiError(response, "Audio failed."));
      const blob = await response.blob();
      const nextUrl = URL.createObjectURL(new Blob([blob], { type: "audio/mpeg" }));
      setAudioUrl(nextUrl);
      requestAnimationFrame(() => audioRef.current?.play().catch(() => {
        setAudioError("Audio ready. Click play.");
      }));
    } catch (error) {
      if (error.name !== "AbortError") setAudioError(error.message || "Audio playback unavailable.");
    } finally {
      if (audioRequest.current === controller) setAudioLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Household navigation and housemates">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><Home size={18} strokeWidth={2.4} /></div>
          <span className="brand-word">Pact</span>
        </div>
        <div className="home-label">Your home</div>
        <nav className="side-nav" aria-label="Shared home sections">
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} className={`nav-tab ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)} aria-current={activeTab === id ? "page" : undefined}>
              <Icon size={17} strokeWidth={1.9} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <section className="sidebar-roommates" aria-label="Housemates">
          <div className="sidebar-roommates-heading">
            <span className="home-label">Housemates</span>
            <span className="sidebar-nudge-label">Knudge</span>
          </div>
          <div className="sidebar-roommate-list">
            {roommates.map((person) => (
              <div className="sidebar-roommate" key={person.name}>
                <span className="sidebar-avatar" aria-hidden="true">{person.initials}</span>
                <span className="sidebar-roommate-name">{person.name}</span>
                <button type="button" className="sidebar-knudge" onClick={() => remind(person.name)} aria-label={`Send reminder email to ${person.name}`} title={`Knudge ${person.name}`}>
                  <Bell aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </section>
        <div className="side-bottom">
          <div className="house-status"><span className="status-dot" /> Cedar House</div>
          Four housemates, one calmer home.
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="top-house">Cedar House <span aria-hidden="true">/</span> Home overview</div>
          <span className="month-pill">October 2026</span>
          <div className="profile"><span className="profile-avatar" aria-hidden="true">SA</span> Sarah</div>
        </header>

        <div className="page-content">
          <div className="dashboard-intro">
            <span className="intro-copy">A little more in sync, every day.</span>
            <span className="billing-cycle"><span className="cycle-dot" /> Home is up to date</span>
          </div>
          
          {/* HERO WISE FX BANNER */}
          <section style={{ marginBottom: "20px" }}>
            <article style={{ background: "#163300", color: "white", padding: "24px", borderRadius: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#9FE870", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
                  Wise International Share
                </div>
                <div style={{ fontSize: "42px", fontWeight: "800", lineHeight: "1" }}>
                  {exchangeRates[fxCurrency].symbol}{(myShare * exchangeRates[fxCurrency].rate).toFixed(2)}
                </div>
                <div style={{ fontSize: "14px", color: "#9ca3af", marginTop: "8px" }}>
                  Your share of £{myShare} GBP converted at zero-fee rates.
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ fontSize: "12px", color: "#9FE870", fontWeight: "bold" }}>SELECT CURRENCY</label>
                <select 
                  value={fxCurrency} 
                  onChange={(e) => setFxCurrency(e.target.value)}
                  style={{ padding: "12px", borderRadius: "8px", border: "none", fontSize: "16px", fontWeight: "bold", cursor: "pointer", background: "white", color: "#163300", outline: "none" }}
                >
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="CNY">CNY (¥)</option>
                </select>
              </div>
            </article>
          </section>

          {/* ORIGINAL SUMMARY CARDS */}
          <section className="summary-grid" aria-label="Home at a glance">
            <article className="summary-card primary">
              <div className="summary-label">Your share this month</div>
              <div className="summary-value">£{myShare}</div>
              <div className="summary-note">Across {unsettledBills.length} unsettled bills</div>
            </article>
            <article className="summary-card">
              <div className="summary-label">House bills</div>
              <div className="summary-value">£{totalUnsettled.toFixed(2)}</div>
              <div className="summary-note"><span className="positive">{unsettledBills.length} bills</span> outstanding</div>
            </article>
            <article className="summary-card">
              <div className="summary-label">Chores done</div>
              <div className="summary-value">{completedChores} <span style={{ fontSize: 15, color: "#89948c", fontWeight: 600 }}>/ {chores.length}</span></div>
              <div className="summary-note">A good start to the week</div>
            </article>
          </section>

          <section className="hub-card" aria-label="Shared home hub">
            <div className="hub-head">
              <div>
                <h2 className="hub-title">Your household hub</h2>
                <div className="hub-caption">The important things, all in one place.</div>
              </div>
            </div>
            <div className="hub-tabs" role="tablist" aria-label="Household tools">
              {tabs.map(({ id, label, Icon }) => (
                <button key={id} className={`hub-tab ${activeTab === id ? "selected" : ""}`} onClick={() => setActiveTab(id)} role="tab" aria-selected={activeTab === id} aria-controls={`panel-${id}`}>
                  <Icon aria-hidden="true" /><span>{label}</span>
                </button>
              ))}
            </div>

            {activeTab === "bills" && (
              <div className="hub-body" id="panel-bills" role="tabpanel">
                <div className="section-top">
                  <div><h3>Shared bills</h3><p>Every bill, split fairly between the four of you.</p></div>
                  <span className="count-label">{unsettledBills.length} outstanding</span>
                </div>
                <div className="bill-list">
                  {bills.map((bill) => (
                    <div className="bill-row" key={bill.id} style={{ opacity: bill.settled ? 0.5 : 1, background: bill.settled ? "#f4f7f2" : "white" }}>
                      <div className="bill-name-cell">
                        <div>
                          <div className="bill-name" style={{ textDecoration: bill.settled ? "line-through" : "none" }}>{bill.name}</div>
                          <div className="bill-due">{bill.settled ? "Settled" : `Due: ${bill.due}`}</div>
                        </div>
                      </div>
                      <div className="bill-paid"><div className="detail-label">Paid by</div><div className="detail-value">{bill.payer}</div></div>
                      
                      {/* NEW: Show YOUR SHARE as the big number, and TOTAL as small text */}
                      <div className="bill-amount">
                        <div className="detail-label">Your share</div>
                        <div className="detail-value" style={{ color: "#163300", fontSize: "18px", fontWeight: "bold" }}>
                          £{(bill.amount / bill.split).toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="bill-total" style={{ display: "flex", alignItems: "center", gap: "10px", flexDirection: "column", alignItems: "flex-end" }}>
                        <span style={{ fontSize: "12px", color: "#89948c" }}>£{bill.amount.toFixed(2)} total</span>
                        <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
                          <button 
                            onClick={() => toggleBillSettled(bill.id)}
                            style={{ padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", background: bill.settled ? "#deead8" : "#9FE870", color: "#163300", fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px" }}
                          >
                            {bill.settled ? <><CheckCircle size={14}/> Settled</> : "Settle"}
                          </button>
                          {!bill.settled && (
                            <button
                              onClick={() => alert(`💸 Wise Transfer Initiated!\n\nSending ${exchangeRates[fxCurrency].symbol}${( (bill.amount / bill.split) * exchangeRates[fxCurrency].rate).toFixed(2)} to ${bill.payer} via Wise.`)}
                              style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #9FE870", cursor: "pointer", background: "white", color: "#163300", fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px" }}
                            >
                              Send via Wise
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={addBill} style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap", background: "#f9fbf8", padding: "15px", borderRadius: "12px", border: "1px solid #deead8" }}>
                  <input type="text" placeholder="Bill name (e.g. Water)" value={newBillName} onChange={(e) => setNewBillName(e.target.value)} style={{ flex: "1 1 200px", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} required />
                  <input type="number" placeholder="Amount (£)" value={newBillAmount} onChange={(e) => setNewBillAmount(e.target.value)} style={{ flex: "1 1 100px", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} required />
                  <select value={newBillPayer} onChange={(e) => setNewBillPayer(e.target.value)} style={{ flex: "1 1 120px", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", background: "white" }}>
                    {roommates.map((r) => <option key={r.name} value={r.name}>Paid by {r.name}</option>)}
                  </select>
                  <button type="submit" style={{ flex: "0 0 auto", padding: "10px 20px", backgroundColor: "#163300", color: "white", borderRadius: "8px", fontWeight: "bold", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
                    <Plus size={16} /> Add Bill
                  </button>
                </form>
              </div>
            )}

            {activeTab === "chores" && (
              <div className="hub-body" id="panel-chores" role="tabpanel">
                <div className="section-top">
                  <div><h3>Little jobs, shared fairly</h3><p>Check things off as you go. No group chat required.</p></div>
                  <span className="count-label">{completedChores} of {chores.length} done</span>
                </div>
                <div className="chores-list">
                  {chores.map((chore) => (
                    <label className={`chore-row ${chore.done ? "done" : ""}`} key={chore.id}>
                      <input className="chore-check" type="checkbox" checked={chore.done} onChange={() => toggleChore(chore.id)} aria-label={`Mark complete: ${chore.name}`} />
                      <span className="chore-copy">{chore.name}</span>
                      <span className="chore-assignee">{chore.assignee}</span>
                      <span className="chore-due">{chore.due}</span>
                    </label>
                  ))}
                </div>
                <form onSubmit={addChore} style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap", background: "#f9fbf8", padding: "15px", borderRadius: "12px", border: "1px solid #deead8" }}>
                  <input type="text" value={newChoreName} onChange={(e) => setNewChoreName(e.target.value)} placeholder="Chore name..." style={{ flex: "1 1 200px", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} required />
                  <select value={newChoreAssignee} onChange={(e) => setNewChoreAssignee(e.target.value)} style={{ flex: "1 1 120px", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", background: "white" }}>
                    <option value="Unassigned">Unassigned</option>
                    {roommates.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
                  </select>
                  <input type="date" value={newChoreDue} onChange={(e) => setNewChoreDue(e.target.value)} style={{ flex: "1 1 120px", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", background: "white" }} />
                  <button type="submit" style={{ flex: "0 0 auto", padding: "10px 20px", backgroundColor: "#9FE870", color: "#163300", borderRadius: "8px", fontWeight: "bold", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
                    <Plus size={16} /> Add
                  </button>
                </form>
                <div className="footer-note" style={{ marginTop: "15px" }}><span className="footer-mark" /> A fair turn makes a happy home.</div>
              </div>
            )}

            {activeTab === "docs" && (
              <div className="hub-body" id="panel-docs" role="tabpanel">
                <div className="section-top">
                  <div><h3>Make sense of a document</h3><p>Understand the essentials, in the language that feels like home.</p></div>
                  <span className="count-label">Private to your home</span>
                </div>
                <form className="docs-form" onSubmit={(event) => { event.preventDefault(); analyzeDocument(); }}>
                  <p className="docs-intro">Paste a letter, tenancy clause, or household notice. We’ll give you a clear summary and translate it for your housemate.</p>
                  <div style={{ marginBottom: "20px", padding: "15px", background: "#f9fbf8", border: "1px dashed #c3d9b9", borderRadius: "8px" }}>
                    <label className="field-label" style={{ display: "block", marginBottom: "8px" }}>Upload a Document (PDF or TXT)</label>
                    <input type="file" accept=".pdf,.txt" onChange={handleFileUpload} style={{ display: "block", width: "100%", fontSize: "14px" }} />
                    {fileName && <p style={{ fontSize: "13px", color: "#4a7c3f", marginTop: "8px", fontWeight: "bold" }}>✅ Loaded: {fileName}</p>}
                  </div>
                  <div>
                    <label className="field-label" htmlFor="document-text">Or paste text manually</label>
                    <textarea id="document-text" className="document-text" value={documentText} onChange={(event) => { setDocumentText(event.target.value); setAnalyzeError(""); }} placeholder="Paste the text you want help understanding…" maxLength={12000} />
                    <div className="count-label" style={{ textAlign: "right", marginTop: 5 }}>{documentText.length.toLocaleString()} / 12,000</div>
                  </div>
                  <div className="docs-controls">
                    <div>
                      <label className="field-label" htmlFor="translation-language">Translate into</label>
                      <select id="translation-language" className="language-select" value={language} onChange={(event) => setLanguage(event.target.value)}>
                        {["Spanish", "Mandarin", "French", "Arabic"].map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </div>
                    <div>
                      <button className="primary-action" type="submit" disabled={!documentText.trim() || isLoading}>
                        {isLoading ? <Loader2 aria-hidden="true" /> : <Upload aria-hidden="true" />}
                        {isLoading ? "Analyzing…" : "Analyze"}
                      </button>
                    </div>
                  </div>
                </form>
                {isLoading && <div className="loading-line" role="status"><Loader2 aria-hidden="true" /> Reading your document and preparing a clear translation…</div>}
                {analyzeError && <div className="error-box" role="alert"><span>{analyzeError}</span><button type="button" className="retry-button" onClick={analyzeDocument} disabled={!documentText.trim() || isLoading}>Try again</button></div>}
                {summary && translation && (
                  <div className="result-card" aria-live="polite">
                    <div className="result-header"><FileText aria-hidden="true" /> Your document, made clearer</div>
                    <div className="result-columns">
                      <div style={{ border: "1px solid #deead8", borderRadius: 10, padding: 14, background: "#ffffff" }}>
                        <div className="result-label">Summary · {language}</div>
                        <div className="result-text">{summary}</div>
                        <button type="button" className="listen-button" onClick={listenToSummary} disabled={audioLoading || !summary}>
                          {audioLoading && <Loader2 aria-hidden="true" />}
                          {audioLoading ? "Preparing audio…" : "🔊 Listen to Summary"}
                        </button>
                        {audioError && <div className="error-box" role="alert" style={{ marginTop: 10 }}><span>{audioError}</span><button type="button" className="retry-button" onClick={listenToSummary} disabled={audioLoading}>Try again</button></div>}
                        {audioUrl && <audio ref={audioRef} className="audio-player" controls src={audioUrl} aria-label="Summary audio" />}
                      </div>
                      <div style={{ border: "1px solid #deead8", borderRadius: 10, padding: 14, background: "#ffffff" }}>
                        <div className="result-label">Full Translation · {language}</div>
                        <div className="result-text">{translation}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}