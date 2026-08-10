import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav #sidenav mode="side" opened class="sidenav">
        <mat-nav-list>
          @if (authService.isAuthenticated()) {
            @if (authService.getCurrentRole() === 'hotel') {
              <a mat-list-item routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
              <a mat-list-item routerLink="/register" routerLinkActive="active">Register Guest</a>
              <a mat-list-item routerLink="/blockchain" routerLinkActive="active">Blockchain Explorer</a>
            } @else if (authService.getCurrentRole() === 'police') {
              <a mat-list-item routerLink="/police-dashboard" routerLinkActive="active">Police Dashboard</a>
              <a mat-list-item routerLink="/blockchain" routerLinkActive="active">Blockchain Explorer</a>
            }
          }
          @if (!authService.isAuthenticated()) {
            <a mat-list-item routerLink="/login" routerLinkActive="active">Login</a>
          }
          @if (authService.isAuthenticated()) {
            <a mat-list-item (click)="logout()">Logout</a>
          }
        </mat-nav-list>
      </mat-sidenav>
      
      <mat-sidenav-content>
        <mat-toolbar class="toolbar">
          <button mat-icon-button (click)="sidenav.toggle()">
            <mat-icon>menu</mat-icon>
          </button>
          <span>Hotel Police Registry System</span>
          <span class="spacer"></span>
          @if (authService.isAuthenticated()) {
            <span>Logged in as: {{ authService.getCurrentUser() }} ({{ authService.getCurrentRole() }})</span>
          }
        </mat-toolbar>
        
        <div class="content">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `.spacer { flex: 1 1 auto; }`,
    `a { text-decoration: none; color: inherit; }`,
    `.mat-toolbar { position: sticky; top: 0; z-index: 2; }`,
  ],
})
export class AppComponent {
  title = 'hotel-police-registry';

  constructor(public authService: AuthService) {}

  logout() {
    this.authService.logout();
  }
}
