

def is_valid_temp(temp: float):
    if not isinstance(temp, (int, float)):
        return False
    if temp < 5:
        return False
    if temp > 30:
        return False
    return True
