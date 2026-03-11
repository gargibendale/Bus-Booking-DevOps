import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../user-service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {

  constructor(private router: Router, private snackBar: MatSnackBar) { }
  emailControl = new FormControl('', [
    Validators.required,
    Validators.email
  ]);
  passControl = new FormControl('', [Validators.required]);

  isFormValid() {
    return (
      this.emailControl.valid && this.passControl.valid
    );
  }

  userService = inject(UserService);

  onLogin() {

    if (!this.isFormValid()) {
      alert('Please fill all fields correctly');
      return;
    }

    const email = this.emailControl.value!;
    const password = this.passControl.value!;

    this.userService.logIn(email, password).subscribe({
      next: () => {
        // successful login -> redirect to home
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open(`Login failed: ${(err?.error?.detail ?? 'Invalid credentials')}`, "Close", {
          duration: 3000,
          horizontalPosition: "center",
          verticalPosition: "top",
        });
        //alert('Login failed: ' + (err?.error?.detail ?? 'Invalid credentials'));
      }
    });

  }

}
