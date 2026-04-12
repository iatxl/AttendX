import random

def get_face_encoding(image_file):
    """
    Mock: Returns a random 128-d encoding.
    """
    return [random.random() for _ in range(128)]

def compare_faces(known_encoding, image_file, tolerance=0.6):
    """
    Mock: Returns a successful match with high confidence.
    """
    return {
        "match": True,
        "confidence": 98.5,
        "distance": 0.4
    }

def check_liveness(image_files):
    """
    Mock: Returns live status.
    """
    return {"is_live": True, "score": 0.95}
