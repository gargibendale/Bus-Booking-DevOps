import { BusInfo } from "./bus-info";

export interface BusSchedule {
    schedule_id?: number;        // Optional because DB auto-generates it
    bus_id: number;              // Required
    travel_date: string;         // Use string for ISO date from backend
    booked_seats: number;
    available_seats: number;

    // Relationship
    bus: BusInfo;                   // Optional: backend may or may not send it
}

