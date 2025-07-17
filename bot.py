import requests
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import json
import os
import string
import random

def generate_username_numbers(current_number, length):
    """Generates a numeric username from a number, padded to the specified length."""
    return str(current_number).zfill(length)

def generate_username_letters(current_number, length):
    """Generates a letter-only username from a number."""
    alphabet = string.ascii_lowercase
    result = ""
    num = current_number

    for _ in range(length):
        result = alphabet[num % 26] + result
        num //= 26

    return result

def generate_username_mixed(current_number, length):
    """Generates a mixed alphanumeric username from a number."""
    chars = string.ascii_lowercase + string.digits
    result = ""
    num = current_number

    for _ in range(length):
        result = chars[num % 36] + result
        num //= 36

    return result

def save_progress(current_number, length, username_type, available_usernames, check_count):
    """Save current progress to cache file."""
    cache_data = {
        'current_number': current_number,
        'length': length,
        'username_type': username_type,
        'available_usernames': available_usernames,
        'check_count': check_count
    }

    cache_filename = f"username_cache_{length}_{username_type}.json"
    try:
        with open(cache_filename, 'w') as f:
            json.dump(cache_data, f, indent=2)
        print(f"💾 Progress saved to {cache_filename}")
    except Exception as e:
        print(f"❌ Error saving cache: {e}")

def load_progress(length, username_type):
    """Load progress from cache file if it exists."""
    cache_filename = f"username_cache_{length}_{username_type}.json"

    if os.path.exists(cache_filename):
        try:
            with open(cache_filename, 'r') as f:
                cache_data = json.load(f)

            # Validate cache data
            if (cache_data.get('length') == length and 
                cache_data.get('username_type') == username_type and
                isinstance(cache_data.get('current_number'), int) and
                isinstance(cache_data.get('available_usernames'), list) and
                isinstance(cache_data.get('check_count'), int)):

                print(f"📂 Found cache file: {cache_filename}")
                print(f"   Last checked: {cache_data['current_number']}")
                print(f"   Found usernames: {len(cache_data['available_usernames'])}")
                print(f"   Total checks: {cache_data['check_count']}")

                resume = input("Resume from where you left off? (y/n, default y): ").lower()
                if resume != 'n':
                    return cache_data

        except Exception as e:
            print(f"❌ Error loading cache: {e}")

    return None

# Create a session with improved retry strategy
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

def check_username_validation_glitch(username, max_cycles=50, verbose=False):
    """Checks username availability using persistent cycling glitch method."""

    def get_fresh_headers():
        """Generate fresh headers for each request to avoid caching."""
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "close",  # Force new connection each time
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

    # Generate different birthdays to cycle through (all 13+ years old)
    birthdays = [
        "2005-01-01T00:00:00.000Z",
        "2005-01-02T00:00:00.000Z", 
        "2005-01-03T00:00:00.000Z",
        "2005-01-04T00:00:00.000Z",
        "2005-01-05T00:00:00.000Z",
        "2005-01-06T00:00:00.000Z",
        "2005-01-07T00:00:00.000Z",
        "2005-01-08T00:00:00.000Z",
        "2005-01-09T00:00:00.000Z",
        "2005-01-10T00:00:00.000Z",
        "2005-01-11T00:00:00.000Z",
        "2005-01-12T00:00:00.000Z",
        "2005-01-13T00:00:00.000Z",
        "2005-01-14T00:00:00.000Z",
        "2005-01-15T00:00:00.000Z",
        "2005-01-16T00:00:00.000Z",
        "2005-01-17T00:00:00.000Z",
        "2005-01-18T00:00:00.000Z",
        "2005-01-19T00:00:00.000Z",
        "2005-01-20T00:00:00.000Z",
        "2005-01-21T00:00:00.000Z",
        "2005-01-22T00:00:00.000Z",
        "2005-01-23T00:00:00.000Z",
        "2005-01-24T00:00:00.000Z",
        "2005-01-25T00:00:00.000Z",
        "2005-01-26T00:00:00.000Z",
        "2005-01-27T00:00:00.000Z",
        "2005-01-28T00:00:00.000Z",
        "2005-01-29T00:00:00.000Z",
        "2005-01-30T00:00:00.000Z",
        "2005-01-31T00:00:00.000Z"
    ]

    validate_url = "https://auth.roblox.com/v1/usernames/validate"
    
    # Track response patterns to detect availability glitch
    response_history = []
    not_appropriate_count = 0
    available_found = False
    taken_found = False
    cycle = 0

    if verbose:
        print(f"    📤 Testing username '{username}' with persistent cycling glitch (up to {max_cycles} cycles)")
        print(f"    🕐 Using 0.5 second delays between requests with fresh sessions")

    try:
        while cycle < max_cycles and not available_found:
            cycle += 1
            
            # Cycle through different birthdays
            for i, birthday in enumerate(birthdays):
                if verbose and cycle <= 3:  # Only show detailed logs for first few cycles
                    print(f"       🗓️ Cycle {cycle}, Birthday {i + 1}/{len(birthdays)}: {birthday[:10]}")

                params = {
                    "Username": username,
                    "Birthday": birthday,
                    "Context": 0  # 0 = signup context
                }

                start_time = time.time()
                try:
                    # Create a completely fresh session for each request
                    fresh_session = requests.Session()
                    
                    # Set up fresh retry strategy
                    retry_strategy = Retry(
                        total=2,
                        backoff_factor=0.1,
                        status_forcelist=[429, 500, 502, 503, 504],
                        connect=1,
                        read=1,
                    )
                    adapter = HTTPAdapter(max_retries=retry_strategy)
                    fresh_session.mount("http://", adapter)
                    fresh_session.mount("https://", adapter)
                    
                    # Get fresh headers for this request
                    fresh_headers = get_fresh_headers()
                    
                    response = fresh_session.get(validate_url, params=params, headers=fresh_headers, timeout=10)
                    end_time = time.time()

                    if verbose and cycle <= 3:
                        print(f"         📥 Response:")
                        print(f"            Status Code: {response.status_code}")
                        print(f"            Response Time: {(end_time - start_time) * 1000:.0f}ms")

                    if response.status_code == 200:
                        try:
                            data = response.json()

                            if verbose and cycle <= 3:
                                print(f"            Response Body: {json.dumps(data, indent=12)}")

                            # Parse the validation response
                            if 'code' in data:
                                code = data['code']
                                message = data.get('message', 'No message')
                                
                                # Track this response
                                response_history.append(code)

                                if code == 0:  # Username Available
                                    available_found = True
                                    return f"Username Available (found after {len(response_history)} requests, cycle {cycle})"
                                elif code == 1:  # Username Taken
                                    taken_found = True
                                    if verbose:
                                        print(f"            ✅ Username is taken (confirmed after {len(response_history)} requests)")
                                elif code == 2:  # Username not appropriate
                                    not_appropriate_count += 1
                                    if verbose and cycle <= 3:
                                        print(f"            ❌ Not appropriate (count: {not_appropriate_count})")
                                elif code == 10:
                                    return "Username Too Short"
                                elif code == 11:
                                    return "Username Too Long"
                                elif code == 12:
                                    return "Username Invalid Characters"
                                else:
                                    if verbose:
                                        print(f"            ⚠️ Unknown code {code}: {message}")

                        except (ValueError, KeyError) as e:
                            if verbose and cycle <= 3:
                                print(f"            ⚠️ JSON parsing error: {e}")
                            continue

                    elif response.status_code == 429:
                        if verbose:
                            print(f"            ⏱️ Rate limited (429)! Pausing for 5 seconds...")
                        time.sleep(5)
                        continue

                    elif response.status_code == 403:
                        if verbose:
                            print(f"            🚫 Forbidden (403) - might be blocked, pausing...")
                        time.sleep(2)
                        continue

                    else:
                        if verbose and cycle <= 3:
                            print(f"            ⚠️ Unexpected status code: {response.status_code}")
                        continue

                except requests.exceptions.RequestException as e:
                    if verbose and cycle <= 3:
                        print(f"            💥 Request exception: {e}")
                    time.sleep(1)
                    continue
                finally:
                    # Always close the fresh session to prevent connection reuse
                    try:
                        fresh_session.close()
                    except:
                        pass

                # Use 0.5 second delay as requested
                time.sleep(0.5)

                # Break if we found availability
                if available_found:
                    break

            # Progress update every 5 cycles
            if cycle % 5 == 0 and verbose:
                print(f"    📊 Progress: {cycle}/{max_cycles} cycles, {len(response_history)} total requests")
                if response_history:
                    recent_codes = response_history[-10:]
                    print(f"       Recent responses: {recent_codes}")

            # If we consistently get "taken" responses, we can conclude it's taken
            if taken_found and len(response_history) >= 20:
                recent_responses = response_history[-20:]
                if recent_responses.count(1) >= 15:  # 75% of recent responses are "taken"
                    return f"Username Taken (confirmed after {len(response_history)} requests)"

        # If we've exhausted all cycles
        if not available_found:
            if taken_found:
                return f"Username Taken (after {len(response_history)} requests across {cycle} cycles)"
            elif not_appropriate_count > 0:
                return f"Username Not Appropriate (after {len(response_history)} requests across {cycle} cycles)"
            else:
                return f"Check Failed (after {len(response_history)} requests across {cycle} cycles)"

    except KeyboardInterrupt:
        if verbose:
            print(f"\n    🛑 Check interrupted by user after {len(response_history)} requests")
        return f"Check Interrupted (after {len(response_history)} requests)"

    return f"Check Completed (after {len(response_history)} requests across {cycle} cycles)"

def check_username_validation(username, max_cycles=50, verbose=False):
    """Wrapper function that calls the glitch method."""
    return check_username_validation_glitch(username, max_cycles, verbose)

def test_single_username():
    """Test a single username with the glitch method."""
    username = input("Enter username to test: ").strip()
    if not username:
        print("No username provided.")
        return

    # Ask for verbose mode
    verbose_input = input("Show detailed request/response logs? (y/n, default n): ").strip().lower()
    verbose = verbose_input == 'y'

    print(f"\n🔍 Testing username: {username}")
    print(f"Using Roblox username validation endpoint...")
    if verbose:
        print("📊 Verbose mode enabled - showing detailed logs...")
    print("This may take a moment...\n")

    start_time = time.time()

    # Try multiple times with increasing delays if rate limited
    max_retries = 3
    for retry in range(max_retries):
        if retry > 0:
            delay = 10 * retry
            print(f"🔄 Retry {retry + 1}/{max_retries} - waiting {delay}s due to rate limiting...")
            time.sleep(delay)

        print(f"🚀 Attempt {retry + 1}/{max_retries} - Starting check...")
        status = check_username_validation(username, max_cycles=50, verbose=verbose)

        if "Check Failed" not in status:
            break

    end_time = time.time()

    print(f"\n{'='*60}")
    print(f"📋 FINAL RESULTS")
    print(f"{'='*60}")
    print(f"Username: {username}")
    print(f"Status: {status}")
    print(f"Test completed in {end_time - start_time:.2f} seconds")
    print(f"Attempts made: up to {35 * (retry + 1)}")

    if status == "Username Available":
        print(f"🎉 USERNAME APPEARS AVAILABLE!")
        print(f"🔗 Verify: https://www.roblox.com/search/users?keyword={username}")
        print(f"🔗 Signup: https://www.roblox.com/account/signupredir?username={username}")
    elif status == "Username Taken":
        print(f"❌ Username is taken")
    else:
        print(f"⚠️ Status unclear - manual verification recommended")
        if "Check Failed" in status:
            print(f"💡 Try again later - rate limiting may be affecting results")

def main():
    """Main function with 4 options."""
    try:
        print("🔍 Roblox Username Checker")
        print("=" * 50)
        print("1. Numbers only (e.g., 0001, 1234)")
        print("2. Letters only (e.g., aaaa, abcd)")
        print("3. Letters and numbers (e.g., a1b2, 0a1b)")
        print("4. Test single username")
        print("=" * 50)

        choice = input("Select option (1-4): ").strip()

        if choice == "4":
            test_single_username()
            return

        if choice not in ["1", "2", "3"]:
            print("Invalid choice. Please select 1, 2, 3, or 4.")
            return

        # Get settings for the chosen option
        length = int(input("Enter the desired username length: "))
        if length <= 0:
            print("Username length must be greater than 0.")
            return

        # Determine username type
        username_types = {"1": "numbers", "2": "letters", "3": "mixed"}
        username_type = username_types[choice]
        generators = {
            "numbers": generate_username_numbers,
            "letters": generate_username_letters,
            "mixed": generate_username_mixed
        }
        generator_func = generators[username_type]

        # Ask for verbose mode
        verbose_input = input("Show detailed request/response logs? (y/n, default n): ").strip().lower()
        verbose = verbose_input == 'y'

        # Ask for starting number
        start_input = input("Enter starting number (press Enter to resume from cache if available): ").strip()

        if start_input:
            # Manual starting number - skip caching
            try:
                current_number = int(start_input)
                if current_number < 0:
                    print("Starting number must be non-negative.")
                    return
                check_count = 0
                available_usernames = []
                print(f"🚀 Starting from manually entered number {current_number}")
            except ValueError:
                print("Invalid starting number. Please enter a valid integer.")
                return
        else:
            # Try to load cached progress
            cache_data = load_progress(length, username_type)

            if cache_data:
                check_count = cache_data['check_count']
                available_usernames = cache_data['available_usernames']
                current_number = cache_data['current_number']
                print(f"🔄 Resuming from number {current_number}")
            else:
                check_count = 0
                available_usernames = []
                current_number = 0
                print(f"🚀 Starting fresh search")

        print(f"Searching for available {length}-character {username_type} usernames...")
        print("Using POST requests to Roblox username validation endpoint...")
        print("Press Ctrl+C to stop the search.\n")

        # Calculate max number based on type
        if username_type == "numbers":
            max_number = min(10 ** length - 1, 50000)
        elif username_type == "letters":
            max_number = min(26 ** length - 1, 50000)
        else:  # mixed
            max_number = min(36 ** length - 1, 50000)

        save_interval = 25  # Save progress every 25 checks

        failed_checks = 0
        max_consecutive_failures = 10

        while current_number <= max_number:
            check_count += 1
            username = generator_func(current_number, length)

            print(f"\n[{check_count}] 🔍 Checking: {username}")
            if verbose:
                print(f"  📊 Detailed logging enabled for this check:")

            status = check_username_validation(username, max_cycles=50, verbose=verbose)

            if not verbose:
                print(f"  Status: {status}")
            else:
                print(f"  🏁 Final Status: {status}")

            # Handle failed checks
            if "Check Failed" in status:
                failed_checks += 1
                if failed_checks >= max_consecutive_failures:
                    print(f"\n⚠️  Too many consecutive failures ({failed_checks}). Pausing for 30 seconds...")
                    time.sleep(30)
                    failed_checks = 0
                else:
                    # Progressive delay for failed checks
                    delay = 2 + (failed_checks * 2)
                    time.sleep(delay)
            else:
                failed_checks = 0  # Reset counter on successful check

            # Add available usernames to list
            if "Available" in status:
                available_usernames.append(username)
                print(f"🎉 FOUND AVAILABLE: {username}")

            current_number += 1

            # Add delay between checks to be respectful to the API
            if failed_checks == 0:  # Only add normal delay if not already delayed for failures
                time.sleep(2.0 + random.uniform(0, 1.0))  # 2.0-3.0 second delay

            # Save progress periodically (only if not manually started)
            if not start_input and check_count % save_interval == 0:
                save_progress(current_number, length, username_type, available_usernames, check_count)

        # Save final progress and clean up cache (only if not manually started)
        if not start_input:
            save_progress(current_number, length, username_type, available_usernames, check_count)

        # Print final summary
        print(f"\n{'='*60}")
        print(f"✅ SEARCH COMPLETED - {check_count} usernames checked")
        print(f"{'='*60}")

        if available_usernames:
            print(f"\n🎉 FOUND {len(available_usernames)} AVAILABLE USERNAME(S):")
            print("-" * 60)
            for i, username in enumerate(available_usernames, 1):
                print(f"{i:2d}. {username}")
                print(f"    🔗 Verify: https://www.roblox.com/search/users?keyword={username}")
                print(f"    🔗 Signup: https://www.roblox.com/account/signupredir?username={username}")
                print()

            print("⚠️  IMPORTANT: Manually verify these usernames before use!")
            print("   Results from glitch method - double-check availability!")
        else:
            print("\n❌ No available usernames found during the search.")
            print("   Try searching with different length or range.")

    except ValueError:
        print("Invalid input. Please enter a valid number.")
    except KeyboardInterrupt:
        # Save progress before exiting (only if not manually started)
        if not start_input:
            save_progress(current_number, length, username_type, available_usernames, check_count)

        print(f"\n\n{'='*60}")
        print(f"🛑 SEARCH STOPPED BY USER - {check_count} usernames checked")
        print(f"{'='*60}")

        if available_usernames:
            print(f"\n🎉 FOUND {len(available_usernames)} AVAILABLE USERNAME(S):")
            print("-" * 60)
            for i, username in enumerate(available_usernames, 1):
                print(f"{i:2d}. {username}")
                print(f"    🔗 Verify: https://www.roblox.com/search/users?keyword={username}")
                print(f"    🔗 Signup: https://www.roblox.com/account/signupredir?username={username}")
                print()

            print("⚠️  IMPORTANT: Manually verify these usernames before use!")
        else:
            print("\n❌ No available usernames found before stopping.")

if __name__ == "__main__":
    main()
