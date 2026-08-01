import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeRevenueCat } from './lib/revenuecat';

// IndexedDB initialises lazily on first query — no explicit init needed here.
// All data is local; no API base URL or token setup required.
// RevenueCat must be initialised at startup (before React mounts) so
// CustomerInfo and Offerings queries resolve on first render.
initializeRevenueCat();

createRoot(document.getElementById('root')!).render(<App />);
