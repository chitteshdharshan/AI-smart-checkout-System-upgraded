import os
from utils.file_utils import CROPS_DIR, generate_filename
from utils.image_utils import crop_bounding_box, save_image

def crop_and_save_products(img, detections):
    """
    Crops each detected product bounding box and saves to crops/ directory.
    Attaches crop_path to each detection object.
    """
    for idx, det in enumerate(detections):
        bbox = det["bbox"]
        cropped_img = crop_bounding_box(img, bbox)

        filename = generate_filename(prefix=f"crop_{idx+1}", ext=".jpg")
        file_path = os.path.join(CROPS_DIR, filename)

        save_image(cropped_img, file_path)
        det["crop_path"] = f"/crops/{filename}"

    return detections
