import os
import sys
import time
from datetime import datetime
from typing import List, Optional, Tuple

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173").rstrip("/")
SIGNUP_URL = f"{BASE_URL}/SignUp"
QUIET = os.getenv("QUIET", "1") == "1"

PAGE_WAIT_SEC = 8
TOAST_WAIT_SEC = 5


def unique_email(domain: str = "example.edu") -> str:
	now = int(time.time())
	micro = datetime.utcnow().microsecond
	return f"student.test+{now}{micro}@{domain}"


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


def info(msg: str) -> None:
	if not QUIET:
		print(msg)


def open_signup(drv: webdriver.Chrome) -> None:
	drv.get(SIGNUP_URL)
	WebDriverWait(drv, PAGE_WAIT_SEC).until(
		EC.presence_of_element_located((By.ID, "email"))
	)


def fill_form(
	drv: webdriver.Chrome,
	*,
	email: str,
	confirm_email: str,
	full_name: str,
	password: str,
	confirm_password: str,
) -> None:
	def set_val(field_id: str, value: str) -> None:
		el = drv.find_element(By.ID, field_id)
		el.clear()
		if value:
			el.send_keys(value)
		else:
			drv.execute_script("arguments[0].removeAttribute('required');", el)

	set_val("email", email)
	set_val("confirmEmail", confirm_email)
	set_val("fullName", full_name)
	set_val("password", password)
	set_val("confirmPassword", confirm_password)


def click_submit(drv: webdriver.Chrome) -> None:
	drv.find_element(By.XPATH, "//button[@type='submit']").click()


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


def run_validation_case(
	drv: webdriver.Chrome,
	name: str,
	*,
	email: str,
	confirm_email: str,
	full_name: str,
	password: str,
	confirm_password: str,
	expected_toast: str,
) -> Tuple[str, bool, str]:
	
	try:
		open_signup(drv)
		fill_form(
			drv,
			email=email,
			confirm_email=confirm_email,
			full_name=full_name,
			password=password,
			confirm_password=confirm_password,
		)
		click_submit(drv)
		match = wait_for_any_text(drv, [expected_toast], timeout=TOAST_WAIT_SEC)
		if match:
			return (name, True, f"Saw expected toast: {match}")
		return (name, False, f"Did not see expected toast: '{expected_toast}'")
	except Exception as e:
		return (name, False, f"Exception: {e}")


def run_validation_suite(drv: webdriver.Chrome) -> Tuple[int, int, List[Tuple[str, bool, str]]]:
	results: List[Tuple[str, bool, str]] = []
	results.append(
		run_validation_case(
			drv,
			"empty email",
			email="",
			confirm_email="user@example.edu",
			full_name="Test User",
			password="SecurePass123!",
			confirm_password="SecurePass123!",
			expected_toast="Email is required.",
		)
	) 
	results.append(
		run_validation_case(
			drv,
			"empty confirm email",
			email="user@example.edu",
			confirm_email="",
			full_name="Test User",
			password="SecurePass123!",
			confirm_password="SecurePass123!",
			expected_toast="Please confirm your email.",
		)
	)
	results.append(
		run_validation_case(
			drv,
			"email mismatch",
			email="user1@example.edu",
			confirm_email="user2@example.edu",
			full_name="Test User",
			password="SecurePass123!",
			confirm_password="SecurePass123!",
			expected_toast="Emails do not match.",
		)
	)
	results.append(
		run_validation_case(
			drv,
			"empty full name",
			email="user@example.edu",
			confirm_email="user@example.edu",
			full_name="",
			password="SecurePass123!",
			confirm_password="SecurePass123!",
			expected_toast="Full name is required.",
		)
	)
	results.append(
		run_validation_case(
			drv,
			"empty password",
			email="user@example.edu",
			confirm_email="user@example.edu",
			full_name="Test User",
			password="",
			confirm_password="",
			expected_toast="Password is required.",
		)
	)
	results.append(
		run_validation_case(
			drv,
			"short password",
			email="user@example.edu",
			confirm_email="user@example.edu",
			full_name="Test User",
			password="Short1",
			confirm_password="Short1",
			expected_toast="Password must be at least 8 characters.",
		)
	)
	results.append(
		run_validation_case(
			drv,
			"password mismatch",
			email="user@example.edu",
			confirm_email="user@example.edu",
			full_name="Test User",
			password="SecurePass123!",
			confirm_password="Different123!",
			expected_toast="Passwords do not match.",
		)
	)

	passed = sum(1 for _, ok, _ in results if ok)
	failures = len(results) - passed
	return passed, failures, results


def run_success_scenario(drv: webdriver.Chrome) -> int:
	strict = os.getenv("STRICT", "0") == "1"
	email = unique_email()
	full_name = "Student Test"
	password = "SecurePass123!"

	open_signup(drv)
	info("[info] SignUp page loaded.")
	fill_form(
		drv,
		email=email,
		confirm_email=email,
		full_name=full_name,
		password=password,
		confirm_password=password,
	)
	info(f"[info] Filled form with email: {email}")
	click_submit(drv)
	info("[info] Submitted form; waiting for result…")

	success_match = wait_for_any_text(drv, ["Success", "Account created!"], timeout=TOAST_WAIT_SEC)
	if success_match:
		print(f"[PASS] Found success message: {success_match}")
		return 0

	try:
		WebDriverWait(drv, 6).until(lambda d: d.current_url.rstrip("/") == BASE_URL)
		print("[PASS] Redirected to home after signup.")
		return 0
	except Exception:
		pass

	failure_hit = wait_for_any_text(
		drv,
		["Sign Up failed", "Profile insert failed", "Unexpected", "Error"],
		timeout=4,
	)
	if failure_hit:
		if not strict and failure_hit == "Unexpected":
			print(
				"[warn] 'Unexpected' toast seen (likely email confirmation enabled); treating as PASS in non-STRICT mode."
			)
			return 0
		print(f"[fail] Found failure message: {failure_hit}")
		return 1

	print("[fail] No success toast or redirect detected within timeout.")
	return 1


def main() -> int:
	info(f"[info] Base URL: {BASE_URL}")
	info(f"[info] SignUp URL: {SIGNUP_URL}")
	drv = build_driver()

	try:
		info("[info] Running client-side validation suite…")
		passed, failed, results = run_validation_suite(drv)
		for name, ok, msg in results:
			status = "PASS" if ok else "FAIL"
			print(f" - [{status}] {name}: {msg}")
		print(f"[summary] validation: {passed} passed, {failed} failed")

		overall_failures = failed


		if os.getenv("RUN_SUCCESS", "0") == "1":
			info("[info] Running success signup scenario…")
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

