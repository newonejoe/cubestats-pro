import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Disable console.log in production builds
if (typeof window !== 'undefined' && !window.location.href.includes('localhost')) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
