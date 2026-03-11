import { Ticket } from "./ticket";

export interface User {
    uid?: string;
    name: string;
    age: number;
    gender: string;
    email: string;
    phone: string;
    tickets?: Ticket[];
}
