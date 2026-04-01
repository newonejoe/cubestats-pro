import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners, APP_BASE_HREF } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, HttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { LocalSolveStoreService } from './services/local-solve-store.service';
import { preloadTranslations } from './services/i18n.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    { provide: APP_BASE_HREF, useValue: '/cubestats-pro/' },
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [LocalSolveStoreService],
      useFactory: (store: LocalSolveStoreService) => () => store.init(),
    },
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [HttpClient],
      useFactory: preloadTranslations,
    },
  ]
};
