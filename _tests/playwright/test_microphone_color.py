"""
Test microphone button color and appearance
"""
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_microphone_button_is_gray(page: Page, serve_hacka_re):
    """Test that microphone button appears gray initially"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Wait for potential microphone button
    page.wait_for_timeout(500)
    
    # Check if microphone button exists and get its color
    mic_color = page.evaluate("""
        () => {
            const mic = document.querySelector('.microphone-btn-inside');
            if (!mic) return 'not-found';
            const style = window.getComputedStyle(mic);
            return style.color;
        }
    """)
    
    # Check opacity
    mic_opacity = page.evaluate("""
        () => {
            const mic = document.querySelector('.microphone-btn-inside');
            if (!mic) return 'not-found';
            const style = window.getComputedStyle(mic);
            return style.opacity;
        }
    """)
    
    screenshot_with_markdown(page, "microphone_color", {
        "Test": "Microphone button color check",
        "Color": mic_color,
        "Opacity": mic_opacity,
        "Expected Color": "#9ca3af (gray)",
        "Expected Opacity": "0.8"
    })
    
    # Verify it's gray (rgb(156, 163, 175) is #9ca3af)
    if mic_color != 'not-found':
        assert 'rgb(156, 163, 175)' in mic_color, f"Microphone should be gray (#9ca3af), got {mic_color}"
        assert float(mic_opacity) == 0.8, f"Microphone opacity should be 0.8, got {mic_opacity}"
        print(f"✓ Microphone button is gray: {mic_color} with opacity {mic_opacity}")