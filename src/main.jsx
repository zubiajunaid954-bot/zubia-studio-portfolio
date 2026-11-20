import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { useStore } from './store'
import { FILM } from './film'
import './styles.css'

// the welcome always starts in the lobby, not wherever the browser restored the scroll to
if (!useStore.getState().introDone && !useStore.getState().lite && !location.hash) {
  history.scrollRestoration = 'manual'
  window.scrollTo(0, 0)
}

// canvas-drawn 3D signs need the web fonts before they are painted
Promise.all([document.fonts.load('800 64px Sora'), document.fonts.load('600 64px Sora')])
  .catch(() => {})
  .finally(() => useStore.getState().setFontsReady())

if (FILM) window.__studio = useStore // lets the recording script move between rooms

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
