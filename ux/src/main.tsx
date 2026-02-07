import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

console.log('Mounting React App (Dynamic)...');

async function init() {
  try {
    const rootEl = document.getElementById('root');
    if (!rootEl) throw new Error('Root element not found');

    // Dynamic import to catch module evaluation errors
    console.log('Importing App module...');
    const { default: App } = await import('./App');
    console.log('App module imported successfully');

    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    console.log('React App mounted successfully');
  } catch (e) {
    console.error('React App mount/import failed:', e);
    document.body.innerHTML = `
      <div style="color: #ff453a; background: #1c1c1e; padding: 40px; font-family: sans-serif; height: 100vh;">
        <h1 style="border-bottom: 2px solid #ff453a; padding-bottom: 10px;">Application Crash</h1>
        <p style="font-size: 1.2em; opacity: 0.8;">The application failed to start.</p>
        <div style="background: #000; padding: 20px; border-radius: 8px; overflow: auto; margin-top: 20px;">
          <pre style="color: #ff453a; margin: 0;">${e instanceof Error ? e.stack : String(e)}</pre>
        </div>
      </div>
    `;
  }
}

init();
