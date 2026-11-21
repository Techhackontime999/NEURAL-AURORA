import './i18n';
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { watchServiceWorkerUpdates } from './lib/swUpdates'
import './index.css'

watchServiceWorkerUpdates()

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
