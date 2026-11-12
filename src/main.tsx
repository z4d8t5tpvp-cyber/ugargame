import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { useGame } from './game/store';
import * as util from './game/util';

// Dev-only handles for scripted playtests from the browser console.
if (import.meta.env.DEV) Object.assign(window, { __game: useGame, __util: util });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
