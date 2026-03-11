import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Bus } from './bus/bus';
import { BusDetails } from './bus-details/bus-details';
import { Signup } from './signup/signup';
import { Login } from './login/login';
import { UserProfile } from './user-profile/user-profile';
import { Tickets } from './tickets/tickets';
import { authGuard } from './auth.guard';
import { TicketDetails } from './ticket-details/ticket-details';

export const routes: Routes = [
    {
        path: '',
        component: Home,
        title: 'Home page',
    },
    {
        path: 'details/:bus_id',
        component: BusDetails,
        title: 'Bus details',
        canActivate: [authGuard]
    },
    {
        path: 'signup',
        component: Signup,
        title: 'Register User'
    },
    {
        path: 'login',
        component: Login,
        title: 'Log In'
    },
    {
        path: 'profile',
        component: UserProfile,
        title: 'Profile',
        canActivate: [authGuard]
    },
    {
        path: 'bookinghistory',
        component: Tickets,
        title: 'Booking History',
        canActivate: [authGuard]
    },
    {
        path: 'ticket_details/:ticket_id',
        component: TicketDetails,
        title: 'Ticket Details',
        canActivate: [authGuard]
    }
];
