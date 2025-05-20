import pytest
from playwright.sync_api import expect

def test_swe_transcript_page_loads(page):
    """Test that the SWE Transcript page loads correctly."""
    # Navigate to the SWE Transcript page
    page.goto("about/swe-transcript.html")
    
    # Check that the page title is correct
    expect(page).to_have_title("hacka.re - SWE Transcript")
    
    # Check that the main heading is present
    heading = page.locator("h2:has-text('Software Engineering Transcript')")
    expect(heading).to_be_visible()
    
    # Check that the page contains the overview section
    overview_heading = page.locator("h3:has-text('Overview')")
    expect(overview_heading).to_be_visible()
    
    # Check that the page contains the featured transcripts section
    transcripts_heading = page.locator("h3:has-text('Featured Transcripts')")
    expect(transcripts_heading).to_be_visible()
    
    # Check that the page contains the benefits section
    benefits_heading = page.locator("h3:has-text('Benefits of AI-Assisted Software Engineering')")
    expect(benefits_heading).to_be_visible()
    
    # Check that the navigation links are present
    nav_links = page.locator(".page-nav a")
    expect(nav_links).to_have_count(6)  # About, Architecture, Development, Research Report, SWE Transcript, Disclaimer
    
    # Check that the SWE Transcript link is present in the navigation
    swe_transcript_link = page.locator(".page-nav a:has-text('SWE Transcript')")
    expect(swe_transcript_link).to_be_visible()

def test_swe_transcript_navigation(page):
    """Test that the navigation links on the SWE Transcript page work correctly."""
    # Navigate to the SWE Transcript page
    page.goto("about/swe-transcript.html")
    
    # Click on the About link and check that it navigates to the About page
    page.click(".page-nav a:has-text('About')")
    expect(page).to_have_url("about/index.html")
    
    # Navigate back to the SWE Transcript page
    page.goto("about/swe-transcript.html")
    
    # Click on the Architecture link and check that it navigates to the Architecture page
    page.click(".page-nav a:has-text('Architecture')")
    expect(page).to_have_url("about/architecture.html")
    
    # Navigate back to the SWE Transcript page
    page.goto("about/swe-transcript.html")
    
    # Click on the Development link and check that it navigates to the Development page
    page.click(".page-nav a:has-text('Development')")
    expect(page).to_have_url("about/development.html")
    
    # Navigate back to the SWE Transcript page
    page.goto("about/swe-transcript.html")
    
    # Click on the Research Report link and check that it navigates to the Research Report page
    page.click(".page-nav a:has-text('Research Report')")
    expect(page).to_have_url("about/research-report.html")
    
    # Navigate back to the SWE Transcript page
    page.goto("about/swe-transcript.html")
    
    # Click on the Disclaimer link and check that it navigates to the Disclaimer page
    page.click(".page-nav a:has-text('Disclaimer')")
    expect(page).to_have_url("about/disclaimer.html")

def test_swe_transcript_content_structure(page):
    """Test that the SWE Transcript page has the expected content structure."""
    # Navigate to the SWE Transcript page
    page.goto("about/swe-transcript.html")
    
    # Check that the page contains the important notice
    notice = page.locator(".important-notice")
    expect(notice).to_be_visible()
    expect(notice).to_contain_text("These transcripts showcase the capabilities of AI-assisted software engineering")
    
    # Check that the page contains the "Coming Soon" transcript card
    coming_soon = page.locator(".transcript-card h4:has-text('Coming Soon')")
    expect(coming_soon).to_be_visible()
    
    # Check that the benefits section contains a list of benefits
    benefits_list = page.locator("h3:has-text('Benefits of AI-Assisted Software Engineering') + p + ul li")
    expect(benefits_list).to_have_count.greater_than(0)
    
    # Check that the footer is present
    footer = page.locator("footer")
    expect(footer).to_be_visible()
    expect(footer).to_contain_text("hacka.re")
