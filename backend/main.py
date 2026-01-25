#!/usr/bin/env python3
"""
Main entry point for the System Kontroli Dostępu backend
"""

import sys
import os

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

if __name__ == '__main__':
    from api_server import app
    app.run(host='0.0.0.0', port=5001, debug=True, use_reloader=False)
