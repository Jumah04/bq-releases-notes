from flask import Flask, render_template, jsonify
import urllib.request
import xml.etree.ElementTree as ET
import os

app = Flask(__name__)

# Route to serve the main HTML page
@app.route('/')
def index():
    return render_template('index.html')

# API route to fetch and return release notes feed
@app.route('/api/releases')
def get_releases():
    try:
        url = 'https://docs.cloud.google.com/feeds/bigquery-release-notes.xml'
        # Set a user-agent to ensure we don't get blocked
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry_el in root.findall('atom:entry', ns):
            title_el = entry_el.find('atom:title', ns)
            updated_el = entry_el.find('atom:updated', ns)
            link_el = entry_el.find('atom:link[@rel="alternate"]', ns)
            content_el = entry_el.find('atom:content', ns)
            id_el = entry_el.find('atom:id', ns)
            
            entry_title = title_el.text if title_el is not None else ''
            entry_updated = updated_el.text if updated_el is not None else ''
            entry_link = link_el.attrib['href'] if link_el is not None else ''
            entry_content = content_el.text if content_el is not None else ''
            entry_id = id_el.text if id_el is not None else ''
            
            entries.append({
                'id': entry_id,
                'date': entry_title,
                'updated': entry_updated,
                'link': entry_link,
                'content': entry_content
            })
            
        return jsonify({
            'success': True,
            'entries': entries
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Start the server on port 5000
    app.run(debug=True, port=5000)
