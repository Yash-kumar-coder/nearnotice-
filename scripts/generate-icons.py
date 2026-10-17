import os
from PIL import Image, ImageOps

def create_square_icon(src_img, size, padding_ratio=0.08, bg_color=(255, 255, 255, 0)):
    """Fit image into a square of `size` x `size` preserving aspect ratio."""
    # Target available size after padding
    available_size = int(size * (1 - 2 * padding_ratio))
    
    # Scale source image
    src_copy = src_img.copy()
    src_copy.thumbnail((available_size, available_size), Image.Resampling.LANCZOS)
    
    # Create target square canvas
    canvas = Image.new("RGBA", (size, size), bg_color)
    
    # Paste centered
    paste_x = (size - src_copy.width) // 2
    paste_y = (size - src_copy.height) // 2
    canvas.paste(src_copy, (paste_x, paste_y), mask=src_copy if src_copy.mode == 'RGBA' else None)
    
    return canvas

def main():
    logo_path = os.path.join("public", "logo.png")
    if not os.path.exists(logo_path):
        print(f"Error: {logo_path} not found")
        return

    logo = Image.open(logo_path).convert("RGBA")
    
    # Crop transparent borders to maximize resolution
    bbox = logo.getbbox()
    if bbox:
        logo_cropped = logo.crop(bbox)
    else:
        logo_cropped = logo

    # 1. Standard PWA Icons (transparent background, 10% padding)
    icon_192 = create_square_icon(logo_cropped, 192, padding_ratio=0.08)
    icon_192.save(os.path.join("public", "icon-192.png"), "PNG")
    print("Generated public/icon-192.png")

    icon_512 = create_square_icon(logo_cropped, 512, padding_ratio=0.08)
    icon_512.save(os.path.join("public", "icon-512.png"), "PNG")
    print("Generated public/icon-512.png")

    # 2. Maskable Icons (Android requires a solid safe-zone background, centered in 80% safe zone)
    maskable_192 = create_square_icon(logo_cropped, 192, padding_ratio=0.20, bg_color=(255, 255, 255, 255))
    maskable_192.save(os.path.join("public", "icon-maskable-192.png"), "PNG")
    print("Generated public/icon-maskable-192.png")

    maskable_512 = create_square_icon(logo_cropped, 512, padding_ratio=0.20, bg_color=(255, 255, 255, 255))
    maskable_512.save(os.path.join("public", "icon-maskable-512.png"), "PNG")
    print("Generated public/icon-maskable-512.png")

    # 3. Favicon .ico (multi-size: 16, 32, 48, 64)
    ico_img = create_square_icon(logo_cropped, 64, padding_ratio=0.05)
    ico_img.save(
        os.path.join("public", "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
    )
    print("Generated public/favicon.ico")

    # 4. Standard SVG Icon (for manifest /icon.svg)
    import base64
    with open(os.path.join("public", "icon-512.png"), "rb") as f:
        b64_png = base64.b64encode(f.read()).decode("ascii")
    svg_data = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><image href="data:image/png;base64,{b64_png}" width="512" height="512" /></svg>\n'
    with open(os.path.join("public", "icon.svg"), "w", encoding="utf-8") as f:
        f.write(svg_data)
    print("Generated public/icon.svg")

if __name__ == "__main__":
    main()
