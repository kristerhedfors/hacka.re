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
    
    def html_to_markdown(self, html_content, regulation_name):
        """Convert EUR-Lex HTML to structured Markdown"""
        
        # Parse the HTML using a simple approach
        # EUR-Lex has a predictable structure we can exploit
        
        markdown = f"# {regulation_name}\n\n"
        markdown += f"*Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n"
        markdown += "---\n\n"
        
        # Remove scripts and styles
        html_content = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        html_content = re.sub(r'<style[^>]*>.*?</style>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        
        # Extract title if present
        title_match = re.search(r'<title[^>]*>(.*?)</title>', html_content, re.IGNORECASE | re.DOTALL)
        if title_match:
            markdown += f"## Document Title\n\n{self.clean_text(title_match.group(1))}\n\n---\n\n"
        
        # Process the main content
        # EUR-Lex typically uses specific patterns for articles, recitals, etc.
        
        # Extract recitals (whereas clauses)
        recitals = re.findall(r'<p[^>]*class="[^"]*recital[^"]*"[^>]*>(.*?)</p>', 
                             html_content, re.IGNORECASE | re.DOTALL)
        if recitals:
            markdown += "## RECITALS\n\n"
            for i, recital in enumerate(recitals, 1):
                clean_recital = self.clean_text(self.strip_tags(recital))
                if clean_recital:
                    markdown += f"**({i})** {clean_recital}\n\n"
            markdown += "---\n\n"
        
        # Extract chapters
        chapters = re.findall(r'<p[^>]*class="[^"]*title-chapter[^"]*"[^>]*>(.*?)</p>|CHAPTER\s+[IVXLC]+[^<]*', 
                             html_content, re.IGNORECASE | re.DOTALL)
        
        # Extract articles - this is the main content
        markdown += "## ARTICLES\n\n"
        
        # Pattern for articles in EUR-Lex
        article_pattern = r'Article\s+(\d+)[^<]*</[^>]+>(.*?)(?=Article\s+\d+|</body>|$)'
        articles = re.findall(article_pattern, html_content, re.IGNORECASE | re.DOTALL)
        
        if not articles:
            # Try alternative pattern
            article_pattern = r'<p[^>]*class="[^"]*article[^"]*"[^>]*>Article\s+(\d+)(.*?)</p>(.*?)(?=<p[^>]*class="[^"]*article|$)'
            articles = re.findall(article_pattern, html_content, re.IGNORECASE | re.DOTALL)
        
        if articles:
            for article in articles:
                if len(article) >= 2:
                    article_num = article[0]
                    article_content = article[1] if len(article) == 2 else article[1] + article[2]
                    
                    markdown += f"### Article {article_num}\n\n"
                    
                    # Clean the article content
                    clean_content = self.strip_tags(article_content)
                    clean_content = self.clean_text(clean_content)
                    
                    # Process paragraphs within articles
                    paragraphs = clean_content.split('\n')
                    for para in paragraphs:
                        para = para.strip()
                        if para:
                            # Check if it's a numbered point
                            if re.match(r'^\d+\.', para):
                                markdown += f"\n{para}\n"
                            elif re.match(r'^\([a-z]\)', para):
                                markdown += f"   {para}\n"
                            else:
                                markdown += f"{para}\n\n"
                    
                    markdown += "\n---\n\n"
        else:
            # Fallback: extract all paragraph content
            print("⚠️  Could not find articles with standard pattern, using fallback extraction...")
            
            # Extract all paragraphs
            paragraphs = re.findall(r'<p[^>]*>(.*?)</p>', html_content, re.IGNORECASE | re.DOTALL)
            
            for para in paragraphs:
                clean_para = self.clean_text(self.strip_tags(para))
                if clean_para and len(clean_para) > 20:  # Skip very short paragraphs
                    # Detect structure
                    if clean_para.startswith('CHAPTER'):
                        markdown += f"\n## {clean_para}\n\n"
                    elif clean_para.startswith('Article'):
                        markdown += f"\n### {clean_para}\n\n"
                    elif clean_para.startswith('TITLE'):
                        markdown += f"\n## {clean_para}\n\n"
                    elif re.match(r'^\d+\.', clean_para):
                        markdown += f"{clean_para}\n\n"
                    elif re.match(r'^\([a-z]\)', clean_para):
                        markdown += f"   {clean_para}\n\n"
                    else:
                        markdown += f"{clean_para}\n\n"
        
        # Extract annexes if present
        annexes = re.findall(r'ANNEX[^<]*', html_content, re.IGNORECASE)
        if annexes:
            markdown += "\n## ANNEXES\n\n"
            for annex in annexes:
                clean_annex = self.clean_text(annex)
                if clean_annex:
                    markdown += f"### {clean_annex}\n\n"
        
        return markdown
    
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
        markdown = self.html_to_markdown(html, reg['name'])
        
        # Save to file
        return self.save_markdown(markdown, reg['filename'])
    
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