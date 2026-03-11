from typing import Annotated
from datetime import datetime, timedelta, timezone

import jwt
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError
from pwdlib import PasswordHash
from models import TokenData, User, UserRead
from jose import JWTError
from database import get_session
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

fake_users_db = {
    "johndoe": {
        "uid": "user1",
        "name": "John Doe",
        "age": 22,
        "gender": "Male",
        "email": "johndoe@example.com",
        "phone": "8329427692",
        "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$jQXzL3d3IyPg53ia6IWuZw$dQkmG1MMmsPOO8cQhdASvBCg5h98WXtcgsSB8q1g1Kc",
    }
}

password_hash = PasswordHash.recommended()  # ---> uses Argon2
# oauth2_scheme ONLY extracts the token from the incoming http request, and also checks for the token in the header (if not found -> raise an error), DOES NOT handle the actual verification of the token's validitiy or the authentication of user credentials against a database
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="busapp/token")


# --- Password helpers ---
def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)


def get_password_hash(password):
    return password_hash.hash(password)


# --- DB helpers ---
def get_user_by_email(
    email: str, session: Session = Depends(get_session)
) -> User | None:
    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()
    if not user:
        return None

    return user


def get_user_by_uid(uid: str, session: Session = Depends(get_session)) -> User | None:
    statement = select(User).where(User.uid == uid).options(selectinload(User.tickets))
    user = session.exec(statement).first()
    if not user:
        return None

    return user


# --- Auth helpers ---
def authenticate_user(
    email: str, password: str, session: Session = Depends(get_session)
) -> User | None:
    user = get_user_by_email(email, session)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict, expires_delta: timedelta | None):
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    to_encode.update({"iat": now})
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=4320)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, os.getenv("SECRET_KEY"), algorithm=os.getenv("ALGORITHM")
    )
    return encoded_jwt


# --- Dependency: get current user from token ---
async def get_current_user(
    token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        leeway = 10
        payload = jwt.decode(
            token,
            os.getenv("SECRET_KEY"),
            algorithms=[os.getenv("ALGORITHM")],
            leeway=leeway,
        )
        uid: str | None = payload.get("sub")
        if uid is None:
            raise credentials_exception
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        )
    except JWTError:
        raise credentials_exception
    user = get_user_by_uid(uid, session)
    if user is None:
        raise credentials_exception
    return user
