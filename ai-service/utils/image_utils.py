import cv2
import numpy as np
import os

def load_image(file_path):
    img = cv2.imread(file_path)
    if img is None:
        raise ValueError(f"Could not load image at {file_path}")
    return img

def save_image(img, file_path):
    cv2.imwrite(file_path, img)

def crop_bounding_box(img, bbox, margin_pct=0.15):
    """
    Crops region defined by bbox [x1, y1, x2, y2] from img with configurable padding.
    Ensures bbox coordinates are within image bounds and width/height are positive.
    """
    h, w = img.shape[:2]
    x1, y1, x2, y2 = [int(v) for v in bbox]

    # Basic validation
    if x2 <= x1 or y2 <= y1:
        raise ValueError(f"Invalid bbox coordinates: {bbox}")

    # Add margin (percentage of box size)
    mw = int((x2 - x1) * margin_pct)
    mh = int((y2 - y1) * margin_pct)

    nx1 = max(0, x1 - mw)
    ny1 = max(0, y1 - mh)
    nx2 = min(w, x2 + mw)
    ny2 = min(h, y2 + mh)

    # Ensure final coords are valid
    nx2 = max(nx1 + 1, nx2)
    ny2 = max(ny1 + 1, ny2)

    cropped = img[ny1:ny2, nx1:nx2]
    ch, cw = cropped.shape[:2]

    print(f"[CROP] Original image dimensions: {w}x{h}")
    print(f"[CROP] BBox: [{x1}, {y1}, {x2}, {y2}]")
    print(f"[CROP] Padded bbox: [{nx1}, {ny1}, {nx2}, {ny2}]")
    print(f"[CROP] Crop dimensions: {cw}x{ch}")

    return cropped

def draw_bounding_boxes(img, detections):
    """
    Draws colorful bounding boxes and labels on img for visualization.
    """
    annotated = img.copy()
    colors = [
        (255, 107, 107), (78, 205, 196), (255, 230, 109),
        (26, 83, 92), (247, 255, 247), (255, 166, 158)
    ]

    for idx, det in enumerate(detections):
        bbox = [int(v) for v in det["bbox"]]
        label = f"{det["class_name"]} ({det["confidence"]:.2f})"
        color = colors[idx % len(colors)]

        # Draw rectangle
        cv2.rectangle(annotated, (bbox[0], bbox[1]), (bbox[2], bbox[3]), color, 3)

        # Draw label background box
        (tw, th), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        cv2.rectangle(
            annotated,
            (bbox[0], max(0, bbox[1] - th - 10)),
            (bbox[0] + tw + 10, bbox[1]),
            color,
            -1
        )
        # Draw label text
        cv2.putText(
            annotated,
            label,
            (bbox[0] + 5, max(th + 5, bbox[1] - 5)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 0, 0),
            2,
            cv2.LINE_AA
        )

    return annotated
