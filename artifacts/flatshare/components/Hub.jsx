"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckSquare, FileText, Home, Loader2, Upload, Volume2 } from "lucide-react";

const roommates = [
  { name: "Sarah", initials: "SA" },
  { name: "Amir", initials: "AM" },
  { name: "Mei", initials: "ME" },
  { name: "Jake", initials: "JA" },
];

const bills = [
  { name: "Electricity", amount: 120, payer: "Sarah", due: "Due 18 May", code: "EL" },
  { name: "Wifi", amount: 36, payer: "Amir", due: "Due 22 May", code: "WF" },
];

const tabs = [
  { id: "bills", label: "Bills", Icon: Home },
  { id: "docs", label: "Docs", Icon: FileText },
  { id: "chores", label: "Chores", Icon: CheckSquare },
];

function initials(name) {
  return name.slice(0, 2).toUpperCase();
}

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
  const [chores, setChores] = useState([
    { id: "bins", name: "Take out bins", assignee: "Mei", due: "Today", done: false },
    { id: "bathroom", name: "Clean bathroom", assignee: "Jake", due: "Tomorrow", done: false },
    { id: "kitchen", name: "Wipe down kitchen", assignee: "Sarah", due: "Thu, 23 May", done: true },
  ]);
  const [documentText, setDocumentText] = useState("");
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

  function toggleChore(id) {
    setChores((current) => current.map((chore) => chore.id === id ? { ...chore, done: !chore.done } : chore));
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
        body: JSON.stringify({ documentText: text, targetLanguage: language }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(await getApiError(response, `Analysis failed (${response.status}). Please try again.`));
      }
      const payload = await response.json();
      if (
        typeof payload.summary !== "string" ||
        typeof payload.translation !== "string" ||
        !payload.summary.trim() ||
        !payload.translation.trim()
      ) {
        throw new Error("We couldn't read the analysis response. Please try again.");
      }
      setSummary(payload.summary.trim());
      setTranslation(payload.translation.trim());
    } catch (error) {
      if (error.name !== "AbortError") {
        const message = error.message || "Something went wrong. Please try again.";
        setAnalyzeError(message);
        alert(message);
      }
    } finally {
      if (analysisRequest.current === controller) setIsLoading(false);
    }
  }

  async function listenToTranslation() {
    if (!translation || audioLoading) return;
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
        body: JSON.stringify({ text: translation }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(await getApiError(response, `Audio could not be created (${response.status}). Try again.`));
      }
      const blob = await response.blob();
      if (blob.type && !blob.type.includes("audio/mpeg")) {
        throw new Error("The audio response was not in MP3 format. Please try again.");
      }
      const nextUrl = URL.createObjectURL(new Blob([blob], { type: "audio/mpeg" }));
      setAudioUrl(nextUrl);
      requestAnimationFrame(() => audioRef.current?.play().catch(() => {
        setAudioError("Audio is ready, but playback was blocked. Use the player controls to listen.");
      }));
    } catch (error) {
      if (error.name !== "AbortError") setAudioError(error.message || "Audio playback is unavailable. Please try again.");
    } finally {
      if (audioRequest.current === controller) setAudioLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Household navigation and housemates">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><Home size={18} strokeWidth={2.4} /></div>
          <span className="brand-word">flatshare</span>
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
          <span className="month-pill">May 2024</span>
          <div className="profile"><span className="profile-avatar" aria-hidden="true">SA</span> Sarah</div>
        </header>

        <div className="page-content">
          <div className="dashboard-intro">
            <span className="intro-copy">A little more in sync, every day.</span>
            <span className="billing-cycle"><span className="cycle-dot" /> Home is up to date</span>
          </div>
          <section className="summary-grid" aria-label="Home at a glance">
            <article className="summary-card primary">
              <div className="summary-label">Your share this month</div>
              <div className="summary-value">£39.00</div>
              <div className="summary-note">Across 2 shared household bills</div>
            </article>
            <article className="summary-card">
              <div className="summary-label">House bills</div>
              <div className="summary-value">£156</div>
              <div className="summary-note"><span className="positive">2 bills</span> split equally</div>
            </article>
            <article className="summary-card">
              <div className="summary-label">Chores done</div>
              <div className="summary-value">1 <span style={{ fontSize: 15, color: "#89948c", fontWeight: 600 }}>/ 3</span></div>
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
                  <span className="count-label">2 this month</span>
                </div>
                <div className="bill-list">
                  {bills.map((bill) => (
                    <div className="bill-row" key={bill.name}>
                      <div className="bill-name-cell">
                        <span className="bill-symbol" aria-hidden="true">{bill.code}</span>
                        <div><div className="bill-name">{bill.name}</div><div className="bill-due">{bill.due}</div></div>
                      </div>
                      <div className="bill-paid"><div className="detail-label">Paid by</div><div className="detail-value">{bill.payer}</div></div>
                      <div className="bill-amount"><div className="detail-label">Each pays</div><div className="detail-value">£{(bill.amount / roommates.length).toFixed(2)}</div></div>
                      <div className="bill-total">£{bill.amount.toFixed(2)}<span>total</span></div>
                    </div>
                  ))}
                </div>
                <div className="split-panel">
                  <div className="split-head"><strong>Monthly split</strong><span>£39.00 per person · 4 housemates</span></div>
                </div>
              </div>
            )}

            {activeTab === "chores" && (
              <div className="hub-body" id="panel-chores" role="tabpanel">
                <div className="section-top">
                  <div><h3>Little jobs, shared fairly</h3><p>Check things off as you go. No group chat required.</p></div>
                  <span className="count-label">{chores.filter((chore) => chore.done).length} of {chores.length} done</span>
                </div>
                <div className="chores-list">
                  {chores.map((chore) => (
                    <label className={`chore-row ${chore.done ? "done" : ""}`} key={chore.id}>
                      <input className="chore-check" type="checkbox" checked={chore.done} onChange={() => toggleChore(chore.id)} aria-label={`${chore.done ? "Mark incomplete" : "Mark complete"}: ${chore.name}`} />
                      <span className="chore-copy">{chore.name}</span>
                      <span className="chore-assignee">{chore.assignee}</span>
                      <span className="chore-due">{chore.due}</span>
                    </label>
                  ))}
                </div>
                <div className="footer-note"><span className="footer-mark" /> A fair turn makes a happy home.</div>
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
                  <div>
                    <label className="field-label" htmlFor="document-text">Document text</label>
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
                      <div><div className="result-label">Plain-English summary</div><div className="result-text">{summary}</div></div>
                      <div><div className="result-label">{language} translation</div><div className="result-text">{translation}</div></div>
                    </div>
                    <button type="button" className="listen-button" onClick={listenToTranslation} disabled={audioLoading || !translation}>
                      {audioLoading ? <Loader2 aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
                      {audioLoading ? "Preparing audio…" : "Listen to Translation"}
                    </button>
                    {audioError && <div className="error-box" role="alert" style={{ marginTop: 10 }}><span>{audioError}</span><button type="button" className="retry-button" onClick={listenToTranslation} disabled={audioLoading}>Try again</button></div>}
                    {audioUrl && <audio ref={audioRef} className="audio-player" controls src={audioUrl} aria-label="Translated document audio" />}
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
