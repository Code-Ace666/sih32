import datetime
import jwt
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import hashlib
import os

from app.config import settings
from app.models.database import get_db
from app.models.models import User, FarmerProfile, UserRole, AuditLog
from app.schemas.schemas import UserCreate, UserLogin, Token, UserResponse, OperatorAdminCreate

router = APIRouter(prefix="/api/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        salt, key = hashed_password.split(":")
        new_key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return new_key.hex() == key
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = os.urandom(16).hex()
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}:{dk.hex()}"


def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def require_role(roles: list[str]):
    def dependency(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action forbidden for role: {user.role}"
            )
        return user
    return dependency

@router.post("/register", response_model=UserResponse)
def register_farmer(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if phone already exists
    existing_user = db.query(User).filter(User.phone == user_in.phone).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Mobile number already registered."
        )

    # Hash password
    hashed_password = get_password_hash(user_in.password)

    # Create User
    new_user = User(
        phone=user_in.phone,
        name=user_in.name,
        password_hash=hashed_password,
        role=UserRole.FARMER
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create FarmerProfile if details are provided
    if user_in.farmer_registration_id:
        profile = FarmerProfile(
            user_id=new_user.id,
            farmer_registration_id=user_in.farmer_registration_id,
            state=user_in.state or "",
            district=user_in.district or "",
            block=user_in.block or "",
            village=user_in.village or "",
            address=user_in.address or "",
            preferred_language=user_in.preferred_language or "en"
        )
        db.add(profile)
        db.commit()
        db.refresh(new_user)

    # Audit log
    audit = AuditLog(
        user_id=new_user.id,
        action="REGISTER",
        details=f"Farmer {new_user.name} registered with phone {new_user.phone}"
    )
    db.add(audit)
    db.commit()

    return new_user

@router.post("/register-staff", response_model=UserResponse)
def register_staff(staff_in: OperatorAdminCreate, db: Session = Depends(get_db)):
    # For simplicity, we check if phone or email exists
    existing_user = db.query(User).filter(
        (User.phone == staff_in.phone) | (User.email == staff_in.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Phone or email already registered."
        )
    
    hashed_password = get_password_hash(staff_in.password)
    new_user = User(
        phone=staff_in.phone,
        email=staff_in.email,
        name=staff_in.name,
        password_hash=hashed_password,
        role=staff_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Audit log
    audit = AuditLog(
        user_id=new_user.id,
        action="REGISTER_STAFF",
        details=f"Staff {new_user.name} registered as {staff_in.role}"
    )
    db.add(audit)
    db.commit()

    return new_user

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = None
    if login_in.phone:
        user = db.query(User).filter(User.phone == login_in.phone).first()
    elif login_in.email:
        user = db.query(User).filter(User.email == login_in.email).first()

    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/mobile or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.id, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
