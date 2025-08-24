#!/usr/bin/env python3
"""
EU Regulations HTML to Markdown Converter
Pure Python script to convert EU regulation HTML documents to clean Markdown
"""

import re
import requests
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
import os
from datetime import datetime

class EURLexHTMLToMarkdown:
    """Convert EUR-Lex HTML documents to Markdown"""
    
    def __init__(self):
        self.regulations = {
            'AI_ACT': {
                'name': 'EU AI Act (Regulation 2024/1689)',
                'url': 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32024R1689',
                'filename': 'EU_AI_Act_2024.md'
            },
            'DORA': {
                'name': 'DORA - Digital Operational Resilience Act (Regulation 2022/2554)',
                'url': 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2554',
                'filename': 'EU_DORA_2022.md'
            },
            'CRA': {
                'name': 'Cyber Resilience Act (Regulation 2024/2847)',
                'url': 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32024R2847',
                'filename': 'EU_CRA_2024.md'
            }
        }
    
    def fetch_html(self, url):
        """Fetch HTML content from EUR-Lex"""
        print(f"Fetching HTML from: {url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            print("✓ HTML fetched successfully")
            return response.text
        except requests.RequestException as e:
            print(f"❌ Error fetching HTML: {e}")
            return None
    
    def clean_text(self, text):
        """Clean and normalize text"""
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters that might break markdown
        text = text.replace('\xa0', ' ')  # Non-breaking space
        text = text.replace('\u2019', "'")  # Right single quote
        text = text.replace('\u201c', '"')  # Left double quote
        text = text.replace('\u201d', '"')  # Right double quote
        text = text.replace('\u2013', '-')  # En dash
        text = text.replace('\u2014', '--')  # Em dash
        
        return text.strip()
    
    def html_to_markdown(self, html_content, regulation_name, source_url):
        """Convert EUR-Lex HTML to structured Markdown preserving original formatting"""
        
        # Add metadata headers
        generation_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        markdown = f"<!-- METADATA: Title: {regulation_name} -->\n"
        markdown += f"<!-- METADATA: Source URL: {source_url} -->\n"
        markdown += f"<!-- METADATA: Generated: {generation_time} -->\n"
        markdown += f"<!-- METADATA: Parser: eu_act_dl_parser.py -->\n"
        markdown += f"<!-- METADATA: Type: EU Regulation -->\n"
        
        # Extract regulation number and date first for metadata
        reg_number_match = re.search(r'(\d{4}/\d{4})', html_content)
        if reg_number_match:
            markdown += f"<!-- METADATA: Regulation Number: {reg_number_match.group(1)} -->\n"
        
        date_match = re.search(r'(\d{1,2}\.\d{1,2}\.\d{4})', html_content)
        if date_match:
            markdown += f"<!-- METADATA: Official Date: {date_match.group(1)} -->\n"
        
        markdown += "\n"
        
        # Start document content
        markdown += f"# {regulation_name}\n\n"
        markdown += f"*Generated on: {generation_time}*\n\n"
        markdown += "---\n\n"
        
        # Remove scripts and styles but preserve structure
        html_content = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        html_content = re.sub(r'<style[^>]*>.*?</style>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        
        # Extract main document content - try different container patterns
        body_patterns = [
            r'<div[^>]*id="document1"[^>]*>(.*?)</div>',
            r'<div[^>]*class="[^"]*document[^"]*"[^>]*>(.*?)</div>',
            r'<body[^>]*>(.*?)</body>'
        ]
        
        main_content = None
        for pattern in body_patterns:
            match = re.search(pattern, html_content, re.DOTALL | re.IGNORECASE)
            if match:
                main_content = match.group(1)
                break
        
        if not main_content:
            main_content = html_content
        
        # Convert HTML to structured markdown with proper formatting
        structured_content = self.html_to_structured_markdown(main_content)
        markdown += structured_content
        
        return markdown
    
    def html_to_structured_markdown(self, html_content):
        """Convert HTML to markdown while preserving structure like headers, lists, etc."""
        
        # Replace common HTML elements with markdown equivalents
        content = html_content
        
        # Convert headers (h1-h6) to markdown headers
        content = re.sub(r'<h1[^>]*>(.*?)</h1>', r'# \1', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'<h2[^>]*>(.*?)</h2>', r'## \1', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'<h3[^>]*>(.*?)</h3>', r'### \1', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'<h4[^>]*>(.*?)</h4>', r'#### \1', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'<h5[^>]*>(.*?)</h5>', r'##### \1', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'<h6[^>]*>(.*?)</h6>', r'###### \1', content, flags=re.DOTALL | re.IGNORECASE)
        
        # Convert paragraph breaks - add proper spacing
        content = re.sub(r'<p[^>]*>', '\n\n', content, flags=re.IGNORECASE)
        content = re.sub(r'</p>', '\n\n', content, flags=re.IGNORECASE)
        
        # Convert line breaks
        content = re.sub(r'<br[^>]*/?>', '\n', content, flags=re.IGNORECASE)
        
        # Convert div tags to line breaks
        content = re.sub(r'<div[^>]*>', '\n', content, flags=re.IGNORECASE)
        content = re.sub(r'</div>', '\n', content, flags=re.IGNORECASE)
        
        # Convert strong/bold text
        content = re.sub(r'<strong[^>]*>(.*?)</strong>', r'**\1**', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'<b[^>]*>(.*?)</b>', r'**\1**', content, flags=re.DOTALL | re.IGNORECASE)
        
        # Convert emphasis/italic text
        content = re.sub(r'<em[^>]*>(.*?)</em>', r'*\1*', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'<i[^>]*>(.*?)</i>', r'*\1*', content, flags=re.DOTALL | re.IGNORECASE)
        
        # Convert unordered lists
        content = re.sub(r'<ul[^>]*>', '\n', content, flags=re.IGNORECASE)
        content = re.sub(r'</ul>', '\n', content, flags=re.IGNORECASE)
        content = re.sub(r'<li[^>]*>(.*?)</li>', r'- \1', content, flags=re.DOTALL | re.IGNORECASE)
        
        # Convert ordered lists
        content = re.sub(r'<ol[^>]*>', '\n', content, flags=re.IGNORECASE)
        content = re.sub(r'</ol>', '\n', content, flags=re.IGNORECASE)
        
        # Handle numbered list items - this is trickier, let's use a callback
        def convert_ol_items(match):
            items = re.findall(r'<li[^>]*>(.*?)</li>', match.group(0), flags=re.DOTALL | re.IGNORECASE)
            result = ""
            for i, item in enumerate(items, 1):
                clean_item = self.strip_tags(item).strip()
                if clean_item:
                    result += f"{i}. {clean_item}\n"
            return result
        
        # Convert blockquotes
        content = re.sub(r'<blockquote[^>]*>(.*?)</blockquote>', r'> \1', content, flags=re.DOTALL | re.IGNORECASE)
        
        # Handle div elements that might represent sections
        content = re.sub(r'<div[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)</div>', r'\n## \1\n', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'<div[^>]*class="[^"]*subtitle[^"]*"[^>]*>(.*?)</div>', r'\n### \1\n', content, flags=re.DOTALL | re.IGNORECASE)
        
        # Identify Article patterns and convert to headers with proper spacing
        content = re.sub(r'Article\s+(\d+)', r'\n\n## Article \1\n\n', content, flags=re.IGNORECASE)
        content = re.sub(r'CHAPTER\s+([IVXLC]+)', r'\n\n# CHAPTER \1\n\n', content, flags=re.IGNORECASE)
        content = re.sub(r'TITLE\s+([IVXLC]+)', r'\n\n# TITLE \1\n\n', content, flags=re.IGNORECASE)
        
        # Handle numbered clauses like "(1)" "(2)" etc. - make them subheaders with spacing
        content = re.sub(r'\((\d+)\)', r'\n\n### (\1)\n\n', content)
        
        # Handle lettered clauses like "(a)" "(b)" etc. - make them list items  
        content = re.sub(r'\(([a-z])\)', r'\n\n- (\1)', content)
        
        # Fix common EU document patterns
        content = re.sub(r'REGULATION\s+\(EU\)\s+(\d{4}/\d+)', r'\n\n## REGULATION (EU) \1\n\n', content, flags=re.IGNORECASE)
        content = re.sub(r'Whereas:', r'\n\n## Whereas Clauses\n\n', content, flags=re.IGNORECASE)
        
        # Remove remaining HTML tags
        content = self.strip_tags(content)
        
        # Clean up text
        content = self.clean_text(content)
        
        # Fix multiple newlines and spacing
        content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content)  # Max 2 newlines
        content = re.sub(r'^\s+', '', content, flags=re.MULTILINE)  # Remove leading spaces
        
        # Force line breaks before key patterns that should be on new lines
        content = re.sub(r'(\S)\s*(##\s)', r'\1\n\n\2', content)  # Add line break before ##
        content = re.sub(r'(\S)\s*(###\s)', r'\1\n\n\2', content)  # Add line break before ###
        content = re.sub(r'(\S)\s*(#\s)', r'\1\n\n\2', content)  # Add line break before #
        
        return content
    
    def strip_tags(self, html):
        """Remove HTML tags from text"""
        # Remove HTML comments
        html = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)
        # Remove tags
        clean = re.sub(r'<[^>]+>', '', html)
        return clean
    
    def save_markdown(self, content, filename):
        """Save markdown content to file"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Saved to: {filename}")
            
            # Print file size
            size = os.path.getsize(filename)
            if size < 1024:
                print(f"  File size: {size} bytes")
            elif size < 1024*1024:
                print(f"  File size: {size/1024:.1f} KB")
            else:
                print(f"  File size: {size/(1024*1024):.1f} MB")
            
            return True
        except Exception as e:
            print(f"❌ Error saving file: {e}")
            return False
    
    def create_javascript_module(self, content, reg_key, reg_info):
        """Create JavaScript module for RAG integration"""
        
        # Extract metadata from content
        metadata = {}
        lines = content.split('\n')
        
        for line in lines:
            if line.startswith('<!-- METADATA:') and line.endswith('-->'):
                # Parse metadata line
                metadata_content = line.replace('<!-- METADATA:', '').replace('-->', '').strip()
                if ':' in metadata_content:
                    key, value = metadata_content.split(':', 1)
                    metadata[key.strip()] = value.strip()
        
        # Get content without metadata
        content_lines = []
        for line in lines:
            if not (line.startswith('<!-- METADATA:') and line.endswith('-->')):
                content_lines.append(line)
        
        clean_content = '\n'.join(content_lines).strip()
        
        # Create JavaScript module
        js_filename = f"eu-regulation-{reg_key.lower().replace('_', '-')}.js"
        
        # Escape content for JavaScript string
        escaped_content = clean_content.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
        
        # Map regulation keys to window global names
        window_var_map = {
            'AI_ACT': 'euRegulationAiActData',
            'DORA': 'euRegulationDoraData', 
            'CRA': 'euRegulationCraData'
        }
        
        window_var = window_var_map.get(reg_key, f'euRegulation{reg_key.title()}Data')
        
        js_content = f'''/**
 * {reg_info['name']}
 * Generated by eu_act_dl_parser.py
 * For RAG integration in hacka.re
 */

window.{window_var} = {{
    id: '{reg_key.lower().replace('_', '_')}',
    name: `{reg_info['name']}`,
    metadata: {{
        title: `{metadata.get('Title', reg_info['name'])}`,
        sourceUrl: `{metadata.get('Source URL', reg_info['url'])}`,
        generated: `{metadata.get('Generated', 'Unknown')}`,
        regulationNumber: `{metadata.get('Regulation Number', 'Unknown')}`,
        officialDate: `{metadata.get('Official Date', 'Unknown')}`,
        type: `{metadata.get('Type', 'EU Regulation')}`,
        parser: `{metadata.get('Parser', 'eu_act_dl_parser.py')}`
    }},
    content: `{escaped_content}`
}};
'''
        
        try:
            with open(js_filename, 'w', encoding='utf-8') as f:
                f.write(js_content)
            print(f"✓ Created JavaScript module: {js_filename}")
            
            # Print file size
            size = os.path.getsize(js_filename)
            if size < 1024:
                print(f"  File size: {size} bytes")
            elif size < 1024*1024:
                print(f"  File size: {size/1024:.1f} KB")
            else:
                print(f"  File size: {size/(1024*1024):.1f} MB")
            
            return True, js_filename
        except Exception as e:
            print(f"❌ Error creating JavaScript module: {e}")
            return False, None
    
    def process_regulation(self, reg_key):
        """Process a single regulation"""
        reg = self.regulations[reg_key]
        print(f"\n{'='*60}")
        print(f"Processing: {reg['name']}")
        print(f"{'='*60}")
        
        # Fetch HTML
        html = self.fetch_html(reg['url'])
        if not html:
            return False
        
        # Convert to Markdown
        print("Converting to Markdown...")
        markdown = self.html_to_markdown(html, reg['name'], reg['url'])
        
        # Save markdown file
        markdown_success = self.save_markdown(markdown, reg['filename'])
        
        # Create JavaScript module for RAG integration
        print("Creating JavaScript module for RAG integration...")
        js_success, js_filename = self.create_javascript_module(markdown, reg_key, reg)
        
        if js_success:
            # Store JS filename for later reference
            reg['js_filename'] = js_filename
        
        return markdown_success and js_success
    
    def process_all(self):
        """Process all regulations"""
        print("\n" + "="*60)
        print("EU REGULATIONS HTML TO MARKDOWN CONVERTER")
        print("="*60)
        print("\nThis script will download and convert the following regulations:")
        
        for key, reg in self.regulations.items():
            print(f"  • {reg['name']}")
        
        print("\n" + "="*60)
        
        results = {}
        for key in self.regulations:
            results[key] = self.process_regulation(key)
        
        # Summary
        print("\n" + "="*60)
        print("CONVERSION SUMMARY")
        print("="*60)
        
        for key, reg in self.regulations.items():
            status = "✓ Success" if results.get(key) else "❌ Failed"
            print(f"{reg['name']}: {status}")
            if results.get(key):
                print(f"  → {reg['filename']}")
        
        print("\n" + "="*60)
        print("Conversion complete!")
        
        # Create index file
        self.create_index_file(results)
    
    def create_index_file(self, results):
        """Create an index markdown file with links to all regulations"""
        index_content = "# EU Regulations - Markdown Versions\n\n"
        index_content += f"*Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n"
        index_content += "## Available Regulations\n\n"
        
        for key, reg in self.regulations.items():
            if results.get(key):
                index_content += f"- [{reg['name']}](./{reg['filename']})\n"
                index_content += f"  - Source: {reg['url']}\n\n"
        
        index_content += "\n## Notes\n\n"
        index_content += "- These documents were automatically converted from EUR-Lex HTML format\n"
        index_content += "- For official reference, always consult the original EUR-Lex documents\n"
        index_content += "- Conversion may have minor formatting inconsistencies\n"
        
        self.save_markdown(index_content, "INDEX.md")
        print("\n✓ Created INDEX.md with links to all converted regulations")

def main():
    """Main entry point"""
    converter = EURLexHTMLToMarkdown()
    
    # Check if requests library is installed
    try:
        import requests
    except ImportError:
        print("❌ 'requests' library not found.")
        print("Please install it using: pip install requests")
        return
    
    converter.process_all()

if __name__ == "__main__":
    main()