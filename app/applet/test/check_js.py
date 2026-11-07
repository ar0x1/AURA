import re
import os
import subprocess

with open("app/index.html") as f:
    html = f.read()

scripts = re.findall(r'<script\b[^>]*src=["\']([^"\']+)["\']', html)
print(f"Found {len(scripts)} scripts in index.html")

for src in scripts:
    if not src.startswith("http"):
        path = os.path.join("app", src)
        if not os.path.exists(path):
            print(f"MISSING FILE: {path}")
        else:
            res = subprocess.run(["node", "-c", path], capture_output=True, text=True)
            if res.returncode != 0:
                print(f"SYNTAX ERROR in {path}:\n{res.stderr}")
            else:
                print(f"OK: {path}")
