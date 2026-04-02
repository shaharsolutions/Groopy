import fitz # PyMuPDF
import os

pdf_path = "/Users/shahar/Desktop/שחר פתרונות דיגיטליים/Groopy/products order interface/תצוגה מקדימה במצב לא מקוון.pdf"
output_dir = "/Users/shahar/Desktop/שחר פתרונות דיגיטליים/Groopy/groopy-catalog/public/images"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

doc = fitz.open(pdf_path)
image_count = 0

for i in range(len(doc)):
    page = doc.load_page(i)
    image_list = page.get_images(full=True)
    
    for img_index, img in enumerate(image_list):
        xref = img[0]
        base_image = doc.extract_image(xref)
        image_bytes = base_image["image"]
        image_ext = base_image["ext"]
        
        # Filtering for larger images to capture products mainly
        if len(image_bytes) > 5000: # 5KB filter to avoid small icons
            filename = f"product_{image_count}.{image_ext}"
            file_path = os.path.join(output_dir, filename)
            
            with open(file_path, "wb") as f:
                f.write(image_bytes)
            
            print(f"Saved: {filename}")
            image_count += 1

print(f"Extraction complete. Total images: {image_count}")
