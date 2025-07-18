from flask import Flask, request, render_template, jsonify
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import json
import time
import string
import random

app = Flask(__name__)

# Create a session with retry strategy
session = requests.Session()
retry_strategy = Retry(
    total=3,
    backoff_factor=0.1,
    status_forcelist=[429, 500, 502, 503, 504],
    connect=2,
    read=2,
)
adapter = HTTPAdapter(max_retries=retry_strategy)
session.mount("http://", adapter)
session.mount("https://", adapter)

def get_fresh_headers():
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "close",
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
    validate_url = "https://auth.roblox.com/v1/usernames/validate"
    try:
        fresh_session = requests.Session()
        retry_strategy = Retry(total=2, backoff_factor=0.1, status_forcelist=[429, 500, 502, 503, 504], connect=1, read=1)
        adapter = HTTPAdapter(max_retries=retry_strategy)
        fresh_session.mount("http://", adapter)
        fresh_session.mount("https://", adapter)
        params = {"Username": username, "Birthday": "2005-01-01T00:00:00.000Z", "Context": 0}
        response = fresh_session.get(validate_url, params=params, headers=get_fresh_headers(), timeout=10)
        if response.status_code == 200:
            try:
                data = response.json()
                code = data.get('code')
                return {
                    0: "Username Available", 1: "Username Taken", 2: "Username Not Appropriate",
                    10: "Username Too Short", 11: "Username Too Long", 12: "Username Invalid Characters"
                }.get(code, f"Unknown Code {code}")
            except (ValueError, KeyError):
                return "Check Failed"
        elif response.status_code == 429:
            return "Rate Limited"
        elif response.status_code == 403:
            return "Forbidden"
        else:
            return "Check Failed"
    except requests.exceptions.RequestException:
        return "Check Failed"
    finally:
        try:
            fresh_session.close()
        except:
            pass

def check_username_validation_glitch(username, max_cycles=10, verbose=False):
    birthdays = [f"2005-01-{str(i).zfill(2)}T00:00:00.000Z" for i in range(1, 32)]
    validate_url = "https://auth.roblox.com/v1/usernames/validate"
    response_history = []
    not_appropriate_count = 0
    available_found = False
    taken_count = 0
    cycle = 0
    try:
        while cycle < max_cycles and not available_found and taken_count < 3:
            cycle += 1
            for birthday in birthdays:
                params = {"Username": username, "Birthday": birthday, "Context": 0}
                try:
                    fresh_session = requests.Session()
                    retry_strategy = Retry(total=2, backoff_factor=0.1, status_forcelist=[429, 500, 502, 503, 504], connect=1, read=1)
                    adapter = HTTPAdapter(max_retries=retry_strategy)
                    fresh_session.mount("http://", adapter)
                    fresh_session.mount("https://", adapter)
                    response = fresh_session.get(validate_url, params=params, headers=get_fresh_headers(), timeout=10)
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            code = data.get('code')
                            response_history.append(code)
                            if code == 0:
                                available_found = True
                                return f"Username Available (found after {len(response_history)} requests)"
                            elif code == 1:
                                taken_count += 1
                                if taken_count >= 3:
                                    return f"Username Taken (confirmed after 3 'taken' responses)"
                            elif code == 2:
                                not_appropriate_count += 1
                        except (ValueError, KeyError):
                            continue
                    elif response.status_code == 429:
                        time.sleep(5)
                        continue
                    elif response.status_code == 403:
                        time.sleep(2)
                        continue
                except requests.exceptions.RequestException:
                    time.sleep(1)
                    continue
                finally:
                    try:
                        fresh_session.close()
                    except:
                        pass
                time.sleep(0.5)
                if available_found:
                    break
        if not available_found:
            if taken_count >= 3:
                return f"Username Taken (confirmed after 3 'taken' responses)"
            elif not_appropriate_count > 0:
                return "Username Not Appropriate"
            else:
                return f"Check Failed (after {len(response_history)} requests)"
    except KeyboardInterrupt:
        return "Check Interrupted"
    return f"Check Completed (after {len(response_history)} requests)"

def generate_username_numbers(current_number, length):
    return str(current_number).zfill(length)

def generate_username_letters(current_number, length):
    alphabet = string.ascii_lowercase
    result = ""
    num = current_number
    for _ in range(length):
        result = alphabet[num % 26] + result
        num //= 26
    return result

def generate_username_mixed(current_number, length):
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
        check_type = request.form.get("check_type")
        if check_type == "single":
            username = request.form.get("username", "").strip()
            if not username:
                return render_template("index.html", error="Please enter a username.")
            status = check_username_simple(username)
            if status == "Username Not Appropriate":
                status = check_username_validation_glitch(username, max_cycles=10)
            result = {"username": username, "status": status, "verify_url": f"https://www.roblox.com/search/users?keyword={username}", "signup_url": f"https://www.roblox.com/account/signupredir?username={username}"}
            return jsonify(result)
        elif check_type == "bulk":
            try:
                length = int(request.form.get("length"))
                username_type = request.form.get("username_type")
                max_checks = min(int(request.form.get("max_checks", 10)), 20)
            except ValueError:
                return render_template("index.html", error="Invalid input. Please enter valid numbers.")
            if length <= 0 or length > 20:
                return render_template("index.html", error="Username length must be between 1 and 20.")
            generators = {"numbers": generate_username_numbers, "letters": generate_username_letters, "mixed": generate_username_mixed}
            if username_type not in generators:
                return render_template("index.html", error="Invalid username type.")
            generator_func = generators[username_type]
            results = []
            current_number = 0
            check_count = 0
            while check_count < max_checks:
                username = generator_func(current_number, length)
                status = check_username_simple(username)
                if status == "Username Not Appropriate":
                    status = check_username_validation_glitch(username, max_cycles=10)
                if "Available" in status:
                    results.append({"username": username, "status": status, "verify_url": f"https://www.roblox.com/search/users?keyword={username}", "signup_url": f"https://www.roblox.com/account/signupredir?username={username}"})
                check_count += 1
                current_number += 1
                time.sleep(1)
                if len(results) >= 5:
                    break
            return jsonify({"results": results, "summary": f"{len(results)} available"})
    return render_template("index.html", error=None)

@app.route("/results", methods=["POST"])
def results():
    data = request.get_json()
    if data and 'status' in data:
        return render_template("results.html", results=[data])
    elif data and 'results' in data:
        return render_template("results.html", results=data['results'])
    return render_template("results.html", results=None)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
