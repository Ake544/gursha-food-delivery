import re

def extract_session_id(session_str: str):
    match = re.search(r'sessions\/([a-zA-Z0-9\-]+)', session_str)
    if match:
        extracted_string = match.group(1)
        return extracted_string
    
def get_str_from_food_dict(food_dict: dict):
    return ', '.join([f"{int(quantity)} {food_item}" for food_item, quantity in food_dict.items()])