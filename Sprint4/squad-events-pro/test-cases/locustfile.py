from locust import HttpUser, task, between
import os


class FrontendUser(HttpUser):
    """Basic load test user for the Campus Events frontend.

    This user hits a few key pages to simulate simple browsing behavior.
    """

    wait_time = between(1, 3)

    def on_start(self):
        # APP_BASE_URL is already used by your Selenium tests; reuse it here if set.
        base = os.getenv("APP_BASE_URL", "http://localhost:5173").rstrip("/")
        self.base_url = base

    @task(3)
    def visit_home(self):
        self.client.get("/")

    @task(2)
    def visit_student_signup(self):
        self.client.get("/StudentSignUp")

    @task(2)
    def visit_org_signup(self):
        self.client.get("/OrgSignUp")

    @task(1)
    def visit_login(self):
        self.client.get("/login")
