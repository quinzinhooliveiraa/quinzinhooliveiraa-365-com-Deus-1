import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./utils/pushNotifications";
import { isNativePlatform, setupAppListeners } from "./utils/capacitor";

if (isNativePlatform()) {
  setupAppListeners();
} else {
  registerServiceWorker();
}

createRoot(document.getElementById("root")!).render(<App />);
