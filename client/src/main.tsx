// Cache bust: 20251201-140000 - AUDIO DURATION FIX
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 🚨 LOUD VERSION MARKER - This MUST appear in console
console.log('%c🎵 VAKTAAI BUILD: 2025-12-01-AUDIO-FIX-v3 🎵', 'background: #4CAF50; color: white; font-size: 20px; padding: 10px;');
console.log('%c✅ Audio duration detection ENABLED', 'color: green; font-size: 14px;');
console.log('%c✅ 45 second safety floor ENABLED', 'color: green; font-size: 14px;');

createRoot(document.getElementById("root")!).render(<App />);
