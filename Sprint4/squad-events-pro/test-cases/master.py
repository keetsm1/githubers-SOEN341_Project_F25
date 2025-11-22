import subprocess
import sys
import os

scripts = [
    "student-sign-up.py",
    "company-sign-up.py",
    "company-make-events.py",
    "admin-approve-events.py",
    "database-operations.py",
]

results = []

for script in scripts:
    print(f"[RUN] {script}")
    proc = subprocess.run([sys.executable, script], cwd=os.path.dirname(__file__))
    results.append((script, proc.returncode))

print("\n[SUMMARY]")
for script, code in results:
    status = "PASS" if code == 0 else f"FAIL (exit {code})"
    print(f" - {script}: {status}")

if any(code != 0 for _, code in results):
    sys.exit(1)
else:
    sys.exit(0)
