import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { registerSW } from 'virtual:pwa-register'

// Neue Versionen sofort laden; zusätzlich stündlich nach Updates schauen
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000)
  },
})

// Alten Aufnahme-Cache (vor dem Austausch der deutschen Aufnahmen) aufräumen
if (typeof caches !== 'undefined') void caches.delete('audio').catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
