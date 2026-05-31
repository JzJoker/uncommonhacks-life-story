import cv2
import numpy as np
import requests
import os
import torch
import torch.nn.functional as F
from PIL import Image
from transformers import AutoImageProcessor, AutoModel

ESP32_URL        = "http://192.168.1.184:81/jpeg"
DATASET_FOLDER = "memory record player/image_dataset"
output_folder = "memory record player/match_results"

MAX_KEYPOINTS    = 3000   # more = slower but more accurate
MATCH_THRESHOLD  = 0.80  # Lowe's ratio test — lower = stricter (0.6–0.8 typical)
GOOD_MATCH_MIN   = 20     # minimum RANSAC inliers to consider a positive match
RANSAC_THRESHOLD = 5.0    # max pixel reprojection error for RANSAC inlier (lower = stricter)
TOP_DINO_MATCHES   = 3     # number of top DINO matches to consider for final decision
DINO_MATCH_MIN   = 0.40    # minimum DINO similarity required to accept final match

DINO_MODEL_NAME = "facebook/dinov2-base"

device = "cuda" if torch.cuda.is_available() else "cpu" #uses RTX5060 cuda cores, if not available use CPU
dino_processor = AutoImageProcessor.from_pretrained(DINO_MODEL_NAME) 
dino_model = AutoModel.from_pretrained(DINO_MODEL_NAME).to(device) #automodel automa
dino_model.eval() #set model to evaluation mode (disables dropout, etc.) since we're only doing inference

#dinov3 splits the image into patches and processes them through a vision transformer
#output is a fixed lenght embedding vector that assigns values to each patch


def get_dino_embedding(image_bgr):
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB) #converts BGR to RGB format for DINOv3
    pil_image = Image.fromarray(image_rgb) #converts numpy array to PILLOW image

    inputs = dino_processor(images=pil_image, return_tensors="pt").to(device) #preprocesses image and converts to PyTorch tensor, moves to GPU if available

    with torch.no_grad():
        outputs = dino_model(**inputs) #runs image through DINOv3 to get output embeddings, 

    if hasattr(outputs, "pooler_output") and outputs.pooler_output is not None: #some models have an extra pooling layer that processes the CLS token output, if available use that
        embedding = outputs.pooler_output #set embedding to pooling layer output
    else:
        embedding = outputs.last_hidden_state[:, 0, :] # : takes all images, 0 takes the first token (CLS token), : takes all features  
        #since we're only feeding 1 image at a time, our first argument is also just 0 (first image)
    embedding = F.normalize(embedding, p=2, dim=1) #normalizes embedding to unit length so it can compare cosine similarities

    return embedding

def get_dino_similarity(embedding1, embedding2):
    similarity = torch.matmul(embedding1, embedding2.T).item() #dot products both embeddings and returns single float
    return similarity 

def get_image_from_esp32(): 
    response = requests.get(ESP32_URL)
    image_array = np.frombuffer(response.content, np.uint8) #converts raw array of bytes from ESP into numpy array
    physical_image = cv2.imdecode(image_array, cv2.IMREAD_COLOR) #decodes image into BGR format 
    return physical_image

def get_digital_image(image_path):
    digital_image = cv2.imread(image_path, cv2.IMREAD_COLOR)
    return digital_image

# Create output folder if it doesn't exist
os.makedirs(output_folder, exist_ok=True)

# Clear old match result images before each run
for old_file in os.listdir(output_folder):
    if old_file.startswith("matches_") or old_file.startswith("kp_"):
        os.remove(os.path.join(output_folder, old_file))

# Fetch ESP32 image once before the loop
physical_image = get_image_from_esp32()
physical_image = cv2.flip(physical_image, 1)  # 1 = horizontal flip, 0 = vertical, -1 = both

im1_gray = cv2.cvtColor(physical_image, cv2.COLOR_BGR2GRAY) #grayscale

# DINOv3 embedding for ESP32 image
esp32_dino_embedding = get_dino_embedding(physical_image)

orb     = cv2.ORB_create(nfeatures=MAX_KEYPOINTS)
matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False) #finds hamming distance between descriptors

# Save ESP32 keypoints once
keypoints1, descriptors1 = orb.detectAndCompute(im1_gray, None)
im1_display = cv2.drawKeypoints(im1_gray, keypoints1, None, color=(255,0,0), flags=cv2.DRAW_MATCHES_FLAGS_DEFAULT) #draws keypoints
cv2.imwrite("esp32imagekp.jpg", im1_display)

results = []
dino_candidates = []

# First loop: use DINO to score every image in the dataset
for filename in os.listdir(DATASET_FOLDER):
    if not filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        continue

    path = os.path.join(DATASET_FOLDER, filename)

    digital_image = get_digital_image(path)
    im2_gray = cv2.cvtColor(digital_image, cv2.COLOR_BGR2GRAY) #grayscale

    # DINOv3 similarity score
    digital_dino_embedding = get_dino_embedding(digital_image) #compute DINO embedding for digital image
    dino_score = get_dino_similarity(esp32_dino_embedding, digital_dino_embedding) #compute cosine similarity between ESP32 image and digital embeddings

    dino_candidates.append({
        "filename": filename,
        "path": path,
        "digital_image": digital_image,
        "im2_gray": im2_gray,
        "dino_score": dino_score
    })

# Sort by DINO similarity and keep top DINO matches
dino_candidates = sorted(dino_candidates, key=lambda x: x["dino_score"], reverse=True) #sorts all digital images by DINO score
top_dino_candidates = dino_candidates[:TOP_DINO_MATCHES] #shortlists top DINO matches, 3 for now

# Second loop: run ORB/RANSAC only on the top DINO matches
for candidate in top_dino_candidates:
    filename = candidate["filename"]
    im2_gray = candidate["im2_gray"]
    dino_score = candidate["dino_score"]

    keypoints1, descriptors1 = orb.detectAndCompute(im1_gray, None) #detect ORB keypoints and compute descriptors
    keypoints2, descriptors2 = orb.detectAndCompute(im2_gray, None)

    im2_display = cv2.drawKeypoints(im2_gray, keypoints2, None, color=(255,0,0), flags=cv2.DRAW_MATCHES_FLAGS_DEFAULT)
    cv2.imwrite(os.path.join(output_folder, f"kp_{filename}"), im2_display)

    if descriptors1 is None or descriptors2 is None:
        results.append({
            "filename": filename,
            "inliers": 0,
            "dino_score": dino_score,
            "is_match": False
        })
        continue

    matches = matcher.knnMatch(descriptors1, descriptors2, k=2) #find two closest matches for each descriptor
    good_matches = []

    for pair in matches:
        if len(pair) < 2:
            continue
        m, n = pair
        if m.distance < MATCH_THRESHOLD * n.distance: #Lowe's ratio test
            good_matches.append(m)

    good_matches = sorted(good_matches, key=lambda x: x.distance) #sort matches by distance (lower is better)
    #num_good_matches = int(len(good_matches) * .3) #keep top 30% of matches

    inlier_matches = []

    if len(good_matches) >= 4:
        points1 = np.zeros((len(good_matches), 2), dtype=np.float32) #creates arrays to hold matched keypoints
        points2 = np.zeros((len(good_matches), 2), dtype=np.float32) 

        for i, match in enumerate(good_matches):
            points1[i, :] = keypoints1[match.queryIdx].pt
            points2[i, :] = keypoints2[match.trainIdx].pt
        h, mask = cv2.findHomography(points1, points2, cv2.RANSAC, RANSAC_THRESHOLD) #uses RANSAC to find homography and filter out outliers, returns mask of inliers

        if mask is not None:
            mask = mask.ravel().tolist()
            inlier_matches = [good_matches[i] for i in range(len(good_matches)) if mask[i]]

    is_match = len(inlier_matches) >= GOOD_MATCH_MIN and dino_score >= DINO_MATCH_MIN #match if minimum threshold is reached

    results.append({
        "filename": filename,
        "inliers": len(inlier_matches),
        "dino_score": dino_score,
        "is_match": is_match
    })

    im_matches = cv2.drawMatches(im1_gray, keypoints1, im2_gray, keypoints2, inlier_matches, None)
    cv2.imwrite(os.path.join(output_folder, f"matches_{filename}"), im_matches)

if len(results) > 0:
    confirmed_results = [result for result in results if result["is_match"]]

    print("\n===== TOP DINO CANDIDATES WITH ORB RESULTS =====")
    for result in results:
        print(f"{result['filename']}:")
        print(f"  DINOv3 similarity: {result['dino_score']:.4f}")
        print(f"  ORB/RANSAC inliers: {result['inliers']}")
        print(f"  Match: {'YES' if result['is_match'] else 'NO'}")

    print("\n===== FINAL MATCH =====")

    if len(confirmed_results) > 0:
        best_match = max(confirmed_results, key=lambda x: x["inliers"])

        print(f"File: {best_match['filename']}")
        print(f"Inliers: {best_match['inliers']}")
        print(f"DINOv3 similarity: {best_match['dino_score']:.4f}")
        print("Match: YES")
    else:
        best_dino = max(results, key=lambda x: x["dino_score"])

        print("No confident match found")
        print(f"Closest DINO candidate: {best_dino['filename']}")
        print(f"DINOv3 similarity: {best_dino['dino_score']:.4f}")
        print(f"ORB/RANSAC inliers: {best_dino['inliers']}")
        print("Match: NO")

print(f"\nDone. Results saved to '{output_folder}/'")