import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function getPlatform(): string {
  return Capacitor.getPlatform();
}

export function setupAppListeners() {
  if (!isNativePlatform()) return;

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.minimizeApp();
    }
  });

  App.addListener('appUrlOpen', ({ url }) => {
    const path = new URL(url).pathname;
    if (path) {
      window.location.href = path;
    }
  });

  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      document.dispatchEvent(new CustomEvent('app-resumed'));
    }
  });
}
