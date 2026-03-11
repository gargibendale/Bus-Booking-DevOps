import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../user-service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {

  constructor(private router: Router, private snackBar: MatSnackBar) {

  }

  nameControl = new FormControl('', [
    Validators.required,
    Validators.minLength(2),
    Validators.maxLength(50),
    Validators.pattern(/^[a-zA-Z\s'.-]+$/)
  ]);


  ages = Array.from({ length: 83 }, (_, i) => i + 18); // 18–100 dropdown
  ageControl = new FormControl('', [
    Validators.required,
    Validators.min(18),
    Validators.max(100)
  ]);


  genderControl = new FormControl('');

  emailControl = new FormControl('', [
    Validators.required,
    Validators.email
  ]);

  phoneControl = new FormControl('', [
    Validators.required,
    Validators.pattern(/^[0-9]{10}$/)
  ]);

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
      this.phoneControl.valid &&
      this.passControl.value === this.repeatPassControl.value
    );
  }

  userService = inject(UserService);

  onSignup() {
    if (!this.isFormValid()) {
      this.snackBar.open("Please fill all the fields correctly", "OK", {
        duration: 3000,
        horizontalPosition: "center",
        verticalPosition: "top",
      });
      return;
    }

    const payload = {
      name: this.nameControl.value!,
      age: Number(this.ageControl.value),
      gender: this.genderControl.value!,
      email: this.emailControl.value!,
      phone: this.phoneControl.value!,
      password: this.passControl.value!
    };

    this.userService.signUp(payload).subscribe({
      next: (res) => {

        this.snackBar.open("Signup successful !", "OK", {
          duration: 3000,
          horizontalPosition: "center",
          verticalPosition: "top",
        });
        // Optionally redirect to login
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error(err);
        let message = "Signup failed. Please try again.";

        if (typeof err.error?.detail === "string") {
          message = err.error.detail;
        } else if (Array.isArray(err.error?.detail)) {
          message = err.error.detail[0]?.msg;
        } else if (err.error?.detail?.message) {
          message = err.error.detail.message;
        }
        this.snackBar.open(`Signup failed: ${message}`, "OK", {
          duration: 3000,
          horizontalPosition: "center",
          verticalPosition: "top",
        });
        //alert('Signup failed: ' + err.error?.detail);
      }
    });
  }

}
