from pydantic import BaseModel
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy import UniqueConstraint
from typing import List
from enum import Enum
import datetime
import shortuuid
from datetime import timedelta, timezone


class GenderEnum(str, Enum):
    male = "Male"
    female = "Female"
    transgender = "Transgender"


class StatusEnum(str, Enum):
    cnf = "Confirm"
    cancelled = "Cancelled"
    failed = "Failed"


class UserNotHashed(BaseModel):
    name: str
    age: int
    gender: GenderEnum
    email: str
    phone: str
    password: str


class User(SQLModel, table=True):
    uid: str = Field(
        default_factory=lambda: shortuuid.uuid(),
        primary_key=True,
        index=True,
    )
    name: str
    age: int
    gender: GenderEnum
    email: str = Field(unique=True, index=True)
    phone: str
    hashed_password: str

    tickets: List["Ticket"] = Relationship(
        back_populates="user", sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class BusCreate(BaseModel):
    route: str
    start: str
    end: str
    start_time: datetime.time
    end_time: datetime.time
    price: float
    total_seats: int


class Bus(SQLModel, table=True):
    bus_id: int | None = Field(default=None, primary_key=True)
    route: str = Field(index=True)
    start: str = Field(index=True)
    end: str = Field(index=True)
    start_time: datetime.time
    end_time: datetime.time
    duration: datetime.timedelta
    price: float
    total_seats: int

    schedules: List["BusSchedule"] = Relationship(
        back_populates="bus", sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

    tickets: List["Ticket"] = Relationship(
        back_populates="bus", sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class BusSchedule(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("bus_id", "travel_date"),)
    schedule_id: int | None = Field(default=None, primary_key=True)

    bus_id: int | None = Field(
        sa_column=Column(
            Integer, ForeignKey("bus.bus_id", ondelete="CASCADE"), nullable=False
        )
    )

    travel_date: datetime.datetime = Field(index=True)
    booked_seats: int
    available_seats: int

    bus: "Bus" = Relationship(back_populates="schedules")


class Ticket(SQLModel, table=True):
    ticket_id: str | None = Field(
        default_factory=lambda: shortuuid.uuid(),
        primary_key=True,
        index=True,
    )

    uid: str | None = Field(
        sa_column=Column(
            String, ForeignKey("user.uid", ondelete="CASCADE"), nullable=False
        )
    )

    bus_id: int | None = Field(
        sa_column=Column(
            Integer, ForeignKey("bus.bus_id", ondelete="CASCADE"), nullable=False
        )
    )
    route: str

    travel_date: datetime.datetime
    booking_time: datetime.datetime
    amt_paid: float
    status: StatusEnum

    user: "User" = Relationship(back_populates="tickets")
    bus: "Bus" = Relationship(back_populates="tickets")

    passengers: List["Passenger"] = Relationship(
        back_populates="ticket",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class TicketCreateRequest(BaseModel):
    uid: str
    bus_id: int
    route: str
    travel_date: datetime.datetime
    available: int
    total_seats: int
    amt_paid: float
    passengers: list["PassengerRead"]  # ⬅️ change here


class Passenger(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint(
            "bus_id",
            "travel_date",
            "seat",
            name="uq_bus_date_seat",
        ),
    )
    pid: str | None = Field(
        default_factory=lambda: shortuuid.uuid(),
        primary_key=True,
        index=True,
    )

    ticket_id: str | None = Field(
        sa_column=Column(
            String, ForeignKey("ticket.ticket_id", ondelete="CASCADE"), nullable=False
        )
    )

    bus_id: int = Field(index=True)
    travel_date: datetime.datetime = Field(index=True)

    name: str
    age: int
    gender: GenderEnum
    seat: int

    ticket: "Ticket" = Relationship(back_populates="passengers")


class PassengerRead(BaseModel):
    name: str
    age: int
    gender: GenderEnum
    seat: int


class BusRead(BaseModel):
    bus_id: int
    start: str
    end: str
    start_time: datetime.time
    end_time: datetime.time


class ChangePasswordRequest(BaseModel):
    old_password: str
    password: str


class TicketRead(BaseModel):
    ticket_id: str
    route: str
    travel_date: datetime.datetime
    booking_time: datetime.datetime
    amt_paid: float
    status: StatusEnum
    passengers: List[PassengerRead] = []
    bus: BusRead


class BusReadForSchedule(BaseModel):
    bus_id: int
    route: str
    price: float


class BusScheduleRead(BaseModel):
    schedule_id: int
    bus_id: int
    travel_date: datetime.datetime
    booked_seats: int
    available_seats: int
    bus: BusReadForSchedule


class UserRead(BaseModel):
    uid: str
    name: str
    age: int
    gender: GenderEnum
    email: str
    phone: str
    tickets: List[TicketRead] = []


class UserUpdate(BaseModel):
    name: str | None = None
    age: int | None = None
    gender: GenderEnum | None = None
    email: str | None = None
    phone: str | None = None
    password: str | None = None  # raw password, hash only if provided


class LazyLoadRequest(BaseModel):
    start: str
    end: str
    date: datetime.datetime


class PassengerUpdate(BaseModel):
    name: str | None = None
    age: int | None = None
    gender: GenderEnum | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str  # could be JWT (token), JWS (signature), or JWE (encryption)
    user: UserRead


class TokenData(BaseModel):
    username: str | None = None
