"""
Company Create Event E2E test (standalone script)

What it does
- Logs in with company credentials (testingsprint3@gmail.com / testingsprint3) at http://localhost:5173/
- Verifies redirect to company dashboard (/my-events)
- Opens http://localhost:5173/create-event
- Fills event form: title, description, date, location, category, maxCapacity, imageUrl, tags
- Submits the form
- PASS if we see success toast ("submitted for approval") or redirect to /my-events
- FAIL if we see error toasts or form validation fails

Environment options (PowerShell)
- $env:APP_BASE_URL = "http://localhost:5173"   # override base URL if needed
- $env:HEADLESS = "1"                           # run Chrome in headless mode
- $env:QUIET = "1"                              # suppress [info] logs, show only PASS/FAIL
- $env:COMPANY_EMAIL = "testingsprint3@gmail.com"  # override login email
- $env:COMPANY_PASSWORD = "testingsprint3"         # override login password

Run (PowerShell)
1) Start the app in another terminal: npm install; npm run dev
2) Create venv & install deps:
   py -m venv .venv
   .\.venv\Scripts\Activate
   python -m pip install --upgrade pip
   pip install selenium webdriver-manager
3) Execute:
   $env:HEADLESS = "1"; $env:QUIET = "1"
   python test-cases\company-make-events.py
"""

import os
import sys
import time
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Union

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.select import Select
from selenium.webdriver.common.keys import Keys
from webdriver_manager.chrome import ChromeDriverManager


BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173").rstrip("/")
LOGIN_URL = BASE_URL  
CREATE_EVENT_URL = f"{BASE_URL}/create-event"
QUIET = os.getenv("QUIET", "1") == "1"

COMPANY_EMAIL = os.getenv("COMPANY_EMAIL", "testingsprint3@gmail.com")
COMPANY_PASSWORD = os.getenv("COMPANY_PASSWORD", "testingsprint3")

PAGE_WAIT_SEC = 15
TOAST_WAIT_SEC = 6
EVENT_MINUTES_AHEAD = int(os.getenv("EVENT_MINUTES_AHEAD", "180") or 180)


def xpath_contains_text(text: str) -> str:
	if "'" not in text:
		return f"//*[contains(., '{text}')]"
	if '"' not in text:
		return f'//*[contains(., "{text}")]'
	parts = text.split("'")
	return "//*[contains(., concat('" + "',\"'\", '".join(parts) + "')))]"


def build_driver() -> webdriver.Chrome:
	opts = Options()
	if os.getenv("HEADLESS", "1") == "1":
		opts.add_argument("--headless=new")
	opts.add_argument("--window-size=1280,900")
	opts.add_argument("--disable-gpu")
	opts.add_argument("--no-sandbox")
	service = Service(ChromeDriverManager().install())
	drv = webdriver.Chrome(service=service, options=opts)
	drv.implicitly_wait(2)
	return drv


def format_future_datetime(minutes_from_now: Optional[int] = None) -> str:
	if minutes_from_now is None:
		minutes_from_now = EVENT_MINUTES_AHEAD
	dt = datetime.now() + timedelta(minutes=minutes_from_now)
	dt = dt.replace(second=0, microsecond=0)
	return dt.strftime("%Y-%m-%dT%H:%M")


def info(msg: str) -> None:
	if not QUIET:
		print(msg)


def wait_for_any_text(drv: webdriver.Chrome, texts: List[str], timeout: int) -> Optional[str]:
	end = time.time() + timeout
	while time.time() < end:
		for t in texts:
			try:
				el = WebDriverWait(drv, 0.5).until(
					EC.presence_of_element_located((By.XPATH, xpath_contains_text(t)))
				)
				if el:
					return t
			except Exception:
				pass
	return None


def login(drv: webdriver.Chrome) -> bool:
	info(f"[info] Logging in as {COMPANY_EMAIL}...")
	drv.get(LOGIN_URL)
	
	try:
		WebDriverWait(drv, PAGE_WAIT_SEC).until(
			EC.presence_of_element_located((By.ID, "email"))
		)
		
		email_field = drv.find_element(By.ID, "email")
		email_field.clear()
		email_field.send_keys(COMPANY_EMAIL)
		
		password_field = drv.find_element(By.ID, "password")
		password_field.clear()
		password_field.send_keys(COMPANY_PASSWORD)
		
		drv.find_element(By.XPATH, "//button[@type='submit']").click()
		
		try:
			WebDriverWait(drv, PAGE_WAIT_SEC).until(
				lambda d: "my-events" in d.current_url
			)
			info("[info] Login successful - redirected to company dashboard")
			
			time.sleep(3)
			return True
		except:
			pass
		
		if LOGIN_URL in drv.current_url or "login" in drv.current_url.lower():
			error = wait_for_any_text(drv, ["Invalid", "Error", "failed"], timeout=3)
			if error:
				print(f"[fail] Login failed: {error}")
			else:
				print("[fail] Login failed - still on login page")
			return False
		
		info(f"[info] Login succeeded but redirected to: {drv.current_url}")
		return True
		
	except Exception as e:
		print(f"[fail] Login exception: {e}")
		return False


def open_create_event(drv: webdriver.Chrome) -> Tuple[str, bool]:
	clicked = False
	try:
		link = drv.find_element(By.XPATH, "//a[normalize-space(.)='Create Event']")
		link.click()
		clicked = True
		info("[info] Clicked Create Event link in navigation")
	except Exception:
		info(f"[info] Create Event nav link not found; falling back to direct GET {CREATE_EVENT_URL}")
		drv.get(CREATE_EVENT_URL)

	end = time.time() + PAGE_WAIT_SEC
	state = 'other'

	while time.time() < end:
		current = drv.current_url
		if current == LOGIN_URL or 'login' in current.lower():
			state = 'login'
			break
		try:
			el = drv.find_element(By.ID, 'title')
			if el:
				state = 'form'
				break
		except Exception:
			pass
		try:
			if drv.find_element(By.XPATH, "//*[contains(., 'Access Restricted')]"):
				state = 'access-restricted'
				break
		except Exception:
			pass
		try:
			if drv.find_element(By.XPATH, "//*[contains(., 'Checking organization approval')]"):
				state = 'approval-loading'
		except Exception:
			pass
		time.sleep(0.3)

	if state == 'form':
		info('[info] Create Event form loaded successfully')
		return state, True
	elif state == 'login':
		print('[fail] Redirected to login when accessing create-event (session lost or auth failed)')
		return state, False
	elif state == 'access-restricted':
		print('[warn] Access Restricted page encountered - company role or approval missing')
		return state, False
	elif state == 'approval-loading':
		print('[warn] Still checking organization approval - timed out before form rendered')
		return state, False
	else:
		try:
			body_text = drv.find_element(By.TAG_NAME, 'body').text[:400]
			print(f"[warn] Unknown create-event page state. Snippet: {body_text}")
		except Exception:
			print('[warn] Unknown create-event page state and unable to read body text')
		return state, False


def fill_event_form(
	drv: webdriver.Chrome,
	*,
	title: str,
	description: str,
	date: str,
	location: str,
	category: str,
	max_capacity: str,
	image_url: str,
	tags: List[str],
	preserve_required: bool = True,
) -> None:
	def set_val(field_id: str, value: str) -> None:
		el = drv.find_element(By.ID, field_id)
		if field_id == "date":
			if value:
				drv.execute_script("arguments[0].scrollIntoView({block: 'center'});", el)
				el.click()
				drv.execute_script(
					"""
					const el = arguments[0];
					el.removeAttribute('min');
					el.value = arguments[1];
					el.dispatchEvent(new Event('input', { bubbles: true }));
					el.dispatchEvent(new Event('change', { bubbles: true }));
					""",
					el,
					value,
				)
				for _ in range(2):
					if el.get_attribute("value") == value:
						break
					time.sleep(0.1)
					drv.execute_script("arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('input', { bubbles: true }));", el, value)
				if el.get_attribute("value") != value:
					try:
						el.send_keys(Keys.CONTROL, 'a')
						el.send_keys(Keys.BACK_SPACE)
						el.send_keys(value)
						el.send_keys(Keys.TAB)
						time.sleep(0.1)
					except Exception:
						pass
				final_val = el.get_attribute("value")
				info(f"[info] Date set to: {final_val}")
			else:
				if not preserve_required:
					drv.execute_script("arguments[0].removeAttribute('required');", el)
			return

		el.clear()
		if value:
			el.send_keys(value)
		else:
			if not preserve_required:
				drv.execute_script("arguments[0].removeAttribute('required');", el)
	
	set_val("title", title)
	set_val("description", description)
	if date:
		_set_date = date
		if 'T' not in _set_date or len(_set_date) < 16:
			_set_date = format_future_datetime()
		try:
			parsed = datetime.strptime(_set_date, "%Y-%m-%dT%H:%M")
			if parsed <= datetime.now():
				_set_date = format_future_datetime()
		except Exception:
			_set_date = format_future_datetime()
		set_val("date", _set_date)
	else:
		set_val("date", "")
	set_val("location", location)
	set_val("capacity", max_capacity)
	set_val("image", image_url)
	
	if category:
		try:
			category_trigger = drv.find_element(By.XPATH, "//button[contains(@class, 'select') or @role='combobox']")
			category_trigger.click()
			time.sleep(0.5)
			
			category_option = drv.find_element(By.XPATH, f"//*[@role='option' and contains(., '{category}')]")
			category_option.click()
			time.sleep(0.3)
		except Exception as e:
			info(f"[warn] Could not select category: {e}")
	
	for tag in tags:
		try:
			tag_input = drv.find_element(By.XPATH, "//input[@placeholder='Add a tag']")
			tag_input.clear()
			tag_input.send_keys(tag)
			
			try:
				add_btn = drv.find_element(By.XPATH, "//button[contains(., 'Add')]")
				add_btn.click()
			except:
				tag_input.send_keys("\n")
			
			time.sleep(0.3)
		except Exception as e:
			info(f"[warn] Could not add tag '{tag}': {e}")


def click_submit(drv: webdriver.Chrome) -> Tuple[bool, Optional[str]]:

	submit_btn = drv.find_element(By.XPATH, "//button[@type='submit' and not(contains(., 'Cancel'))]")
	submit_btn.click()
	time.sleep(0.3)
	blocked = False
	message = None
	try:
		
		invalid = drv.find_elements(By.CSS_SELECTOR, ":invalid")
		for el in invalid:
			vm = drv.execute_script("return arguments[0].validationMessage;", el)
			if vm:
				blocked = True
				message = vm
				break
	except Exception:
		pass
	return blocked, message


def run_validation_case(
	drv: webdriver.Chrome,
	name: str,
	*,
	title: str,
	description: str,
	date: str,
	location: str,
	category: str,
	max_capacity: str,
	image_url: str,
	tags: List[str],
    expected_toast: Union[str, List[str]],
) -> Tuple[str, bool, str]:
	try:
		expected_list = (
			[expected_toast] if isinstance(expected_toast, str) else list(expected_toast)
		)
		state, ready = open_create_event(drv)
		if not ready:
			return (name, False, f'Page state "{state}" not ready for form')
		fill_event_form(
			drv,
			title=title,
			description=description,
			date=date,
			location=location,
			category=category,
			max_capacity=max_capacity,
			image_url=image_url,
			tags=tags,
			preserve_required=True,
		)
		blocked, msg = click_submit(drv)
		if blocked:
			# Native browser validation prevented submission
			msg_lower = (msg or '').lower()
			ok = any(s.lower() in msg_lower for s in expected_list)
			return (name, ok, f"HTML5 validationMessage='{msg}'")
		# If not blocked, still try to see expected text (some custom feedback)
		match = wait_for_any_text(drv, expected_list, timeout=TOAST_WAIT_SEC)
		if match:
			return (name, True, f"Saw expected text: {match}")
		return (name, False, f"No native block; missing expected text from {expected_list}")
	except Exception as e:
		return (name, False, f"Exception: {e}")


def run_validation_suite(drv: webdriver.Chrome) -> Tuple[int, int, List[Tuple[str, bool, str]]]:
	results: List[Tuple[str, bool, str]] = []


	future_date = format_future_datetime(7 * 24 * 60)

	results.append(
		run_validation_case(
			drv,
			"empty title",
			title="",
			description="Test description",
			date=future_date,
			location="Test Location",
			category="Technology",
			max_capacity="50",
			image_url="",
			tags=[],
			expected_toast="Please fill out this field",  
		)
	)
	

	results.append(
		run_validation_case(
			drv,
			"empty description",
			title="Test Event",
			description="",
			date=future_date,
			location="Test Location",
			category="Technology",
			max_capacity="50",
			image_url="",
			tags=[],
			expected_toast="Please fill out this field",
		)
	)
	
	results.append(
		run_validation_case(
			drv,
			"empty date",
			title="Test Event",
			description="Test description",
			date="",
			location="Test Location",
			category="Technology",
			max_capacity="50",
			image_url="",
			tags=[],
			expected_toast="Please fill out this field",
		)
	)
	
	results.append(
		run_validation_case(
			drv,
			"empty location",
			title="Test Event",
			description="Test description",
			date=future_date,
			location="",
			category="Technology",
			max_capacity="50",
			image_url="",
			tags=[],
			expected_toast="Please fill out this field",
		)
	)
	
	results.append(
		run_validation_case(
			drv,
			"invalid capacity (0)",
			title="Test Event",
			description="Test description",
			date=future_date,
			location="Test Location",
			category="Technology",
			max_capacity="0",
			image_url="",
			tags=[],
			expected_toast=[
				"greater than or equal to 1",
				"Please fill out this field",
				"Please enter a number",
			],
		)
	)
	
	passed = sum(1 for _, ok, _ in results if ok)
	failures = len(results) - passed
	return passed, failures, results


def run_success_scenario(drv: webdriver.Chrome) -> int:
	"""Attempt to create a valid event."""
	info("[info] Running success event creation scenario...")
	
	timestamp = int(time.time())
	future_date = format_future_datetime(7 * 24 * 60)
	
	try:
		state, ready = open_create_event(drv)
		if not ready:
			print(f"[fail] Cannot run success scenario - page state: {state}")
			return 1
		info("[info] Create Event page loaded (state=form)")
		
		fill_event_form(
			drv,
			title=f"Test Event {timestamp}",
			description="This is a test event created by automated testing",
			date=future_date,
			location="Hall building",
			category="Technology",
			max_capacity="100",
			image_url="https://example.com/event.jpg",
			tags=["test", "automation"],
			preserve_required=True,
		)
		
		info("[info] Form filled, submitting...")
		blocked, msg = click_submit(drv)
		if blocked:
			print(f"[fail] Form blocked by browser validation unexpectedly: {msg}")
			return 1
		
		success_match = wait_for_any_text(
			drv,
			["submitted for approval", "Event Created", "submitted for admin approval", "Success"],
			timeout=TOAST_WAIT_SEC
		)
		
		if success_match:
			print(f"[PASS] Event submitted for approval: {success_match}")
			return 0
		
		try:
			WebDriverWait(drv, 6).until(lambda d: "my-events" in d.current_url)
			print("[PASS] Event submitted - redirected to My Events")
			return 0
		except:
			pass
		
		error_match = wait_for_any_text(
			drv,
			["Error", "Failed", "failed"],
			timeout=3
		)
		
		if error_match:
			print(f"[fail] Event creation failed: {error_match}")
			return 1
		
		print("[fail] No success or error message detected")
		return 1
		
	except Exception as e:
		print(f"[fail] Exception during event creation: {e}")
		return 1


def main() -> int:
	info(f"[info] Base URL: {BASE_URL}")
	info(f"[info] Create Event URL: {CREATE_EVENT_URL}")
	info(f"[info] Company Email: {COMPANY_EMAIL}")
	
	drv = build_driver()
	
	try:
		if not login(drv):
			print("[fail] Could not login as company user")
			return 1
		
		info("[info] Login complete. Waiting for session to be saved...")
		time.sleep(3)
		
		current = drv.current_url
		info(f"[info] Current URL after login wait: {current}")
		
		info("[info] Running create event validation suite...")
		passed, failed, results = run_validation_suite(drv)
		
		for name, ok, msg in results:
			status = "PASS" if ok else "FAIL"
			print(f" - [{status}] {name}: {msg}")
		
		print(f"[summary] validation: {passed} passed, {failed} failed")
		
		overall_failures = failed
		
		
		if os.getenv("RUN_SUCCESS", "0") == "1":
			res = run_success_scenario(drv)
			overall_failures += 1 if res != 0 else 0
		
		return 0 if overall_failures == 0 else 1
		
	finally:
		try:
			drv.quit()
		except Exception:
			pass


if __name__ == "__main__":
	sys.exit(main())
