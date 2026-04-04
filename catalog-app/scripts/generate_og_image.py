import os
from PIL import Image

def generate_og_image():
    # Paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    logo_path = os.path.join(project_root, 'public', 'logo.png')
    output_path = os.path.join(project_root, 'public', 'og-image.png')

    if not os.path.exists(logo_path):
        print(f"Error: Logo not found at {logo_path}")
        return

    # Load logo
    logo = Image.open(logo_path).convert("RGBA")
    
    # Create white canvas (1024x1024 is recommended for social sharing)
    size = (1024, 1024)
    canvas = Image.new("RGBA", size, (255, 255, 255, 255))
    
    # Calculate logo size with padding
    # We want the logo to take up about 70% of the width or height, whichever is more restrictive
    max_dim = int(size[0] * 0.7)
    
    logo_w, logo_h = logo.size
    ratio = min(max_dim / logo_w, max_dim / logo_h)
    new_size = (int(logo_w * ratio), int(logo_h * ratio))
    
    logo_resized = logo.resize(new_size, Image.Resampling.LANCZOS)
    
    # Center the logo
    offset = (
        (size[0] - new_size[0]) // 2,
        (size[1] - new_size[1]) // 2
    )
    
    # Paste logo onto canvas
    canvas.paste(logo_resized, offset, logo_resized)
    
    # Save as PNG (to maintain quality) or JPEG
    # WhatsApp handles PNG well
    canvas.convert("RGB").save(output_path, "PNG")
    print(f"Success: OG image created at {output_path}")

if __name__ == "__main__":
    generate_og_image()
