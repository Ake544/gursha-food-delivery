import mysql.connector
import os
import re

cnx = None 

def get_db_connection():
    global cnx
    if cnx is None or not cnx.is_connected():
        cnx = mysql.connector.connect(
            host=os.getenv('MYSQLHOST', 'localhost'),
            user=os.getenv('MYSQLUSER', 'root'),
            password=os.getenv('MYSQLPASSWORD', 'your_password'),
            database=os.getenv('MYSQLDATABASE', 'gursha_db'),
            port=os.getenv('MYSQLPORT', 3306)
        )
    return cnx

def close_connection():
    global cnx
    if cnx and cnx.is_connected():
        cnx.close()
    cnx = None
  
def get_order_status(order_id):
    # ✅ Create FRESH connection just for tracking (bypass cache)
    fresh_cnx = mysql.connector.connect(
        host=os.getenv('MYSQLHOST', 'localhost'),
        user=os.getenv('MYSQLUSER', 'root'),
        password=os.getenv('MYSQLPASSWORD', 'your_password'),
        database=os.getenv('MYSQLDATABASE', 'gursha_db'),
        port=os.getenv('MYSQLPORT', 3306)
    )
    
    cursor = fresh_cnx.cursor(buffered=True)
    query = "SELECT status FROM order_tracking WHERE order_id = %s"
    cursor.execute(query, (order_id,))
    result = cursor.fetchone()
    
    cursor.close()
    fresh_cnx.close()

    if result:
        return result[0]  
    else:
        return None

def extract_session_id(session_str: str):
    match = re.search(r'sessions\/([a-zA-Z0-9\-]+)', session_str)
    if match:
        extracted_string = match.group(1)
        return extracted_string
    
def get_str_from_food_dict(food_dict: dict):
    return ', '.join([f"{int(quantity)} {food_item}" for food_item, quantity in food_dict.items()])

def get_next_order_id():
    cnx = get_db_connection()
    cursor = cnx.cursor(buffered=True)

    query = "SELECT MAX(order_id) FROM orders"

    cursor.execute(query)

    result = cursor.fetchone()

    cursor.close()

    if result[0] is not None:
        return result[0] + 1
    else:
        return 1  
    
def insert_order_item(food_item: str, quantity: int, order_id: int, user_id: str):
    try:
        cnx = get_db_connection()
        cursor = cnx.cursor(buffered=True)

        cursor.callproc('insert_order_item', (food_item, quantity, order_id, user_id))
    
        cnx.commit()
        
        cursor.close()

        return 1
    
    except mysql.connector.Error as err:
        print(f"Error inserting order item: {err}")

        cnx.rollback()

        return -1
    
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

        cnx.rollback()

        return -1


def get_total_order_price(order_id: int):
    cnx = get_db_connection()
    cursor = cnx.cursor(buffered=True)

    query = f"SELECT get_total_order_price({order_id})"
    cursor.execute(query)

    result = cursor.fetchone()[0]

    cursor.close()

    return result
    
def order_status_auto(order_id: int):
    cnx = get_db_connection()
    cursor = cnx.cursor(buffered=True)
    status = 'Preparing'
    cursor.callproc('insert_order_status', (order_id, status))
    
    cnx.commit()
    
    cursor.close()

def get_user_id_by_email(email: str) -> int | None:
    cnx = get_db_connection()
    cursor = cnx.cursor(buffered=True)
    query = "SELECT user_id FROM users WHERE email = %s"
    cursor.execute(query, (email,))
    result = cursor.fetchone()
    cursor.close()
    if result:
        return result[0]
    return None

def user_order_history(user_id: int):
    cnx = get_db_connection()
    cursor = cnx.cursor(dictionary=True)
    
    # ✅ FIXED: Proper GROUP BY query
    query = """
    SELECT 
        o.order_id, 
        MAX(o.total_price) as total_price,  
        MAX(ot.status) as status,             
        MAX(ot.time) as order_date,         
        COUNT(o.item_id) as item_count,
        GROUP_CONCAT(f.name SEPARATOR ', ') as items
    FROM orders o
    JOIN order_tracking ot ON o.order_id = ot.order_id
    JOIN food_items f ON o.item_id = f.item_id
    WHERE o.user_id = %s
    GROUP BY o.order_id  
    ORDER BY order_date DESC
    """
    
    cursor.execute(query, (user_id,))
    orders = cursor.fetchall() 
    cursor.close()
    cnx.close()
    
    return orders

def get_countries():
    query = """
            SELECT DISTINCT c.country_id, c.country_name 
            FROM countries c
            JOIN food_items fi ON c.country_id = fi.country_id
            ORDER BY c.country_name
        """
        
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute(query)
    countries = cursor.fetchall()
    cursor.close()
    connection.close()
    
    return {"countries": [country['country_name'] for country in countries]}

def recipe_by_id(item_id: int):
    query = """
            SELECT fi.item_id, fi.name, fi.price, fi.time, fi.portion, fi.rating, c.country_name 
            FROM food_items fi
            JOIN countries c ON fi.country_id = c.country_id
            WHERE fi.item_id = %s
        """
        
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute(query, (item_id,))
    recipe = cursor.fetchone()
    cursor.close()
    connection.close()

    return recipe

def recipe_by_country(country_name: str):
    if country_name:
        query = """
            SELECT fi.item_id, fi.name, fi.price, fi.time, fi.portion, fi.rating, c.country_name 
            FROM food_items fi
            JOIN countries c ON fi.country_id = c.country_id
            WHERE c.country_name = %s
            ORDER BY fi.name
        """
        params = (country_name,)
    else:
        query = """
            SELECT fi.item_id, fi.name, fi.price, fi.time, fi.portion, fi.rating, c.country_name 
            FROM food_items fi
            JOIN countries c ON fi.country_id = c.country_id
            ORDER BY c.country_name, fi.name
        """
        params = ()
    
    # Use your existing db_helper or direct connection
    connection = get_db_connection()  # Adjust based on your db_helper
    cursor = connection.cursor(dictionary=True)
    cursor.execute(query, params)
    recipes = cursor.fetchall()
    cursor.close()
    connection.close()
    
    return recipes

def get_trending_recipes(limit):
    query = """
            SELECT fi.item_id, fi.name, fi.price, fi.time, fi.portion, fi.rating, c.country_name 
            FROM food_items fi
            JOIN countries c ON fi.country_id = c.country_id
            WHERE fi.order_count > 0
            ORDER BY fi.order_count DESC
            LIMIT %s
        """
        
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute(query, (limit,))
    recipes = cursor.fetchall()
    cursor.close()
    connection.close()
    
    return recipes

def get_newest_recipes(limit):
    query = """
            SELECT fi.item_id, fi.name, fi.price, fi.time, fi.portion, fi.rating, c.country_name 
            FROM food_items fi
            JOIN countries c ON fi.country_id = c.country_id
            ORDER BY fi.date_added DESC
            LIMIT %s
        """
        
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute(query, (limit,))
    recipes = cursor.fetchall()
    cursor.close()
    connection.close()
    
    return recipes

def get_total_revenue():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT SUM(total_price) AS total FROM orders")
    result = cursor.fetchone()
    cursor.close()
    connection.close()
    return result["total"] if result and result["total"] else 0

if __name__ == "__main__":
    print(get_total_revenue())