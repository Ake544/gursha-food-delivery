from fastapi import APIRouter, HTTPException
from fastapi import Request as FastAPIRequest
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
import os
import json
import base64
from pathlib import Path
import db_helper
import generic_helper
from passlib.context import CryptContext
from google.oauth2 import service_account
from google.auth.transport import requests
from jose import jwt, JWTError
from google.oauth2 import id_token as google_id_token
from google.auth.transport.requests import Request 
from decimal import Decimal
from datetime import datetime  
from typing import Optional, List
from google.oauth2 import service_account


SERVICE_ACCOUNT_FILE = "/etc/secrets/service_account.json"

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "fallback_temp_key_but_warn")
ALGORITHM = "HS256"

if SECRET_KEY == "fallback_temp_key_but_warn":
    print("⚠️  WARNING: Using fallback SECRET_KEY - this should not happen in production!")

inprogress_orders = {}

def extract_auth_token_from_payload(payload: dict) -> str | None:
    #print("🔍 Looking for token in payload...")
    
    # FIRST: Check outputContexts (where Dialogflow puts your token)
    try:
        contexts = payload.get('queryResult', {}).get('outputContexts', [])
        for context in contexts:
            if 'auth' in context.get('name', ''):  # Look for auth context
                auth_token = context.get('parameters', {}).get('authToken')
                if auth_token:
                    #print(f"✅ Found token in outputContexts: {auth_token[:20]}...")
                    return auth_token
    except:
        pass
    
    # SECOND: Check originalDetectIntentRequest (fallback)
    try:
        token = payload.get('originalDetectIntentRequest', {}).get('payload', {}).get('authToken')
        if token:
            #print(f"✅ Found token in originalDetectIntentRequest: {token[:20]}...")
            return token
    except:
        pass
    
    #print("❌ No auth token found in payload")
    return None

def extract_token_from_header(auth_header: str | None) -> str | None:
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip()

def get_jwt_header(token: str) -> dict:
    """Decode JWT header without verifying signature."""
    header_segment = token.split('.')[0]
    padded = header_segment + '=' * (-len(header_segment) % 4)
    return json.loads(base64.urlsafe_b64decode(padded).decode())

# Enhance your JWT decoding with better error handling
def decode_internal_jwt(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"ok": True, "type": "internal", "user_id": payload.get("user_id"), "payload": payload}
    except jwt.ExpiredSignatureError:
        return {"ok": False, "error": "Token expired"}
    except jwt.JWTError as e:
        return {"ok": False, "error": f"Invalid token: {str(e)}"}
    except Exception as e:
        return {"ok": False, "error": f"Token decoding error: {str(e)}"}

def decode_internal_user_id(token: str) -> str | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=ALGORITHM)
        return payload.get("user_id")   # this is the Google sub you stored in users.user_id
    except JWTError:
        return None


class VerifyPayment(BaseModel):
    session_id: str
    payment_name: str

@router.get("/token")
def token():
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )

    creds.refresh(Request())
    return {"access_token": creds.token}

# Modify the handle_request endpoint
@router.post("/")
async def handle_request(request: FastAPIRequest):
    payload = await request.json()

    intent = payload['queryResult']['intent']['displayName']
    parameters = payload['queryResult']['parameters']
    output_context = payload['queryResult'].get('outputContexts', []) or []

    print(json.dumps(payload, indent=2))

    if output_context:
        session_id = generic_helper.extract_session_id(output_context[0]['name'])
    else:
        session_id = "unknown"

    # Intents that require login
    protected_intents = {
        'order.add - context: ongoing-order',
        'order.remove - context: ongoing-order',
        'order.complete - context: ongoing-order',
    }

    user_id = None
    if intent in protected_intents:
        # 1) FIRST: Try to get token from Dialogflow payload/context
        token_str = extract_auth_token_from_payload(payload)

        # 2) SECOND: Fallback to header (only if payload didn't have it)
        if not token_str:
            auth_header = request.headers.get("Authorization")
            token_str = extract_token_from_header(auth_header)

        if not token_str:
            return JSONResponse({"fulfillmentText": "Please login first to place orders!"}, status_code=401)

        # 3) DECODE THE TOKEN TO GET USER_ID - THIS IS WHAT'S MISSING!
        try:
            payload_data = jwt.decode(token_str, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload_data.get("user_id")
        except jwt.ExpiredSignatureError:
            return JSONResponse({"fulfillmentText": "Your session has expired. Please login again."}, status_code=401)
        except jwt.JWTError as e:
            return JSONResponse({"fulfillmentText": "Invalid authentication token. Please login again."}, status_code=401)
        except Exception as e:
            return JSONResponse({"fulfillmentText": "Authentication error. Please try logging in again."}, status_code=401)

    intent_handler_dict = {
        'order.add - context: ongoing-order': add_to_order,
        'order.remove - context: ongoing-order': remove_from_order,
        'order.complete - context: ongoing-order': complete_order,
        'track.order - context: ongoing-tracking': track_order
    }
#Looking
    if intent in intent_handler_dict:
        if intent == 'order.complete - context: ongoing-order':
            if user_id is None:
                return JSONResponse(
                    {"fulfillmentText": "Please login to your account to complete the order."},
                    status_code=401
                )
            return intent_handler_dict[intent](parameters, session_id, user_id)
        else:
            return intent_handler_dict[intent](parameters, session_id)
    else:
        return JSONResponse(content={"fulfillmentText": "Intent not recognized"})

def add_to_order(parameters: dict, session_id: str):
    food_item = parameters['food-item']
    quantities = parameters['number']
    print("food_item", food_item)

    if len(food_item) != len(quantities):
            fulfillment_text = "The number of food items and quantities do not match."
    else:   
        new_food_dict = dict(zip(food_item, quantities))

        if session_id in inprogress_orders:
            current_food_dict = inprogress_orders[session_id]
            for item, qty in new_food_dict.items():
                if item in current_food_dict:
                    current_food_dict[item] += qty
                else:
                    current_food_dict[item] = qty
        else:
            inprogress_orders[session_id] = new_food_dict

        order_str = generic_helper.get_str_from_food_dict(inprogress_orders[session_id])
        fulfillment_text = f"You have {order_str} in your order.Do you want to add more items or complete the order?"

    return JSONResponse(content={
            "fulfillmentText": fulfillment_text
        })

def remove_from_order(parameters: dict, session_id: str):
    if session_id not in inprogress_orders:
        fulfillment_text = "I'm having a trouble finding your order. Sorry, Can you place a new order?"
    
    else:
        current_order = inprogress_orders[session_id]
        food_items = parameters['food-item']
        removed_items = []
        no_such_items = []

        for item in food_items:
            if item not in current_order:
                no_such_items.append(item)
            else:
                removed_items.append(item)
                del current_order[item]

        if len(removed_items) > 0:
            fulfillment_text = f"Removed {', '.join(removed_items)} from your order."
        if len(no_such_items) > 0:
            fulfillment_text = f"No such items in your order: {', '.join(no_such_items)}."

        if len(current_order.keys()) == 0:
            fulfillment_text += "Your order is now empty. Please add items to your order."
        else:
            order_str = generic_helper.get_str_from_food_dict(current_order)
            fulfillment_text += f"Your current order is: {order_str}. Do you want to add more items or complete the order?"

    return JSONResponse(content={
        "fulfillmentText": fulfillment_text
    })        

def complete_order(parameters: dict, session_id: str, user_id: str):
    if session_id not in inprogress_orders:
        return JSONResponse(content={
            "fulfillmentText": "I'm having trouble finding your order. Please place a new order."
        })


    order = inprogress_orders[session_id]
    order_id = save_to_db(order, user_id)  

    try:
        connection = db_helper.get_db_connection()
        cursor = connection.cursor()
        
        for food_item, quantity in order.items():
            update_query = """
                UPDATE food_items 
                SET order_count = order_count + %s
                WHERE name = %s
            """
            cursor.execute(update_query, (quantity, food_item))
        
        connection.commit()
        cursor.close()
        connection.close()
    except Exception as e:
        print(f"Error updating order counts: {e}")

    if order_id == -1:
        return JSONResponse(content={
            "fulfillmentText": "There was an error saving your order. Please try again."
        })

    order_total = db_helper.get_total_order_price(order_id)
    payment_url = f"https://gursha-food-delivery.onrender.com/static/payment.html?session_id={session_id}"
    
    del inprogress_orders[session_id]

    return JSONResponse(content={
        "fulfillmentText": "Payment Done!"
    })
    #return JSONResponse(content={
        #f"fulfillmentText": (f"Order ID: #{order_id}\n"
        #f"Total: {order_total} Birr\n"
        #f"Please pay here: {https://gursha-food-delivery.onrender.com/static/payment.html?session_id={session_id}}")
    #})

def save_to_db(order: dict, user_id: str):

    next_order_id = db_helper.get_next_order_id()
    db_helper.order_status_auto(next_order_id)
    
    for food_item, quantity in order.items():
        rcode = db_helper.insert_order_item(
            food_item,
            quantity,
            next_order_id,
            user_id
        )
        if rcode != 1:
            print(f"Error inserting order item: {food_item} with quantity: {quantity}--->>")
            return -1

    return next_order_id

def track_order(parameters: dict, session_id: str):
    order_id = int(parameters['number'][0])
    order_status = db_helper.get_order_status(order_id)
    if order_status:
        #print(f"Order ID: {order_id}, Status: {order_status}")
        fulfillment_text = f"The order status for order id: {order_id} is: {order_status}"
    else:
        fulfillment_text = f"No order found with order id: {order_id}"

    return JSONResponse(content={
        "fulfillmentText": fulfillment_text
    })

@router.get("/my-orders/{user_id}")
async def get_user_orders(user_id: str):
        
    try:
        orders = db_helper.user_order_history(user_id)
        if not orders:
            return JSONResponse(content={"orders": []})
        
        # Group items by order_id
        orders_dict = {}
        for order in orders:
            if isinstance(order['total_price'], Decimal):
                order['total_price'] = float(order['total_price'])
            if isinstance(order['order_date'], datetime):
                order['order_date'] = order['order_date'].isoformat()
        
        # ✅ Return proper JSON response
        return JSONResponse(content={"orders": orders})
        
    except Exception as e:
        #print(f"Error fetching orders: {e}")
        return {"error": "Failed to fetch orders"}

# Add this model for recipe response
class Recipe(BaseModel):
    item_id: int
    name: str
    price: float
    time: str
    portion: str
    rating: float
    country_name: str

# Add these endpoints to your existing main.py

@router.get("/api/recipes", response_model=List[Recipe])
async def get_recipes_by_country(country_name: Optional[str] = None):
    """
    Get recipes by country name. If no country specified, returns all recipes.
    """
    try:
        recipes = db_helper.recipe_by_country(country_name)
        return recipes
        
    except Exception as e:
        print(f"Error fetching recipes: {e}")
        raise HTTPException(status_code=500, detail="Error fetching recipes")

@router.get("/api/countries")
async def get_available_countries():
    """
    Get list of all available countries with recipes
    """
    try:
        countries = db_helper.get_countries()
        return countries
        
    except Exception as e:
        print(f"Error fetching countries: {e}")
        raise HTTPException(status_code=500, detail="Error fetching countries")

@router.get("/api/recipe/{item_id}", response_model=Recipe)
async def get_recipe_by_id(item_id: int):
    """
    Get a specific recipe by its item_id
    """
    try:
        recipe = db_helper.recipe_by_id(item_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
            
        return recipe
        
    except Exception as e:
        print(f"Error fetching recipe: {e}")
        raise HTTPException(status_code=500, detail="Error fetching recipe")
    


@router.get("/api/recipes/hot-right-now", response_model=List[Recipe])
async def get_hot_right_now_recipes(limit: int = 18):
    """
    Get top 10 trending recipes based on order count
    """
    try:
        recipes = db_helper.get_trending_recipes(limit)
        return recipes
    except Exception as e:
        print(f"Error fetching hot recipes: {e}")
        return []

@router.get("/api/recipes/newest", response_model=List[Recipe])
async def get_newest_recipes(limit: int = 18):
    """
    Get top 10 newest recipes based on date_added
    """
    try:
        recipes = db_helper.get_newest_recipes(limit)
        return recipes    
    except Exception as e:
        print(f"Error fetching newest recipes: {e}")
        return []
    
@router.get("/admin/total-revenue")
async def get_total_revenue():
    try:
        total_revenue = db_helper.get_total_revenue()  
        if isinstance(total_revenue, Decimal):
            total_revenue = float(total_revenue)
        return {"total_revenue": total_revenue}
    except Exception as e:
        print(f"Error fetching total revenue: {e}")
        raise HTTPException(status_code=500, detail="Error fetching total revenue")

