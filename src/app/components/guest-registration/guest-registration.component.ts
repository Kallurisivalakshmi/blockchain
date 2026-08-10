import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GuestService } from '../../services/guest.service';
import { BlockchainService } from '../../services/blockchain.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-guest-registration',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="registration-container">
      <mat-card class="registration-card">
        <mat-card-header>
          <mat-card-title>Guest Registration</mat-card-title>
          <mat-card-subtitle>Register a new guest</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="registrationForm" (ngSubmit)="onSubmit()" class="registration-form">
            <mat-form-field>
              <mat-label>Full Name</mat-label>
              <input matInput formControlName="name" placeholder="Enter full name">
              <mat-icon matSuffix>person</mat-icon>
              @if (registrationForm.get('name')?.invalid && registrationForm.get('name')?.touched) {
                <mat-error>Name is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field>
              <mat-label>Phone Number</mat-label>
              <input matInput formControlName="phone" placeholder="Enter phone number" type="tel">
              <mat-icon matSuffix>phone</mat-icon>
              @if (registrationForm.get('phone')?.invalid && registrationForm.get('phone')?.touched) {
                <mat-error>Phone number is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field>
              <mat-label>Government ID Number</mat-label>
              <input matInput formControlName="governmentId" placeholder="Enter government ID number">
              <mat-icon matSuffix>badge</mat-icon>
              @if (registrationForm.get('governmentId')?.invalid && registrationForm.get('governmentId')?.touched) {
                <mat-error>Government ID is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field>
              <mat-label>ID Document Upload</mat-label>
              <input type="file" (change)="onFileChange($event)" accept="image/*,.pdf" id="idDocument">
              <mat-icon matSuffix>upload</mat-icon>
              @if (registrationForm.get('idDocument')?.invalid && registrationForm.get('idDocument')?.touched) {
                <mat-error>ID document is required</mat-error>
              }
              @if (fileName) {
                <mat-hint>{{ fileName }}</mat-hint>
              }
            </mat-form-field>

            <mat-form-field>
              <mat-label>Check-in Date</mat-label>
              <input matInput [matDatepicker]="checkInPicker" formControlName="checkInDate">
              <mat-datepicker-toggle matIconSuffix [for]="checkInPicker"></mat-datepicker-toggle>
              <mat-datepicker #checkInPicker></mat-datepicker>
              @if (registrationForm.get('checkInDate')?.invalid && registrationForm.get('checkInDate')?.touched) {
                <mat-error>Check-in date is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field>
              <mat-label>Check-out Date</mat-label>
              <input matInput [matDatepicker]="checkOutPicker" formControlName="checkOutDate">
              <mat-datepicker-toggle matIconSuffix [for]="checkOutPicker"></mat-datepicker-toggle>
              <mat-datepicker #checkOutPicker></mat-datepicker>
              @if (registrationForm.get('checkOutDate')?.invalid && registrationForm.get('checkOutDate')?.touched) {
                <mat-error>Check-out date is required</mat-error>
              }
            </mat-form-field>

            <div class="button-group">
              <button mat-raised-button color="primary" type="submit" 
                      [disabled]="registrationForm.invalid || loading">
                @if (loading) {
                  <mat-spinner diameter="20"></mat-spinner> Registering...
                } @else {
                  Register Guest
                }
              </button>
              <button mat-button color="warn" type="reset" (click)="resetForm()" [disabled]="loading">
                Reset
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `.registration-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }`,
    `.registration-card {
      width: 100%;
    }`,
    `.registration-form {
      display: grid;
      gap: 20px;
    }`,
    `.mat-form-field {
      width: 100%;
    }`,
    `.button-group {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }`,
    `input[type="file"] {
      display: none;
    }`,
    `.mat-form-field input[type="file"] + .mat-icon {
      cursor: pointer;
    }`,
    `@media (max-width: 600px) {
      .registration-container {
        padding: 10px;
      }
    }`,
  ],
})
export class GuestRegistrationComponent {
  registrationForm: FormGroup;
  fileName = '';
  loading = false;
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private guestService: GuestService,
    private blockchainService: BlockchainService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.registrationForm = this.fb.group({
      name: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[\d\s\-+()]+$/)]],
      governmentId: ['', Validators.required],
      idDocument: [null, Validators.required],
      checkInDate: [new Date(), Validators.required],
      checkOutDate: [new Date(Date.now() + 86400000), Validators.required],
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.fileName = this.selectedFile.name;
      this.registrationForm.patchValue({
        idDocument: this.selectedFile.name,
      });
    }
  }

  onSubmit(): void {
    if (this.registrationForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;

    const formData = this.registrationForm.value;
    const guestData = {
      name: formData.name,
      phone: formData.phone,
      governmentId: formData.governmentId,
      idDocument: this.selectedFile || formData.idDocument,
      checkInDate: formData.checkInDate,
      checkOutDate: formData.checkOutDate,
    };

    // First create the guest
    this.guestService.createGuest(guestData).subscribe({
      next: (guest) => {
        // Then create a blockchain transaction for the registration
        const txData = {
          guestId: guest.id,
          action: 'register',
          timestamp: new Date(),
          data: {
            name: guest.name,
            governmentId: guest.governmentId,
          },
        };

        this.blockchainService.createTransaction(txData).subscribe({
          next: (transaction) => {
            this.snackBar.open(
              `Guest registered successfully! Transaction: ${transaction.txId}`,
              'Close',
              { duration: 5000 }
            );
            // Navigate to verification page
            this.router.navigate([`/verification/${guest.id}`]);
          },
          error: (txErr) => {
            console.error('Error creating blockchain transaction:', txErr);
            this.snackBar.open(
              'Guest registered but blockchain transaction failed',
              'Close',
              { duration: 3000 }
            );
            this.router.navigate([`/verification/${guest.id}`]);
          },
        });
      },
      error: (err) => {
        console.error('Error creating guest:', err);
        this.snackBar.open('Failed to register guest. Please try again.', 'Close', {
          duration: 3000,
        });
        this.loading = false;
      },
    });
  }

  resetForm(): void {
    this.registrationForm.reset({
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000),
    });
    this.fileName = '';
    this.selectedFile = null;
  }
}
