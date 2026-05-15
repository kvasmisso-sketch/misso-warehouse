import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    console.log('Service Worker зарегистрирован');
  }).catch(err => {
    console.log('Помилка Service Worker:', err);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
