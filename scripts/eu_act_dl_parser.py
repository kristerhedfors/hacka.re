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
        
        markdown = f"# {regulation_name}\n\n"
        markdown += f"*Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n"
        markdown += "---\n\n"
        
        # Remove scripts and styles
        html_content = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        html_content = re.sub(r'<style[^>]*>.*?</style>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        
        # Extract the complete document text content first
        # Find the main document body - EUR-Lex puts content in specific div containers
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
        
        # Extract regulation header information
        # Look for regulation number pattern like "2024/1689"
        reg_number_match = re.search(r'(\d{4}/\d{4})', main_content)
        if reg_number_match:
            markdown += f"**Regulation Number:** {reg_number_match.group(1)}\n\n"
        
        # Extract date pattern like "12.7.2024"
        date_match = re.search(r'(\d{1,2}\.\d{1,2}\.\d{4})', main_content)
        if date_match:
            markdown += f"**Date:** {date_match.group(1)}\n\n"
        
        # Extract the full regulation title
        title_patterns = [
            r'REGULATION \(EU\) \d{4}/\d{4} OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL[^<]*?of [^<]*?\d{4}[^<]*?laying down[^<]*?(?=\(Text with EEA relevance\)|THE EUROPEAN PARLIAMENT)',
            r'laying down harmonised rules on artificial intelligence[^<]*?(?=\(Text with EEA relevance\)|THE EUROPEAN PARLIAMENT)'
        ]
        
        for pattern in title_patterns:
            title_match = re.search(pattern, main_content, re.DOTALL | re.IGNORECASE)
            if title_match:
                clean_title = self.clean_text(self.strip_tags(title_match.group(0)))
                markdown += f"**Title:** {clean_title}\n\n"
                break
        
        markdown += "---\n\n"
        
        # Extract "Having regard to" section
        having_regard_match = re.search(r'Having regard to[^<]*?(?=Whereas:)', main_content, re.DOTALL | re.IGNORECASE)
        if having_regard_match:
            markdown += "## Preamble\n\n"
            clean_preamble = self.clean_text(self.strip_tags(having_regard_match.group(0)))
            markdown += f"{clean_preamble}\n\n---\n\n"
        
        # Extract "Whereas" clauses - these are the numbered recitals
        whereas_section = re.search(r'Whereas:\s*(.*?)(?=HAVE ADOPTED|Article\s+1)', main_content, re.DOTALL | re.IGNORECASE)
        if whereas_section:
            markdown += "## Whereas Clauses\n\n"
            whereas_content = whereas_section.group(1)
            
            # Extract numbered whereas clauses like "(1)" "(2)" etc.
            whereas_clauses = re.findall(r'\((\d+)\)\s*(.*?)(?=\(\d+\)|$)', whereas_content, re.DOTALL)
            
            for number, content in whereas_clauses:
                clean_content = self.clean_text(self.strip_tags(content))
                if clean_content:
                    markdown += f"**({number})** {clean_content}\n\n"
            
            markdown += "---\n\n"
        
        # Extract "HAVE ADOPTED" section
        have_adopted_match = re.search(r'HAVE ADOPTED THIS REGULATION:[^<]*?(?=CHAPTER|Article\s+1)', main_content, re.DOTALL | re.IGNORECASE)
        if have_adopted_match:
            clean_adoption = self.clean_text(self.strip_tags(have_adopted_match.group(0)))
            markdown += f"## Adoption\n\n{clean_adoption}\n\n---\n\n"
        
        # Extract chapters and articles
        markdown += "## Content\n\n"
        
        # Find all structural elements in order
        # Look for CHAPTER, TITLE, Article patterns
        structure_pattern = r'(CHAPTER\s+[IVXLC]+[^<]*?|TITLE\s+[IVXLC]+[^<]*?|Article\s+(\d+)[^<]*?)'
        
        # Split content by articles to process sequentially
        article_splits = re.split(r'(Article\s+\d+)', main_content, flags=re.IGNORECASE)
        
        current_section = ""
        
        for i, section in enumerate(article_splits):
            if re.match(r'Article\s+\d+', section, re.IGNORECASE):
                # This is an article header
                article_match = re.match(r'Article\s+(\d+)', section, re.IGNORECASE)
                if article_match:
                    article_num = article_match.group(1)
                    markdown += f"### Article {article_num}\n\n"
            elif section.strip() and i > 0:  # Article content
                # Clean and process the article content
                clean_content = self.clean_text(self.strip_tags(section))
                
                if clean_content:
                    # Split into paragraphs and format
                    paragraphs = [p.strip() for p in clean_content.split('\n') if p.strip()]
                    
                    for para in paragraphs:
                        # Check for numbered points
                        if re.match(r'^\d+\.', para):
                            markdown += f"{para}\n\n"
                        elif re.match(r'^\([a-z]\)', para):
                            markdown += f"   {para}\n\n"
                        elif len(para) > 10:  # Skip very short fragments
                            markdown += f"{para}\n\n"
                
                markdown += "---\n\n"
        
        # Extract annexes if present
        annex_match = re.search(r'(ANNEX.*?)$', main_content, re.DOTALL | re.IGNORECASE)
        if annex_match:
            markdown += "## Annexes\n\n"
            clean_annex = self.clean_text(self.strip_tags(annex_match.group(1)))
            markdown += f"{clean_annex}\n\n"
        
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