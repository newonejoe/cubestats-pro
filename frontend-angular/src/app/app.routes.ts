import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ScrambleTestComponent } from './pages/scramble-test/scramble-test.component';
import { AnalysisPageComponent } from './pages/analysis/analysis-page.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'scramble-test', component: ScrambleTestComponent },
  { path: 'analysis', component: AnalysisPageComponent }
];
