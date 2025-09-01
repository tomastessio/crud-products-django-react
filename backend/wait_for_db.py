import os, socket, time, sys

host = os.getenv('DB_HOST', 'db')
port = int(os.getenv('DB_PORT', '3306'))
timeout = int(os.getenv('DB_WAIT_TIMEOUT', '120'))  # seconds
interval = float(os.getenv('DB_WAIT_INTERVAL', '2'))  # seconds

print(f"[wait_for_db] Waiting for {host}:{port} up to {timeout}s ...", flush=True)
start = time.time()
while True:
    try:
        with socket.create_connection((host, port), 2):
            print("[wait_for_db] DB is reachable.", flush=True)
            sys.exit(0)
    except OSError:
        if time.time() - start > timeout:
            print("[wait_for_db] Gave up waiting.", flush=True)
            sys.exit(1)
        time.sleep(interval)
