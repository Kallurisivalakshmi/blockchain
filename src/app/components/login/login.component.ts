import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Hotel Police Registry System</mat-card-title>
          <mat-card-subtitle>Please login to continue</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <mat-tab-group>
            <mat-tab label="Hotel Login">
              <form [formGroup]="hotelForm" (ngSubmit)="onHotelLogin()" class="login-form">
                <mat-form-field>
                  <mat-label>Username</mat-label>
                  <input matInput formControlName="username" placeholder="Enter username">
                  <mat-icon matSuffix>person</mat-icon>
                </mat-form-field>

                <mat-form-field>
                  <mat-label>Password</mat-label>
                  <input matInput type="password" formControlName="password" placeholder="Enter password">
                  <mat-icon matSuffix>lock</mat-icon>
                </mat-form-field>

                <button mat-raised-button color="primary" type="submit" 
                        [disabled]="hotelForm.invalid || loading">
                  @if (loading) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    Login
                  }
                </button>
              </form>
            </mat-tab>

            <mat-tab label="Police Login">
              <form [formGroup]="policeForm" (ngSubmit)="onPoliceLogin()" class="login-form">
                <mat-form-field>
                  <mat-label>Username</mat-label>
                  <input matInput formControlName="username" placeholder="Enter username">
                  <mat-icon matSuffix>person</mat-icon>
                </mat-form-field>

                <mat-form-field>
                  <mat-label>Password</mat-label>
                  <input matInput type="password" formControlName="password" placeholder="Enter password">
                  <mat-icon matSuffix>lock</mat-icon>
                </mat-form-field>

                <mat-form-field>
                  <mat-label>Department</mat-label>
                  <input matInput formControlName="department" placeholder="Enter department">
                  <mat-icon matSuffix>security</mat-icon>
                </mat-form-field>

                <button mat-raised-button color="accent" type="submit" 
                        [disabled]="policeForm.invalid || loading">
                  @if (loading) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    Login
                  }
                </button>
              </form>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `.login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
      padding: 20px;
    }`,
    `.login-card {
      width: 100%;
      max-width: 500px;
    }`,
    `.login-form {
      margin-top: 16px;
    }`,
    `button[type="submit"] {
      width: 100%;
      margin-top: 16px;
    }`,
    `.mat-form-field {
      width: 100%;
      margin-bottom: 16px;
    }`,
    `.mat-tab-group {
      margin-top: 16px;
    }`,
  ],
})
export class LoginComponent {
  hotelForm: FormGroup;
  policeForm: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.hotelForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });

    this.policeForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      department: ['', Validators.required],
    });
  }

  onHotelLogin(): void {
    if (this.hotelForm.invalid) return;

    this.loading = true;
    const { username, password } = this.hotelForm.value;

    this.authService.login(username, password, 'hotel').subscribe({
      next: (user) => {
        this.snackBar.open(`Welcome, ${user.username}!`, 'Close', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.snackBar.open('Login failed. Please try again.', 'Close', { duration: 3000 });
        console.error('Login error:', err);
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  onPoliceLogin(): void {
    if (this.policeForm.invalid) return;

    this.loading = true;
    const { username, password } = this.policeForm.value;

    this.authService.login(username, password, 'police').subscribe({
      next: (user) => {
        this.snackBar.open(`Welcome, Officer ${user.username}!`, 'Close', { duration: 3000 });
        this.router.navigate(['/police-dashboard']);
      },
      error: (err) => {
        this.snackBar.open('Login failed. Please try again.', 'Close', { duration: 3000 });
        console.error('Login error:', err);
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}
