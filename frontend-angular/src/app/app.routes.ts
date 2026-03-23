import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ScrambleTestComponent } from './pages/scramble-test/scramble-test.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'scramble-test', component: ScrambleTestComponent }
];
