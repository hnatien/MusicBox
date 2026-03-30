#!/usr/bin/env python3
"""Convert Netscape cookie file to cookie string for YOUTUBE_COOKIE environment variable."""

import sys
from pathlib import Path

def convert_netscape_to_string(cookie_file_path):
    """Extract cookie name=value pairs from Netscape format file."""
    cookies = []
    
    with open(cookie_file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            # Skip empty lines and comments
            if not line or line.startswith('#'):
                continue
            
            # Netscape format: domain flag path secure expiration name value
            parts = line.split('\t')
            if len(parts) >= 7:
                name = parts[5]
                value = parts[6]
                cookies.append(f"{name}={value}")
    
    return '; '.join(cookies)

def main():
    cookie_file = Path(__file__).parent.parent / 'secrets' / 'youtube-cookies.txt'
    
    if not cookie_file.exists():
        print(f"Error: Cookie file not found at {cookie_file}", file=sys.stderr)
        sys.exit(1)
    
    cookie_string = convert_netscape_to_string(cookie_file)
    
    # Output to console
    print("Copy this value to Railway YOUTUBE_COOKIE variable:")
    print("=" * 80)
    print(cookie_string)
    print("=" * 80)
    
    # Also save to a temp file for easy copying
    output_file = cookie_file.parent / '.cookie-string.txt'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(cookie_string)
    
    print(f"\nAlso saved to: {output_file}")

if __name__ == '__main__':
    main()
