import { BusSchedule } from "./bus-schedule";
import { Ticket } from "./ticket";
import { Component, input } from '@angular/core';
export interface BusInfo {
    bus_id?: number;        // optional because backend sets it
    route: string;
    start: string;
    end: string;

    start_time: string;     // Python datetime.time → string (HH:MM:SS)
    end_time: string;       // Python datetime.time → string
    duration: string;       // Python timedelta → string ("HH:MM:SS")

    price: number;
    total_seats: number;

    schedules?: BusSchedule[];
    tickets?: Ticket[];
}

export interface BusSearchResult {
    bus: BusInfo;
    schedule: BusSchedule;
}
