import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registro del Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js') // debe coincidir con la ruta generada por Workbox
      .then(reg => console.log('SW registrado:', reg))
      .catch(err => console.log('Error al registrar SW:', err))
  })
}
