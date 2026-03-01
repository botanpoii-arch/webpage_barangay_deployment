import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// --- 🛑 CONSOLE SILENCER BLOCK ---
// This overrides the browser's default log functions with empty ones.
// It hides white text logs, yellow warnings, and red stack traces from React.
// Note: It cannot hide browser-level network errors (net::ERR_...) as those are forced by Chrome/Edge.
if (true) { // Change 'true' to 'import.meta.env.PROD' if you only want this in production later
  const emptyFunction = () => {};
  
  console.log = emptyFunction;
  console.warn = emptyFunction;
  console.error = emptyFunction;
  console.info = emptyFunction;
  console.debug = emptyFunction;
  console.table = emptyFunction;
  console.trace = emptyFunction;
}
// ---------------------------------

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)