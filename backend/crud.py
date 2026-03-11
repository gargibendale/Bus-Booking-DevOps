from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from models import (
    User,
    Bus,
    BusSchedule,
    Ticket,
    Passenger,
    UserUpdate,
    PassengerUpdate,
    ChangePasswordRequest,
    LazyLoadRequest,
)
import datetime
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from models import GenderEnum
from pwdlib import PasswordHash
from fastapi import HTTPException

password_hash = PasswordHash.recommended()


# done
def create_user(user: User, session: Session):
    session.add(user)
    session.flush()
    session.refresh(user)
    return user


def read_user(id: str, session: Session):
    statement = select(User).where(User.uid == id)
    results = session.exec(statement).first()
    return results


def read_tickets(id: str, session: Session):
    try:
        statement = (
            select(Ticket).where(Ticket.uid == id).order_by(Ticket.booking_time.desc())
        )
        tickets = session.exec(statement).all()
        return tickets  # Can be empty list
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="Database error occurred")


def fetch_schedule(bus_id: int, travel_date: datetime.datetime, session: Session):

    now = datetime.datetime.now()

    # Normalize to date-only comparison
    today = now.date()
    selected_date = travel_date.date()

    # Booking window validation
    if selected_date < today:
        raise HTTPException(
            status_code=400, detail="Booking not allowed for past dates."
        )

    if selected_date > today + datetime.timedelta(days=5):
        raise HTTPException(
            status_code=400, detail="Booking allowed only within 5 days from today."
        )

    statement = (
        select(BusSchedule)
        .options(selectinload(BusSchedule.bus))
        .where(BusSchedule.bus_id == bus_id)
        .where(func.date(BusSchedule.travel_date) == selected_date)
    )

    bus_schedule = session.exec(statement).first()

    if not bus_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    return bus_schedule


def update_user(id: str, data: UserUpdate, session: Session):
    statement = select(User).where(User.uid == id)
    user = session.exec(statement).one()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = data.model_dump(exclude_unset=True)
    if "password" in update_data:
        user.hashed_password = password_hash.hash(update_data.pop("password"))
    for key, value in update_data.items():
        setattr(user, key, value)
    session.add(user)
    session.flush()
    session.refresh(user)
    return user


def update_passenger(id: str, data: PassengerUpdate, session: Session):
    statement = select(Passenger).where(Passenger.pid == id)
    passenger = session.exec(statement).one()
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(passenger, key, value)
    session.add(passenger)
    session.flush()
    session.refresh(passenger)
    return passenger


def update_schedule(
    bus_id: str, travel_date: str, available: int, total_seats: int, session: Session
):
    statement = (
        select(BusSchedule)
        .where(BusSchedule.bus_id == bus_id)
        .where(BusSchedule.travel_date == travel_date)
        .with_for_update()
    )
    schedule = session.exec(statement).first()
    setattr(schedule, "available_seats", available)
    setattr(schedule, "booked_seats", total_seats - available)
    session.add(schedule)
    session.flush()
    session.refresh(schedule)


def create_bus(bus: Bus, session: Session):
    session.add(bus)
    session.flush()
    session.refresh(bus)
    return bus


def read_buses(session: Session):
    statement = select(Bus)
    buses = session.exec(statement).all()
    return buses


def lazy_load(request: LazyLoadRequest, session: Session):
    travel_date = request.date.date()  # normalize to date only
    # fetch all buses for this route
    buses_stmt = (
        select(Bus).where(Bus.start == request.start).where(Bus.end == request.end)
    )
    buses = session.exec(buses_stmt).all()
    # no buses exist for this route at all
    if not buses:
        raise HTTPException(
            status_code=404, detail="No buses found for selected route."
        )
    bus_ids = [bus.bus_id for bus in buses]
    # fetch existing schedules for these buses on this date.
    schedules_stmt = (
        select(BusSchedule)
        .where(BusSchedule.bus_id.in_(bus_ids))
        .where(func.date(BusSchedule.travel_date) == travel_date)
    )

    existing_schedules = session.exec(schedules_stmt).all()
    # map: bus_id -> schedule
    schedule_map = {s.bus_id: s for s in existing_schedules}
    # create schedules ONLY for buses that don't have one
    new_schedules = []
    for bus in buses:
        if bus.bus_id not in schedule_map:
            schedule = BusSchedule(
                bus_id=bus.bus_id,
                travel_date=datetime.datetime.combine(travel_date, datetime.time.min),
                booked_seats=0,
                available_seats=bus.total_seats,  # assumption
            )
            new_schedules.append(schedule)

    if new_schedules:
        session.add_all(new_schedules)
    return bus_search(
        request.start,
        request.end,
        request.date,
        session,
    )


def bus_search(start: str, end: str, date: datetime.datetime, session: Session):
    date = date.date()  # -> convert datetime object to date

    statement = (
        select(Bus, BusSchedule)
        .join(BusSchedule, Bus.bus_id == BusSchedule.bus_id)
        .where(Bus.start == start)
        .where(Bus.end == end)
        .where(func.date(BusSchedule.travel_date) == date)
    )

    rows = session.exec(statement).all()

    # rows will be a list of tuples: (Bus, BusSchedule)
    results = [
        {"bus": bus.dict(), "schedule": schedule.dict() if schedule else None}
        for bus, schedule in rows
    ]
    return results


def create_bus_schedule(schedule: BusSchedule, session: Session):
    session.add(schedule)
    session.flush()
    session.refresh(schedule)
    return schedule


# done
def create_ticket(ticket: Ticket, session: Session):
    session.add(ticket)
    session.flush()
    session.refresh(ticket)
    return ticket


def fetch_ticket(ticket_id: str, session: Session):
    statement = (
        select(Ticket)
        .where(Ticket.ticket_id == ticket_id)
        .options(selectinload(Ticket.passengers), selectinload(Ticket.bus))
    )

    ticket = session.exec(statement).first()
    return ticket


def create_passenger(passenger: Passenger, session: Session):
    session.add(passenger)
    session.flush()
    session.refresh(passenger)
    return passenger


def update_password(id: str, old_pass: str, new_pass: str, session: Session):
    statement = select(User).where(User.uid == id)
    user = session.exec(statement).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not password_hash.verify(old_pass, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")

    hashed_password = password_hash.hash(new_pass)
    setattr(user, "hashed_password", hashed_password)
    session.add(user)
    session.flush()
    session.refresh(user)
    return "Password updated successfully"


def fetch_seats(id: int, travel_date: datetime, session: Session):
    if not id or not travel_date:
        return []
    statement = (
        select(Passenger.seat)
        .where(Passenger.bus_id == id)
        .where(Passenger.travel_date == travel_date)
    )

    seats = session.exec(statement).all()
    if not seats:
        return []
    return seats
