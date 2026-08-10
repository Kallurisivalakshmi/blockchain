import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { GuestRegistrationComponent } from './components/guest-registration/guest-registration.component';
import { VerificationComponent } from './components/verification/verification.component';
import { VerificationResultComponent } from './components/verification-result/verification-result.component';
import { PoliceDashboardComponent } from './components/police-dashboard/police-dashboard.component';
import { BlockchainExplorerComponent } from './components/blockchain-explorer/blockchain-explorer.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['hotel'] }
  },
  {
    path: 'register',
    component: GuestRegistrationComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['hotel'] }
  },
  {
    path: 'verification/:guestId',
    component: VerificationComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['hotel'] }
  },
  {
    path: 'verification-result/:guestId',
    component: VerificationResultComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['hotel'] }
  },
  {
    path: 'police-dashboard',
    component: PoliceDashboardComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['police'] }
  },
  {
    path: 'blockchain',
    component: BlockchainExplorerComponent,
    canActivate: [AuthGuard]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
