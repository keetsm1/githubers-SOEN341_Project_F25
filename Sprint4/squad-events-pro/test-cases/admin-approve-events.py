import os
import sys
import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173")
HEADLESS = os.getenv("HEADLESS", "1")
QUIET = os.getenv("QUIET", "1")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin1")

def build_driver():
    chrome_options = Options()
    if HEADLESS == "1":
        chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    if QUIET == "1":
        chrome_options.add_experimental_option("excludeSwitches", ["enable-logging"])
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=chrome_options)

def login(driver):
    driver.get(APP_BASE_URL)
    time.sleep(1)
    
    email_field = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
    )
    password_field = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
    
    email_field.clear()
    email_field.send_keys(ADMIN_EMAIL)
    password_field.clear()
    password_field.send_keys(ADMIN_PASSWORD)
    
    login_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Login') or contains(text(), 'Sign In')]")
    login_button.click()
    
    time.sleep(2)

def navigate_to_approve_events(driver):
    time.sleep(1)
    
    try:
        approve_link = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, '/admin/approve-events')]"))
        )
        approve_link.click()
    except:
        driver.get(f"{APP_BASE_URL}/admin/approve-events")
    
    time.sleep(2)

def get_pending_events(driver):
    try:
        event_cards = driver.find_elements(By.CSS_SELECTOR, "[class*='Card'], .event-card, [data-testid='event-card']")
        pending_events = []
        
        for card in event_cards:
            try:
                badge = card.find_element(By.XPATH, ".//span[contains(text(), 'Pending') or contains(text(), 'pending')]")
                if badge:
                    title_elem = card.find_element(By.CSS_SELECTOR, "h3, [class*='title']")
                    title = title_elem.text.strip()
                    
                    approve_btn = card.find_element(By.XPATH, ".//button[contains(text(), 'Approve') or @aria-label='Approve']")
                    reject_btn = card.find_element(By.XPATH, ".//button[contains(text(), 'Reject') or @aria-label='Reject']")
                    
                    pending_events.append({
                        'title': title,
                        'approve_btn': approve_btn,
                        'reject_btn': reject_btn,
                        'card': card
                    })
            except:
                continue
        
        return pending_events
    except Exception as e:
        print(f"Error finding pending events: {e}")
        return []

def test_approve_event(driver):
    navigate_to_approve_events(driver)
    pending = get_pending_events(driver)
    
    if not pending:
        return True
    
    event = pending[0]
    event['approve_btn'].click()
    time.sleep(2)
    
    try:
        success_toast = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'approved') or contains(text(), 'Approved') or contains(text(), 'Success')]"))
        )
        return True
    except:
        return False

def test_reject_event(driver):
    navigate_to_approve_events(driver)
    pending = get_pending_events(driver)
    
    if not pending:
        return True
    
    event = pending[0]
    event['reject_btn'].click()
    time.sleep(2)
    
    try:
        success_toast = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'rejected') or contains(text(), 'Rejected') or contains(text(), 'Success')]"))
        )
        return True
    except:
        return False

def test_view_event_details(driver):
    navigate_to_approve_events(driver)
    pending = get_pending_events(driver)
    
    if not pending:
        return True
    
    event = pending[0]
    event_title = event['title']
    
    try:
        title_elem = event['card'].find_element(By.CSS_SELECTOR, "h3, [class*='title']")
        title_elem.click()
        time.sleep(2)
        
        page_title = driver.find_element(By.TAG_NAME, "h1").text
        if event_title.lower() in page_title.lower() or page_title.lower() in event_title.lower():
            driver.back()
            time.sleep(1)
            return True
        else:
            return False
    except:
        return False

def run_all_tests():
    driver = build_driver()
    results = []
    
    try:
        login(driver)
        
        results.append(("View event details", test_view_event_details(driver)))
        results.append(("Approve event", test_approve_event(driver)))
        results.append(("Reject event", test_reject_event(driver)))
        
        passed = sum(1 for _, result in results if result)
        failed = len(results) - passed
        
        print(f"\n{'='*60}")
        print("ADMIN EVENT APPROVAL - TEST SUMMARY")
        print(f"{'='*60}")
        
        for test_name, result in results:
            if not result:
                print(f"✗ FAIL: {test_name}")
        
        if failed == 0:
            print("✓ All tests passed")
        
        print(f"\nTotal: {len(results)} | Passed: {passed} | Failed: {failed}")
        print(f"{'='*60}\n")
        
        return failed == 0
        
    except Exception as e:
        print(f"\n[ERROR] Test suite failed: {e}")
        return False
    finally:
        driver.quit()

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
