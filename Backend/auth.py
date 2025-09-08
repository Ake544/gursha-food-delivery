from fastapi import APIRouter, Request, HTTPException, Depends, Header
from fastapi.responses import RedirectResponse, JSONResponse
from jose import jwt
from pydantic import BaseModel
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os
from dotenv import load_dotenv
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
import base64
import json
import mysql.connector


#oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

load_dotenv()

router = APIRouter()

# Google OAuth Config

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = "https://gursha-food-delivery.onrender.com/auth/google/callback"

def get_db():
    return mysql.connector.connect(
        host=os.getenv('MYSQLHOST'),
        user=os.getenv('MYSQLUSER'),
        password=os.getenv('MYSQLPASSWORD'),
        database=os.getenv('MYSQLDATABASE'),
        port=os.getenv('MYSQLPORT')
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "secret"
ALGORITHM = "HS256"

class AdminLogin(BaseModel):
    email: str
    password: str

@router.post("/dev/create-test-token")
async def create_test_token(user_data: dict):
    """Create a test token for development"""
    user_id = user_data.get("user_id", "test_user_123")
    token = jwt.encode({"user_id": user_id}, SECRET_KEY, algorithm=ALGORITHM)
    return {
        "access_token": token,
        "token_type": "bearer",
        "message": "Use for testing"
    }

# Step 1: Redirect user to Google for login
@router.get("/auth/google")
def google_login():
    scope = "openid email profile"
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"response_type=code&"
        f"scope={scope}&"
        f"redirect_uri={GOOGLE_REDIRECT_URI}"
    )
    return RedirectResponse(google_auth_url)

# Step 2: Google redirects back with code
@router.get("/auth/google/callback")
def google_callback(code: str):
    # Exchange code for tokens
    token_req = requests.post(
    "https://oauth2.googleapis.com/token",
    data={
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    })  
    token_data = token_req.json()
    google_id_token = token_data.get("id_token")  # renamed

    if not google_id_token:
        raise HTTPException(status_code=400, detail="Failed to get id_token from Google")

    # Decode Google ID token
    id_info = id_token.verify_oauth2_token(google_id_token, google_requests.Request(), GOOGLE_CLIENT_ID)
    google_id = id_info["sub"]
    email = id_info.get("email")
    name = id_info.get("name", "")

    # Store in DB
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE user_id = %s", (google_id,))
    user = cursor.fetchone()

    if not user:
        # New user: insert
        cursor.execute(
            "INSERT INTO users (user_id, name, email) VALUES (%s, %s, %s)",
            (google_id, name, email)
        )
        db.commit()

    cursor.close()
    db.close()

    # Create JWT for your app
    app_token = jwt.encode({"user_id": google_id}, SECRET_KEY, algorithm=ALGORITHM)
    return JSONResponse({"access_token": app_token, "token_type": "bearer", "user": {"id": google_id, "name": name, "email": email}})

@router.post("/google-login")
async def google_login(request: Request):
    data = await request.json()
    token = data.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="No token provided")

    try:
        # Verify Google ID token
        id_info = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        google_id = id_info["sub"]
        email = id_info.get("email")
        name = id_info.get("name", "")

        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE user_id = %s", (google_id,))
        user = cursor.fetchone()

        if not user:
            # New user: insert
            cursor.execute(
                "INSERT INTO users (user_id, name, email) VALUES (%s, %s, %s)",
                (google_id, name, email)
            )
            print("Inserted new user:", google_id, name, email)
            db.commit()

        cursor.close()
        db.close()

        # Issue your own JWT
        app_token = jwt.encode({"user_id": google_id}, SECRET_KEY, algorithm=ALGORITHM)

        return JSONResponse({"access_token": app_token, "user": {"id": google_id, "name": name, "email": email}})

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid token: {str(e)}")
    
@router.post("/admin/login")
def admin_login(admin: AdminLogin):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM admins WHERE email = %s", (admin.email,))
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Admin not found")

        if not pwd_context.verify(admin.password, result["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid password")

        token = jwt.encode({"admin_id": result["admin_id"], "role": "admin"}, SECRET_KEY, algorithm=ALGORITHM)
        return {"access_token": token, "token_type": "bearer", "admin": True}

    finally:
        cursor.close()
        db.close()

@router.get("/admin")
def get_preparing_orders():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                o.order_id, 
                f.name AS food_item, 
                o.quantity
            FROM 
                orders o
            JOIN 
                order_tracking ot ON o.order_id = ot.order_id
            JOIN 
                food_items f ON o.item_id = f.item_id
            WHERE 
                ot.status = 'Preparing'
            ORDER BY 
                o.order_id DESC
        """)
        rows = cursor.fetchall()

        orders = {}
        for row in rows:
            oid = row["order_id"]
            if oid not in orders:
                orders[oid] = {
                    "order_id": oid,
                    "items": []
                }
            orders[oid]["items"].append({
                "name": row["food_item"],
                "quantity": row["quantity"]
            })

        return list(orders.values())
    finally:
        cursor.close()
        db.close()

@router.post("/admin/orders/{order_id}/out-for-delivery")
def mark_order_out_for_delivery(order_id: int):
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute("""
            UPDATE order_tracking
            SET status = 'Out for Delivery'
            WHERE order_id = %s AND status = 'Preparing'
        """, (order_id,))
        db.commit()
        return {"message": f"Order {order_id} marked as Out for Delivery"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        db.close()


@router.get("/user")
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.split(" ")[1]  # Extract token from "Bearer <token>"

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        print("user_id:", user_id)
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT name FROM users WHERE user_id = %s", (user_id,))
        user = cursor.fetchone()
        cursor.close()
        db.close()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {"name": user["name"]}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

class PaymentSuccessData(BaseModel):
    session_id: str
    card_name: str
    card_number: str
    amount: float

@router.post("/payment-success")
async def payment_success(payment_data: PaymentSuccessData):
    """Handle successful payment"""
    try:
        print(f"🎉 Payment Successful!")
        print(f"Session: {payment_data.session_id}")
        print(f"Card: {payment_data.card_number}")
        print(f"Name: {payment_data.card_name}")
        print(f"Amount: {payment_data.amount} Birr")
        
        return {
            "status": "success", 
            "message": "Payment processed successfully!",
            "session_id": payment_data.session_id
        }
        
    except Exception as e:
        print(f"Payment error: {e}")
        return {"status": "error", "message": str(e)}
    
