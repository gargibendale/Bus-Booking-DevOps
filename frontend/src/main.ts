import { bootstrapApplication } from '@angular/platform-browser';
import { provideZoneChangeDetection } from '@angular/core';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, {
  providers: [
    provideZoneChangeDetection(),
    ...appConfig.providers!
  ],
}).catch(err => console.error(err));

