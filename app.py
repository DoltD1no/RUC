from flask import Flask, request, render_template, jsonify, redirect, url_for
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import json
import time
import string
import random
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Create a session with retry strategy
def create_session():
    session = requests.Session()
    retry_strategy = Retry(
        total=3,
        backoff_factor=0.3,
        status_forcelist=[429, 500, 502, 503, 504],
        connect=2,
        read=2,
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

def get_fresh_headers():
    """Generate fresh headers for each request"""
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ]
    
    return {
        "User-Agent": random.choice(user_agents),
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "sec-ch-ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    }

def check_username_simple(username, verbose=False):
    """Simple username check using Roblox API"""
    validate_url = "https://auth.roblox.com/v1/usernames/validate"
    
    try:
        session = create_session()
        params = {
            "Username": username,
            "Birthday": "2005-01-01T00:00:00.000Z",
            "Context": 0
        }
        
        response = session.get(
            validate_url,
            params=params,
            headers=get_fresh_headers(),
            timeout=15
        )
        
        if verbose:
            logger.info(f"Simple check for {username}: Status {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                code = data.get('code', -1)
                
                status_map = {
                    0: "Username Available",
                    1: "Username Taken",
                    2: "Username Not Appropriate",
                    10: "Username Too Short",
                    11: "Username Too Long",
                    12: "Username Invalid Characters",
                    13: "Username Already Taken"
                }
                
                return status_map.get(code, f"Unknown Status Code: {code}")
            except (ValueError, KeyError) as e:
                if verbose:
                    logger.error(f"JSON parsing error for {username}: {e}")
                return "Check Failed - Invalid Response"
        elif response.status_code == 429:
            return "Rate Limited - Try Again Later"
        elif response.status_code == 403:
            return "Access Forbidden"
        else:
            return f"Check Failed - HTTP {response.status_code}"
            
    except requests.exceptions.Timeout:
        return "Check Failed - Request Timeout"
    except requests.exceptions.ConnectionError:
        return "Check Failed - Connection Error"
    except requests.exceptions.RequestException as e:
        if verbose:
            logger.error(f"Request error for {username}: {e}")
        return "Check Failed - Network Error"
    finally:
        try:
            session.close()
        except:
            pass

def check_username_glitch(username, max_cycles=5, verbose=False):
    """Advanced username check using multiple validation attempts"""
    birthdays = [
        f"2005-01-{str(i).zfill(2)}T00:00:00.000Z" for i in range(1, 29)
    ]
    
    validate_url = "https://auth.roblox.com/v1/usernames/validate"
    response_history = []
    status_counts = {"available": 0, "taken": 0, "inappropriate": 0, "other": 0}
    
    if verbose:
        logger.info(f"Starting glitch check for {username}")
    
    try:
        for cycle in range(max_cycles):
            if verbose:
                logger.info(f"Glitch check cycle {cycle + 1}/{max_cycles} for {username}")
            
            for birthday in birthdays:
                session = create_session()
                
                params = {
                    "Username": username,
                    "Birthday": birthday,
                    "Context": 0
                }
                
                try:
                    response = session.get(
                        validate_url,
                        params=params,
                        headers=get_fresh_headers(),
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            code = data.get('code', -1)
                            response_history.append(code)
                            
                            if code == 0:  # Available
                                status_counts["available"] += 1
                                if status_counts["available"] >= 2:
                                    if verbose:
                                        logger.info(f"Username {username} found available after {len(response_history)} checks")
                                    return f"Username Available (Glitch Method - {len(response_history)} checks)"
                            elif code == 1:  # Taken
                                status_counts["taken"] += 1
                            elif code == 2:  # Not appropriate
                                status_counts["inappropriate"] += 1
                            else:
                                status_counts["other"] += 1
                                
                        except (ValueError, KeyError):
                            continue
                    elif response.status_code == 429:
                        time.sleep(random.uniform(2, 5))
                        continue
                    elif response.status_code == 403:
                        time.sleep(random.uniform(1, 3))
                        continue
                        
                except requests.exceptions.RequestException:
                    continue
                finally:
                    try:
                        session.close()
                    except:
                        pass
                
                # Small delay between requests
                time.sleep(random.uniform(0.3, 0.8))
                
                # Break if we have enough data
                if len(response_history) >= 15:
                    break
            
            # Break if we have enough data
            if len(response_history) >= 15:
                break
        
        # Analyze results
        total_checks = len(response_history)
        if total_checks == 0:
            return "Check Failed - No Responses"
        
        # Determine final status based on counts
        if status_counts["available"] >= 2:
            return f"Username Available (Glitch Method - {total_checks} checks)"
        elif status_counts["taken"] >= total_checks * 0.7:
            return f"Username Taken (Glitch Method - {total_checks} checks)"
        elif status_counts["inappropriate"] >= total_checks * 0.5:
            return f"Username Not Appropriate (Glitch Method - {total_checks} checks)"
        else:
            return f"Status Uncertain (Glitch Method - {total_checks} checks)"
            
    except KeyboardInterrupt:
        return "Check Interrupted by User"
    except Exception as e:
        if verbose:
            logger.error(f"Glitch check error for {username}: {e}")
        return "Check Failed - Unexpected Error"

def generate_username_numbers(current_number, length):
    """Generate numeric username"""
    return str(current_number).zfill(length)

def generate_username_letters(current_number, length):
    """Generate alphabetic username"""
    alphabet = string.ascii_lowercase
    result = ""
    num = current_number
    
    for _ in range(length):
        result = alphabet[num % 26] + result
        num //= 26
    
    return result

def generate_username_mixed(current_number, length):
    """Generate alphanumeric username"""
    chars = string.ascii_lowercase + string.digits
    result = ""
    num = current_number
    
    for _ in range(length):
        result = chars[num % 36] + result
        num //= 36
    
    return result

@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        try:
            check_type = request.form.get("check_type")
            
            if check_type == "single":
                username = request.form.get("username", "").strip()
                use_glitch = request.form.get("use_glitch") == "true"
                
                if not username:
                    return jsonify({"error": "Please enter a username."}), 400
                
                if len(username) < 3 or len(username) > 20:
                    return jsonify({"error": "Username must be between 3 and 20 characters."}), 400
                
                logger.info(f"Checking username: {username} (glitch: {use_glitch})")
                
                # Check username
                if use_glitch:
                    status = check_username_glitch(username, max_cycles=3, verbose=True)
                else:
                    status = check_username_simple(username, verbose=True)
                
                result = {
                    "username": username,
                    "status": status,
                    "verify_url": f"https://www.roblox.com/search/users?keyword={username}",
                    "signup_url": f"https://www.roblox.com/account/signupredir?username={username}"
                }
                
                return jsonify(result)
            
            elif check_type == "bulk":
                try:
                    length = int(request.form.get("length", 6))
                    username_type = request.form.get("username_type", "mixed")
                    max_checks = min(int(request.form.get("max_checks", 10)), 20)
                    use_glitch = request.form.get("use_glitch") == "true"
                except ValueError:
                    return jsonify({"error": "Invalid input. Please enter valid numbers."}), 400
                
                if length <= 0 or length > 20:
                    return jsonify({"error": "Username length must be between 1 and 20."}), 400
                
                generators = {
                    "numbers": generate_username_numbers,
                    "letters": generate_username_letters,
                    "mixed": generate_username_mixed
                }
                
                if username_type not in generators:
                    return jsonify({"error": "Invalid username type."}), 400
                
                generator_func = generators[username_type]
                results = []
                current_number = 0
                checks_performed = 0
                
                logger.info(f"Starting bulk check: length={length}, type={username_type}, max_checks={max_checks}, glitch={use_glitch}")
                
                while checks_performed < max_checks:
                    username = generator_func(current_number, length)
                    
                    # Check username
                    if use_glitch:
                        status = check_username_glitch(username, max_cycles=2, verbose=False)
                    else:
                        status = check_username_simple(username, verbose=False)
                    
                    result = {
                        "username": username,
                        "status": status,
                        "verify_url": f"https://www.roblox.com/search/users?keyword={username}",
                        "signup_url": f"https://www.roblox.com/account/signupredir?username={username}"
                    }
                    
                    results.append(result)
                    checks_performed += 1
                    current_number += 1
                    
                    # Small delay to avoid overwhelming the API
                    time.sleep(random.uniform(0.5, 1.5))
                    
                    # Break if we found enough available usernames
                    available_count = sum(1 for r in results if "Available" in r["status"])
                    if available_count >= 10:
                        break
                
                available_count = sum(1 for r in results if "Available" in r["status"])
                summary = f"{available_count} available out of {len(results)} checked"
                
                logger.info(f"Bulk check completed: {summary}")
                
                return jsonify({
                    "results": results,
                    "summary": summary
                })
        
        except Exception as e:
            logger.error(f"Error processing request: {e}")
            return jsonify({"error": "An unexpected error occurred. Please try again."}), 500
    
    return render_template("index.html")

@app.route("/results", methods=["GET", "POST"])
def results():
    if request.method == "POST":
        try:
            results_json = request.form.get("results")
            if results_json:
                results_data = json.loads(results_json)
                return render_template("results.html", results=results_data)
        except (json.JSONDecodeError, ValueError):
            pass
    
    return render_template("results.html", results=None)

@app.errorhandler(404)
def not_found(error):
    return redirect(url_for('index'))

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return render_template("index.html", error="An internal server error occurred. Please try again.")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=False)
