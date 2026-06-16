import time
import urllib.request
import xml.etree.ElementTree as ET
import re
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION_SECS = 600  # 10 minutes

def fetch_and_parse_feed():
    try:
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BQReleaseNotesViewer/1.0'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_content = response.read()
            
        root = ET.fromstring(xml_content)
        namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
        entries = root.findall('atom:entry', namespaces)
        
        parsed_entries = []
        for index, entry in enumerate(entries):
            title_elem = entry.find('atom:title', namespaces)
            updated_elem = entry.find('atom:updated', namespaces)
            id_elem = entry.find('atom:id', namespaces)
            content_elem = entry.find('atom:content', namespaces)
            
            date_str = title_elem.text.strip() if title_elem is not None else "Unknown Date"
            updated_str = updated_elem.text.strip() if updated_elem is not None else ""
            entry_id = id_elem.text.strip() if id_elem is not None else f"entry-{index}"
            content_html = content_elem.text.strip() if content_elem is not None else ""
            
            # Parse individual updates from the entry's HTML content
            items = []
            pattern = re.compile(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', re.DOTALL)
            sub_index = 0
            for match in pattern.finditer(content_html):
                note_type = match.group(1).strip()
                note_body = match.group(2).strip()
                
                items.append({
                    "id": f"{entry_id}-item-{sub_index}",
                    "type": note_type,
                    "body": note_body
                })
                sub_index += 1
            
            # If no <h3> was found, treat the whole content as one item of type "General"
            if not items and content_html:
                items.append({
                    "id": f"{entry_id}-item-0",
                    "type": "General",
                    "body": content_html
                })
                
            parsed_entries.append({
                "date": date_str,
                "updated": updated_str,
                "id": entry_id,
                "items": items
            })
            
        return parsed_entries, None
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or not cache["data"] or (now - cache["last_fetched"] > CACHE_DURATION_SECS):
        data, error = fetch_and_parse_feed()
        if error:
            if cache["data"]:
                return jsonify({
                    "notes": cache["data"],
                    "cached": True,
                    "warning": f"Failed to refresh feed, showing cached data. Error: {error}",
                    "last_updated": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache["last_fetched"]))
                })
            return jsonify({"error": f"Failed to fetch release notes: {error}"}), 500
        
        cache["data"] = data
        cache["last_fetched"] = now
        cache["cached"] = False
    else:
        cache["cached"] = True
        
    return jsonify({
        "notes": cache["data"],
        "cached": cache["cached"],
        "last_updated": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache["last_fetched"]))
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
