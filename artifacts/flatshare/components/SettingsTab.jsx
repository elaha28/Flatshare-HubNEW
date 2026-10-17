import { Type, Moon, Sun } from "lucide-react";

export default function SettingsTab({ darkMode, setDarkMode, dyslexicFont, setDyslexicFont }) {
  return (
    <div className="hub-body" role="tabpanel">
      <div className="section-top">
        <div><h3>Accessibility & Settings</h3><p>Make your home hub comfortable for you.</p></div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "20px" }}>
        
        {/* DARK MODE TOGGLE */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", background: darkMode ? "#2a2a2a" : "#f9fbf8", borderRadius: "12px", border: "1px solid #deead8" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <div style={{ padding: "10px", background: darkMode ? "#444" : "white", borderRadius: "50%" }}>
              {darkMode ? <Moon size={20} color="#9FE870" /> : <Sun size={20} color="#163300" />}
            </div>
            <div>
              <div style={{ fontWeight: "bold", fontSize: "16px" }}>Dark Mode</div>
              <div style={{ fontSize: "13px", color: "#666" }}>Easy on the eyes at night.</div>
            </div>
          </div>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            style={{ padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", background: darkMode ? "#9FE870" : "#163300", color: darkMode ? "#163300" : "white" }}
          >
            {darkMode ? "ON" : "OFF"}
          </button>
        </div>

        {/* DYSLEXIC FONT TOGGLE */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", background: darkMode ? "#2a2a2a" : "#f9fbf8", borderRadius: "12px", border: "1px solid #deead8" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <div style={{ padding: "10px", background: darkMode ? "#444" : "white", borderRadius: "50%" }}>
              <Type size={20} color={dyslexicFont ? "#9FE870" : "#163300"} />
            </div>
            <div>
              <div style={{ fontWeight: "bold", fontSize: "16px" }}>Dyslexia-Friendly Font</div>
              <div style={{ fontSize: "13px", color: "#666" }}>Switches to OpenDyslexic for easier reading.</div>
            </div>
          </div>
          <button 
            onClick={() => setDyslexicFont(!dyslexicFont)}
            style={{ padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", background: dyslexicFont ? "#9FE870" : "#163300", color: dyslexicFont ? "#163300" : "white" }}
          >
            {dyslexicFont ? "ON" : "OFF"}
          </button>
        </div>

      </div>
    </div>
  );
}