from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import requests
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import time

load_dotenv()

app = Flask(__name__)
CORS(app)

ip_cooldown = defaultdict(dict)
COOLDOWN_SECONDS = 600
MAX_REQUESTS_PER_COOLDOWN = 1
last_ping = {}

def get_required_env(var_name: str) -> str:
    """Get required environment variable or raise ValueError."""
    value = os.getenv(var_name)
    if not value:
        raise ValueError(f"Missing required environment variable: {var_name}")
    return value

DISCORD_WEBHOOK_URL = get_required_env('DISCORD_WEBHOOK_URL')
PING_USER_ID = os.getenv('PING_USER_ID', '')

def check_rate_limit(ip: str) -> Optional[str]:
    """Check if IP is rate limited, returns error message if limited."""
    now = time.time()
    
    if 'count' not in ip_cooldown[ip] or now - ip_cooldown[ip]['start'] > COOLDOWN_SECONDS:
        ip_cooldown[ip] = {'count': 0, 'start': now}
    
    ip_cooldown[ip]['count'] += 1
    
    if ip_cooldown[ip]['count'] > MAX_REQUESTS_PER_COOLDOWN:
        remaining = int(COOLDOWN_SECONDS - (now - ip_cooldown[ip]['start']))
        return f"Too many requests. Please wait {remaining} seconds before submitting again."
    return None

@app.route('/submit-form', methods=['POST'])
def submit_form():
    try:
        ip: Optional[str] = request.headers.get('X-Forwarded-For', request.remote_addr)
        
        if ip is None:
            ip = "unknown"
        elif isinstance(ip, str) and ',' in ip:
            ip = ip.split(',')[0].strip()
        
        if (rate_limit_msg := check_rate_limit(ip)):
            return jsonify({'success': False, 'error': rate_limit_msg}), 429
        
        data: Dict[str, Any] = request.get_json()
        
        if not data or not all(key in data for key in ['name', 'email', 'message']):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        if not all(isinstance(data[key], str) and data[key].strip() for key in ['name', 'email', 'message']):
            return jsonify({'success': False, 'error': 'Invalid field values'}), 400

        mention_text = f"<@{PING_USER_ID}> " if PING_USER_ID else ""

        discord_payload = {
            "content": "New contact form submission!",
            "embeds": [
                {
                    "title": "Contact Form Submission",
                    "color": 5814783,
                    "fields": [
                        {
                            "name": "Name", 
                            "value": data['name'], 
                            "inline": True
                        },
                        {
                            "name": "Email", 
                            "value": data['email'], 
                            "inline": True
                        },
                        {
                            "name": "IP Address", 
                            "value": ip, 
                            "inline": True
                        },
                        {
                            "name": "Message", 
                            "value": data['message'][:1000] 
                        }
                    ],
                    "footer": {
                        "text": f"Submitted at {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}"
                    }
                }
            ]
        }

        response = requests.post(
            DISCORD_WEBHOOK_URL,
            json=discord_payload,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )

        if response.status_code not in [200, 204]:
            return jsonify({
                'success': False,
                'error': f'Failed to send message to Discord'
            }), 500

        return jsonify({'success': True})
    
    except Exception as e:
        app.logger.error(f"Error processing form: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An error occurred while processing your submission'
        }), 500

@app.route("/ping", methods=["POST"])
def ping():
    data = request.get_json(force=True)
    pc_name = data.get("pc", "unknown")
    last_ping[pc_name] = time.time()
    return jsonify({"status": "ok", "pc": pc_name, "last_ping": last_ping[pc_name]})

@app.route("/status/<pc_name>", methods=["GET"])
def status(pc_name):
    now = time.time()
    last = last_ping.get(pc_name, 0)
    online = (now - last) < 60
    return jsonify({"pc": pc_name, "online": online})

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)