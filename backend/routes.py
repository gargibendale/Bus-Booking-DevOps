import os
from fastapi import APIRouter
from utils import (
    authenticate_user,
    create_access_token,
)
from typing import Annotated
from fastapi import Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from utils import fake_users_db
from database import get_session
from sqlmodel import Session
import crud
import pandas as pd
import io
from pwdlib import PasswordHash
from models import (
    User,
    Bus,
    BusCreate,
    BusSchedule,
    BusScheduleRead,
    Ticket,
    TicketRead,
    Passenger,
    LoginResponse,
    UserNotHashed,
    UserRead,
    UserUpdate,
    PassengerUpdate,
    TicketCreateRequest,
    ChangePasswordRequest,
    LazyLoadRequest,
)
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
from models import StatusEnum
from utils import get_current_user

router = APIRouter()

password_hash = PasswordHash.recommended()


@router.post("/sign_up")
async def create_user(user: UserNotHashed, session: Session = Depends(get_session)):
    try:
        user_data = user.model_dump()
        hashed_pw = password_hash.hash(user.password)

        new_user = User(**user_data, hashed_password=hashed_pw)

        return crud.create_user(new_user, session)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")
    except Exception:
        raise HTTPException(status_code=500, detail="Something went wrong")


@router.get("/get_user/{id}", response_model=UserRead)
async def get_user(id: str, session: Session = Depends(get_session)):
    user = crud.read_user(id, session)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/update_user/{id}")
async def update_user(
    id: str,
    user: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):

    if current_user.uid != id:
        raise HTTPException(
            status_code=403, detail="Not authorized to update this user"
        )
    return crud.update_user(id, user, session)


@router.post("/change_password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return crud.update_password(
        current_user.uid, payload.old_password, payload.password, session
    )


@router.put("/passenger/{id}")
async def update_passenger(
    id: str, passenger: PassengerUpdate, session: Session = Depends(get_session)
):
    try:
        return crud.update_passenger(id, passenger, session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tickets/{id}")
async def get_tickets(
    id: str,
    session: Session = Depends(get_session),
):
    return crud.read_tickets(id, session)


@router.get("/fetch_ticket/{ticket_id}", response_model=TicketRead)
async def fetch_ticket(ticket_id: str, session: Session = Depends(get_session)):
    try:
        return crud.fetch_ticket(ticket_id, session)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Ticket not found")


@router.get("/buses")
async def get_buses(session: Session = Depends(get_session)):
    try:
        return crud.read_buses(session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_buses(
    start_loc: str,
    end_loc: str,
    travel_date: datetime,
    session: Session = Depends(get_session),
):
    try:
        return crud.bus_search(start_loc, end_loc, travel_date, session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/add_bus")
def create_bus(bus_data: BusCreate, session: Session = Depends(get_session)):
    try:
        start_dt = datetime.combine(datetime.today(), bus_data.start_time)
        end_dt = datetime.combine(datetime.today(), bus_data.end_time)

        # Handle next-day trips (e.g. 23:00 → 03:00)
        if end_dt < start_dt:
            end_dt += timedelta(days=1)

        duration = end_dt - start_dt

        new_bus = Bus(
            route=bus_data.route,
            start=bus_data.start,
            end=bus_data.end,
            start_time=bus_data.start_time,
            end_time=bus_data.end_time,
            duration=duration,
            price=bus_data.price,
            total_seats=bus_data.total_seats,
        )
        return crud.create_bus(new_bus, session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schedule/{bus_id}", response_model=BusScheduleRead)
def get_schedule(
    bus_id: int, travel_date: datetime, session: Session = Depends(get_session)
):
    try:
        return crud.fetch_schedule(bus_id, travel_date, session)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# done
@router.post("/book_ticket")
def create_ticket(
    ticket_request: TicketCreateRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    try:
        schedule = crud.fetch_schedule(
            bus_id=ticket_request.bus_id,
            travel_date=ticket_request.travel_date,
            session=session,
        )
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        bus = schedule.bus
        bus_departure = datetime.combine(
            ticket_request.travel_date.date(), bus.start_time
        )
        booking_deadline = bus_departure - timedelta(hours=2)
        if datetime.now() > booking_deadline:
            raise HTTPException(
                status_code=400, detail="Booking window has closed for this bus"
            )
        if len(ticket_request.passengers) > ticket_request.available:
            raise HTTPException(
                status_code=400, detail="Not enough seats are available"
            )

        ticket = Ticket(
            uid=current_user.uid,
            bus_id=ticket_request.bus_id,
            travel_date=ticket_request.travel_date,
            booking_time=datetime.now(),
            amt_paid=ticket_request.amt_paid,
            status=StatusEnum.cnf,
            route=ticket_request.route,
        )

        session.add(ticket)
        session.flush()

        created_passengers = []

        for p in ticket_request.passengers:
            passenger = Passenger(
                ticket_id=ticket.ticket_id,
                bus_id=ticket.bus_id,
                travel_date=ticket.travel_date,
                name=p.name,
                age=p.age,
                gender=p.gender,
                seat=p.seat,
            )
            session.add(passenger)
            created_passengers.append(passenger)

        crud.update_schedule(
            bus_id=ticket.bus_id,
            travel_date=ticket.travel_date,
            available=ticket_request.available - len(created_passengers),
            total_seats=ticket_request.total_seats,
            session=session,
        )
        return {"message": "Ticket booked successfully"}
    except IntegrityError:
        raise HTTPException(
            status_code=409, detail="One or more selected seats are already booked"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cancel_ticket")
async def cancel_ticket(tid: str, session: Session = Depends(get_session)):
    # 1. Fetch associated passengers
    passengers = session.exec(select(Passenger).where(Passenger.ticket_id == tid)).all()

    # 2. Fetch the ticket
    ticket = session.exec(select(Ticket).where(Ticket.ticket_id == tid)).first()

    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {tid} not found.")

    if ticket.status == StatusEnum.cancelled:
        raise HTTPException(status_code=400, detail="Ticket is already cancelled")

    # 3. Fetch the schedule
    schedule = session.exec(
        select(BusSchedule)
        .where(BusSchedule.bus_id == ticket.bus_id)
        .where(BusSchedule.travel_date == ticket.travel_date)
    ).first()

    if not schedule:
        # Raising an exception triggers rollback in get_session()
        raise HTTPException(
            status_code=500, detail=f"Schedule for ticket {tid} not found."
        )

    # Get bus from relationship
    bus = schedule.bus

    # Construct full departure datetime
    bus_departure = datetime.combine(ticket.travel_date.date(), bus.start_time)

    # Cancellation allowed only before 1 hour of departure
    cancellation_deadline = bus_departure - timedelta(hours=1)

    if datetime.now() > cancellation_deadline:
        raise HTTPException(
            status_code=400, detail="Cancellation window has closed for this bus"
        )

    # 4. Delete passengers
    for passenger in passengers:
        session.delete(passenger)

    # 5. Update schedule seats
    schedule.available_seats += len(passengers)
    schedule.booked_seats -= len(passengers)

    # 6. Update ticket status
    ticket.status = StatusEnum.cancelled

    # No commit here → get_session() will commit automatically
    return {
        "message": f"Ticket {tid} cancelled and {len(passengers)} passengers removed."
    }


@router.post("/add_schedule")
def create_schedule_row(schedule: BusSchedule, session: Session = Depends(get_session)):
    try:
        return crud.create_bus_schedule(schedule, session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{id}/add_ticket")
def add_ticket_row(ticket: Ticket, session: Session = Depends(get_session)):
    try:
        return crud.create_ticket(ticket, session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/add_passenger")
def create_passenger_row(passenger: Passenger, session: Session = Depends(get_session)):
    try:
        return crud.create_passenger(passenger, session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fetch_seats")
def fetch_seats(
    bus_id: int, travel_date: datetime, session: Session = Depends(get_session)
):
    try:
        return crud.fetch_seats(bus_id, travel_date, session)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")


@router.post("/search_lazy_load")
def create_schedule_on_search(
    request: LazyLoadRequest, session: Session = Depends(get_session)
):
    return crud.lazy_load(request, session)


@router.post("/bulk_signup")
async def bulk_create_users(
    file: UploadFile = File(...), session: Session = Depends(get_session)
):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df["phone"] = df["phone"].astype(str)
        created_users = []
        for _, row in df.iterrows():
            user_not_hashed = UserNotHashed(**row.to_dict())
            hashed_pw = password_hash.hash(user_not_hashed.password)
            user = User(
                **user_not_hashed.model_dump(exclude={"password"}),
                hashed_password=hashed_pw,
            )
            session.add(user)
            created_users.append(user)
        for user in created_users:
            session.refresh(user)
        return {"message": f"{len(created_users)} users created successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/token", response_model=LoginResponse)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    # OAuth2PasswordRequestForm uses 'username' field - we'll send email as username from frontend
    user = authenticate_user(form_data.username, form_data.password, session)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=4320)
    access_token = create_access_token(
        data={"sub": user.uid}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}
