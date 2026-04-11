import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./utils/pushNotifications";
import { isNativePlatform, setupAppListeners } from "./utils/capacitor";

// Save a reference to the native fetch before any browser extension can override it.
// This is used by components that fetch external resources (e.g. Lottie animations)
// so that extension monkey-patches don't intercept and cause unhandled errors.
(window as any).__nativeFetch = window.fetch.bind(window);

if (isNativePlatform()) {
  setupAppListeners();
} else {
  registerServiceWorker();
}

createRoot(document.getElementById("root")!).render(<App />);
