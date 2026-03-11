import { Component, inject } from '@angular/core';
import { AuthService } from '../auth-service';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../user-service';
import { LowerCasePipe } from '@angular/common';
import { DatePipe } from '@angular/common';
import { Ticket } from '../ticket';
import { signal } from '@angular/core';
import { BusService } from '../bus-service';
import { effect } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-user-profile',
  imports: [ReactiveFormsModule, LowerCasePipe, DatePipe],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.scss',
})
export class UserProfile {

  private authService = inject(AuthService);
  private busService = inject(BusService);
  userService = inject(UserService);
  snackBar = inject(MatSnackBar);

  // Convert Observable to Signal (Modern standard)
  user = toSignal(this.authService.user$);
  tickets = signal<Ticket[]>([]);
  loading = signal(true);

  private fetchTicketsEffect = effect(() => {
    const user = this.user();
    if (!user || this.tickets().length) return;

    this.loading.set(true);

    this.busService.fetchTickets(user.uid).subscribe({
      next: tickets => {
        this.tickets.set(tickets);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  });

  errMessage = '';

  nameControl = new FormControl('');

  ages = Array.from({ length: 83 }, (_, i) => i + 18); // 18–100 dropdown
  ageControl = new FormControl('');

  genderControl = new FormControl('');

  emailControl = new FormControl('', [
    Validators.required,
    Validators.email
  ]);

  phoneControl = new FormControl('', [
    Validators.required,
    Validators.pattern(/^[0-9]{10}$/)
  ]);

  changePass: boolean = false;
  editProfile: boolean = false;
  oldPassControl = new FormControl('', [Validators.required]);
  passControl = new FormControl('', [Validators.required]);
  repeatPassControl = new FormControl('', [
    Validators.required,
  ]);

  // Method to validate password matching
  isFormValid() {
    return (
      this.nameControl.valid &&
      this.ageControl.valid &&
      this.genderControl.valid &&
      this.emailControl.valid &&
      this.phoneControl.valid);
  }

  isPassValid() {
    return (this.oldPassControl.valid && this.passControl.valid && this.passControl.value === this.repeatPassControl.value)
  }

  setChangePassword() {
    this.changePass = true;
  }

  setEditProfile() {
    const user = this.user();
    if (!user) return;

    // Pre-fill form controls
    this.nameControl.setValue(user.name);
    this.ageControl.setValue(user.age);
    this.genderControl.setValue(user.gender);
    this.emailControl.setValue(user.email);
    this.phoneControl.setValue(user.phone);

    this.editProfile = true;
  }

  updateProfile() {
    if (!this.isFormValid()) {
      this.snackBar.open("Please enter all the fields correctly", "Close", {
        duration: 3000,
        horizontalPosition: "center",
        verticalPosition: "top",
      });
      return;
    }

    const updatedUser = {
      ...this.user(),   // keep uid & other fields
      name: this.nameControl.value!,
      age: Number(this.ageControl.value!),
      gender: this.genderControl.value!,
      email: this.emailControl.value!,
      phone: this.phoneControl.value!
    };

    this.userService.userUpdate(
      updatedUser.uid,
      updatedUser.name,
      updatedUser.age,
      updatedUser.gender,
      updatedUser.email,
      updatedUser.phone
    ).subscribe({
      next: () => {
        //update user globally
        this.authService.setUser(updatedUser);

        this.snackBar.open("Profile updated successfully!", "Close", {
          duration: 3000,
          horizontalPosition: "center",
          verticalPosition: "top",
        });
        this.editProfile = false;
      },
      error: (err) => {
        console.error(err);
        this.errMessage = `Profile update failed: ${err.error?.detail}`;
        this.snackBar.open(this.errMessage, "Close", {
          duration: 3000,
          horizontalPosition: "center",
          verticalPosition: "top",
        });
        //alert('Profile update failed: ' + err.error?.detail);
      }
    });
  }


  changePassword() {
    if (!this.isPassValid()) {
      alert('Confirm password does not match');
      return;
    }

    const payload = {
      id: this.user().uid,
      password: this.passControl.value!
    }
    this.userService.passwordUpdate(this.oldPassControl.value!, this.passControl.value!)
      .subscribe({
        next: (res) => {

          this.snackBar.open("Password updated successfully!", "Close", {
            duration: 3000,
            horizontalPosition: "center",
            verticalPosition: "top",
          });
          this.changePass = false;
          this.oldPassControl.reset();
          this.passControl.reset();
          this.repeatPassControl.reset();
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Password update failed: ' + err.error?.detail, "Close", {
            duration: 3000,
            horizontalPosition: "center",
            verticalPosition: "top",
          });
          //alert('Password update failed: ' + err.error?.detail);
        }
      });
  }

}
