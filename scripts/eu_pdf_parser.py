#!/usr/bin/env python3
"""
EU Regulations PDF to Markdown Converter
Pure Python script to convert EU regulation PDF documents to clean Markdown
"""

import re
import requests
from datetime import datetime
from pathlib import Path

try:
    import PyPDF2
    HAS_PYPDF2 = True
except ImportError:
    HAS_PYPDF2 = False

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False


class EUPDFToMarkdown:
    """Convert EU Regulation PDFs to clean Markdown"""
    
    def __init__(self):
        self.regulations = {
            'AI_ACT': {
                'name': 'EU AI Act (Regulation 2024/1689)',
                'pdf_url': 'https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32024R1689',
                'filename': 'EU_AI_Act_2024.md'
            },
            'DORA': {
                'name': 'DORA - Digital Operational Resilience Act (Regulation 2022/2554)',
                'pdf_url': 'https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32022R2554',
                'filename': 'EU_DORA_2022.md'
            },
            'CRA': {
                'name': 'Cyber Resilience Act (Regulation 2024/2847)',
                'pdf_url': 'https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32024R2847',
                'filename': 'EU_CRA_2024.md'
            }
        }
    
    def download_pdf(self, url, filename):
        """Download PDF from EUR-Lex"""
        print(f"Downloading PDF from: {url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=60)
            response.raise_for_status()
            
            with open(filename, 'wb') as f:
                f.write(response.content)
            
            print(f"✓ PDF downloaded: {filename}")
            print(f"  File size: {len(response.content) / 1024:.1f} KB")
            return True
            
        except requests.RequestException as e:
            print(f"❌ Error downloading PDF: {e}")
            return False
    
    def extract_text_pdfplumber(self, pdf_path):
        """Extract text using pdfplumber (preferred method)"""
        try:
            text_content = []
            with pdfplumber.open(pdf_path) as pdf:
                print(f"Processing PDF with {len(pdf.pages)} pages...")
                
                for page_num, page in enumerate(pdf.pages, 1):
                    if page_num % 10 == 0:
                        print(f"  Processing page {page_num}/{len(pdf.pages)}...")
                    
                    text = page.extract_text()
                    if text:
                        text_content.append(text)
                
            return '\n\n'.join(text_content)
            
        except Exception as e:
            print(f"❌ Error extracting text with pdfplumber: {e}")
            return None
    
    def extract_text_pypdf2(self, pdf_path):
        """Extract text using PyPDF2 (fallback method)"""
        try:
            text_content = []
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                print(f"Processing PDF with {len(pdf_reader.pages)} pages...")
                
                for page_num, page in enumerate(pdf_reader.pages, 1):
                    if page_num % 10 == 0:
                        print(f"  Processing page {page_num}/{len(pdf_reader.pages)}...")
                    
                    text = page.extract_text()
                    if text:
                        text_content.append(text)
                
            return '\n\n'.join(text_content)
            
        except Exception as e:
            print(f"❌ Error extracting text with PyPDF2: {e}")
            return None
    
    def extract_pdf_text(self, pdf_path):
        """Extract text from PDF using available libraries"""
        if HAS_PDFPLUMBER:
            print("Using pdfplumber for text extraction...")
            text = self.extract_text_pdfplumber(pdf_path)
            if text:
                return text
        
        if HAS_PYPDF2:
            print("Falling back to PyPDF2 for text extraction...")
            text = self.extract_text_pypdf2(pdf_path)
            if text:
                return text
        
        print("❌ No PDF extraction libraries available")
        return None
    
    def clean_text(self, text):
        """Clean and normalize extracted text"""
        if not text:
            return ""
        
        # Fix common PDF extraction issues
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)  # Multiple newlines
        text = re.sub(r'([.!?])\s*\n([a-z])', r'\1 \2', text)  # Broken sentences
        text = re.sub(r'(\w)-\s*\n(\w)', r'\1\2', text)  # Hyphenated words across lines
        
        # Clean special characters
        text = text.replace('\xa0', ' ')  # Non-breaking space
        text = text.replace('\u2019', "'")  # Right single quote
        text = text.replace('\u201c', '"')  # Left double quote
        text = text.replace('\u201d', '"')  # Right double quote
        text = text.replace('\u2013', '-')  # En dash
        text = text.replace('\u2014', '--')  # Em dash
        
        return text.strip()
    
    def pdf_to_markdown(self, pdf_text, regulation_name, source_url):
        """Convert extracted PDF text to structured Markdown"""
        
        generation_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Add metadata headers
        markdown = f"<!-- METADATA: Title: {regulation_name} -->\n"
        markdown += f"<!-- METADATA: Source URL: {source_url} -->\n"
        markdown += f"<!-- METADATA: Generated: {generation_time} -->\n"
        markdown += f"<!-- METADATA: Parser: eu_pdf_parser.py -->\n"
        markdown += f"<!-- METADATA: Type: EU Regulation -->\n"
        
        # Extract regulation number and date for metadata
        reg_number_match = re.search(r'(\d{4}/\d{4})', pdf_text)
        if reg_number_match:
            markdown += f"<!-- METADATA: Regulation Number: {reg_number_match.group(1)} -->\n"
        
        date_match = re.search(r'(\d{1,2}\.\d{1,2}\.\d{4})', pdf_text)
        if date_match:
            markdown += f"<!-- METADATA: Official Date: {date_match.group(1)} -->\n"
        
        markdown += "\n"
        
        # Start document content
        markdown += f"# {regulation_name}\n\n"
        markdown += f"*Generated on: {generation_time}*\n\n"
        markdown += "---\n\n"
        
        # Process the PDF text to add structure
        structured_text = self.add_structure_to_text(pdf_text)
        markdown += structured_text
        
        return markdown
    
    def add_structure_to_text(self, text):
        """Add markdown structure to PDF text"""
        
        # Clean the text first
        text = self.clean_text(text)
        
        # Add structure based on EU regulation patterns
        
        # Main regulation title (make it a header)
        text = re.sub(
            r'REGULATION \(EU\) (\d{4}/\d+) OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL',
            r'\n## REGULATION (EU) \1 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL\n',
            text,
            flags=re.IGNORECASE
        )
        
        # Whereas section
        text = re.sub(r'\bWhereas:\s*\n', '\n## Whereas Clauses\n\n', text, flags=re.IGNORECASE)
        
        # Numbered whereas clauses - look for patterns like (1), (2), etc.
        text = re.sub(r'\n\s*\((\d+)\)', r'\n\n### (\1)\n\n', text)
        
        # HAVE ADOPTED section
        text = re.sub(r'\bHAVE ADOPTED THIS REGULATION:\s*\n', '\n## Regulation Content\n\n', text, flags=re.IGNORECASE)
        
        # Chapters with title on next line - capture both the chapter number and the title
        text = re.sub(
            r'\n\s*CHAPTER\s+([IVXLC]+)\s*\n+([A-Z][A-Z\s]+?)(?=\n)',
            r'\n\n# CHAPTER \1: \2',
            text,
            flags=re.IGNORECASE
        )
        
        # Titles with title text on next line
        text = re.sub(
            r'\n\s*TITLE\s+([IVXLC]+)\s*\n+([A-Z][A-Z\s]+?)(?=\n)',
            r'\n\n# TITLE \1: \2',
            text,
            flags=re.IGNORECASE
        )
        
        # Articles with subject on next line - capture both article number and subject
        text = re.sub(
            r'\n\s*Article\s+(\d+)\s*\n+([A-Za-z][^\n]+?)(?=\n)',
            r'\n\n## Article \1: \2',
            text,
            flags=re.IGNORECASE
        )
        
        # Sections with title
        text = re.sub(
            r'\n\s*SECTION\s+(\d+)\s*\n+([A-Z][A-Z\s]+?)(?=\n)',
            r'\n\n### SECTION \1: \2',
            text,
            flags=re.IGNORECASE
        )
        
        # Numbered points within articles (1., 2., etc.)
        text = re.sub(r'\n\s*(\d+)\.\s+', r'\n\n**\1.** ', text)
        
        # Lettered points (a), (b), etc.
        text = re.sub(r'\n\s*\(([a-z])\)\s+', r'\n- (\1) ', text)
        
        # Annexes with title
        text = re.sub(
            r'\n\s*ANNEX\s+([IVXLC]+)\s*\n+([A-Z][A-Z\s]+?)(?=\n)',
            r'\n\n## ANNEX \1: \2',
            text,
            flags=re.IGNORECASE
        )
        
        # Clean up extra whitespace
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)  # Max 2 newlines
        
        return text
    
    def create_javascript_module(self, content, reg_key, reg_info):
        """Create JavaScript module for RAG integration"""
        
        # Extract metadata from content
        metadata = {}
        lines = content.split('\n')
        
        for line in lines:
            if line.startswith('<!-- METADATA:') and line.endswith('-->'):
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
        
        # Map regulation keys to window global names
        window_var_map = {
            'AI_ACT': 'euRegulationAiActData',
            'DORA': 'euRegulationDoraData',
            'CRA': 'euRegulationCraData'
        }
        
        window_var = window_var_map.get(reg_key, f'euRegulation{reg_key.title()}Data')
        
        # Create JavaScript module filename
        js_filename = f"eu-regulation-{reg_key.lower().replace('_', '-')}.js"
        
        # Escape content for JavaScript string
        escaped_content = clean_content.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
        
        js_content = f'''/**
 * {reg_info['name']}
 * Generated by eu_pdf_parser.py
 * For RAG integration in hacka.re
 */

window.{window_var} = {{
    id: '{reg_key.lower().replace('_', '_')}',
    name: `{reg_info['name']}`,
    metadata: {{
        title: `{metadata.get('Title', reg_info['name'])}`,
        sourceUrl: `{metadata.get('Source URL', reg_info['pdf_url'])}`,
        generated: `{metadata.get('Generated', 'Unknown')}`,
        regulationNumber: `{metadata.get('Regulation Number', 'Unknown')}`,
        officialDate: `{metadata.get('Official Date', 'Unknown')}`,
        type: `{metadata.get('Type', 'EU Regulation')}`,
        parser: `{metadata.get('Parser', 'eu_pdf_parser.py')}`
    }},
    content: `{escaped_content}`
}};'''
        
        try:
            with open(js_filename, 'w', encoding='utf-8') as f:
                f.write(js_content)
            print(f"✓ Created JavaScript module: {js_filename}")
            
            # Print file size
            size = len(js_content.encode('utf-8'))
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
    
    def save_markdown(self, content, filename):
        """Save markdown content to file"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Saved to: {filename}")
            
            # Print file size
            size = len(content.encode('utf-8'))
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
        
        # Download PDF
        pdf_filename = f"{reg_key.lower()}_temp.pdf"
        if not self.download_pdf(reg['pdf_url'], pdf_filename):
            return False
        
        try:
            # Extract text from PDF
            print("Extracting text from PDF...")
            pdf_text = self.extract_pdf_text(pdf_filename)
            if not pdf_text:
                return False
            
            print(f"✓ Extracted {len(pdf_text)} characters from PDF")
            
            # Convert to Markdown
            print("Converting to structured Markdown...")
            markdown = self.pdf_to_markdown(pdf_text, reg['name'], reg['pdf_url'])
            
            # Save markdown file
            markdown_success = self.save_markdown(markdown, reg['filename'])
            
            # Create JavaScript module for RAG integration
            print("Creating JavaScript module for RAG integration...")
            js_success, js_filename = self.create_javascript_module(markdown, reg_key, reg)
            
            if js_success:
                reg['js_filename'] = js_filename
            
            return markdown_success and js_success
            
        finally:
            # Clean up temporary PDF file
            try:
                Path(pdf_filename).unlink()
                print(f"✓ Cleaned up temporary file: {pdf_filename}")
            except:
                pass
    
    def process_all(self):
        """Process all regulations"""
        print("\n" + "="*60)
        print("EU REGULATIONS PDF TO MARKDOWN CONVERTER")
        print("="*60)
        print("\nThis script will download and convert the following regulations:")
        
        for key, reg in self.regulations.items():
            print(f"  • {reg['name']}")
        
        # Check dependencies
        print(f"\nDependencies:")
        print(f"  • pdfplumber: {'✓ Available' if HAS_PDFPLUMBER else '❌ Not installed'}")
        print(f"  • PyPDF2: {'✓ Available' if HAS_PYPDF2 else '❌ Not installed'}")
        
        if not HAS_PDFPLUMBER and not HAS_PYPDF2:
            print("\n❌ No PDF processing libraries found!")
            print("Install with: pip install pdfplumber PyPDF2")
            return
        
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
                if 'js_filename' in reg:
                    print(f"  → {reg['js_filename']}")
        
        print("\n" + "="*60)
        print("Conversion complete!")


def main():
    """Main entry point"""
    converter = EUPDFToMarkdown()
    
    # Check if required libraries are installed
    if not HAS_PDFPLUMBER and not HAS_PYPDF2:
        print("❌ PDF processing libraries not found.")
        print("Please install with: pip install pdfplumber PyPDF2")
        return
    
    converter.process_all()


if __name__ == "__main__":
    main()