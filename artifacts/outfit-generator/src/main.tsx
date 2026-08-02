import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeRevenueCat } from './lib/revenuecat';
import { startBackgroundIndexer } from './lib/vision';

// RevenueCat must be initialised before React mounts so CustomerInfo and
// Offerings queries resolve on first render.
initializeRevenueCat();

// Start vision indexer in the background after the app is interactive.
// Silently no-ops if all items are already indexed.
startBackgroundIndexer();

createRoot(document.getElementById('root')!).render(<App />);
