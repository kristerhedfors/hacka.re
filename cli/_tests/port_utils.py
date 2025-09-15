#!/usr/bin/env python3
"""
Port utilities for testing - helps avoid port conflicts
"""

import socket
import random
from typing import List

def get_random_port() -> int:
    """Get a random available port by binding to port 0"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port

def get_multiple_random_ports(count: int) -> List[int]:
    """Get multiple random available ports"""
    ports = []
    for _ in range(count):
        while True:
            port = get_random_port()
            if port not in ports:  # Ensure unique ports
                ports.append(port)
                break
    return ports

def is_port_in_use(port: int, host: str = '127.0.0.1') -> bool:
    """Check if a port is already in use"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.settimeout(0.1)
            result = s.connect_ex((host, port))
            return result == 0  # Port is in use if connection succeeds
        except:
            return False

def get_safe_test_port(preferred: int = None) -> int:
    """
    Get a safe port for testing.
    If preferred port is given and available, use it.
    Otherwise, get a random available port.
    """
    if preferred and not is_port_in_use(preferred):
        return preferred
    return get_random_port()

# Common test ports to avoid
COMMON_PORTS = [80, 443, 3000, 3001, 5000, 8000, 8080, 8081, 8888, 9000]

def get_uncommon_random_port() -> int:
    """Get a random port that's not commonly used"""
    while True:
        port = random.randint(10000, 60000)
        if port not in COMMON_PORTS and not is_port_in_use(port):
            return port