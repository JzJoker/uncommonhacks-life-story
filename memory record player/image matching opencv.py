import cv2
import numpy as np
import requests
import os
import torch
import torch.nn.functional as F
from PIL import Image
from transformers import AutoImageProcessor, AutoModel

ESP32_URL        = "http://192.168.2.151:81/jpeg"
DATASET_FOLDER = "memory record player/image_dataset"
output_folder = "memory record player/match_results"

MAX_KEYPOINTS    = 3000  # more = slower but more accurate
MATCH_THRESHOLD  = 0.8 # Lowe's ratio test — lower = stricter (0.6–0.8 typical)
GOOD_MATCH_MIN   = 15     # minimum RANSAC inliers to consider a positive match
RANSAC_THRESHOLD = 5.0    # max pixel reprojection error for RANSAC inlier (lower = stricter)
TOP_DINO_MATCHES   = 3     # number of top DINO matches to consider for final decision
DINO_DECENT_MIN   = 0.25    # minimum DINO similarity to consider a decent match
DINO_STRONG_MIN  = 0.35    # strong DINO similarity can accept match even if ORB is weak,
DINO_MARGIN_MIN  = 0.08    # DINO must beat second-best score by this much to override ORB 

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
    #tells us how close embeddings are to each other, which reflects semantic similarity

def classify_match(dino_score, inliers, dino_margin, is_best_dino):
    orb_strong = inliers >= GOOD_MATCH_MIN 
    dino_decent = dino_score >= DINO_DECENT_MIN #DINO is good enough, check if ORB is STRONG
    dino_strong = dino_score >= DINO_STRONG_MIN and dino_margin >= DINO_MARGIN_MIN and is_best_dino 
    #dino is ONLY strong if its above strong threshold AND beats second-best by margin
    #this works in cases where DINO is high across the board, use ORB to pick

    if dino_strong:
        return True, "DINO strong" #reasoning is DINO IS VERY STRONG, so we trust it even if ORB is weak

    if orb_strong and dino_decent:
        return True, "ORB strong + DINO decent" #reasoning is ORB IS STRONG, and DINO is DECENT, so we trust it. 
        #eliminates ORB false positives that would have otherwise been accepted if we relied on ORB alone, since
        #ITS VERY HARD for a false positive ORB match to also have a decent semantic DINO score, so this combo is pretty reliable

    if orb_strong and not dino_decent:
        return False, "ORB false positive"
        #ORB IS STRONG but DINO IS WEAK, so it's PROBABLY FALSE POSITIVE.

    return False, "No confident match"
    #both ORB and DINO are weak, so we don't have confidence in this match

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

best_dino_score = top_dino_candidates[0]["dino_score"] #identifies best DINO score

if len(top_dino_candidates) > 1:
    second_dino_score = top_dino_candidates[1]["dino_score"] #identifies second-best DINO
else:
    second_dino_score = 0 #if only 1 strong candidate, set second to zero

dino_margin = best_dino_score - second_dino_score #differnece between first and second

# Second loop: run ORB/RANSAC only on the top DINO matches
for candidate in top_dino_candidates: 
    filename = candidate["filename"]
    im2_gray = candidate["im2_gray"]
    dino_score = candidate["dino_score"]
    is_best_dino = filename == top_dino_candidates[0]["filename"]

    keypoints1, descriptors1 = orb.detectAndCompute(im1_gray, None) #detect ORB keypoints and compute descriptors
    keypoints2, descriptors2 = orb.detectAndCompute(im2_gray, None)

    im2_display = cv2.drawKeypoints(im2_gray, keypoints2, None, color=(255,0,0), flags=cv2.DRAW_MATCHES_FLAGS_DEFAULT)
    cv2.imwrite(os.path.join(output_folder, f"kp_{filename}"), im2_display)

    if descriptors1 is None or descriptors2 is None:
        is_match, match_reason = classify_match(dino_score, 0, dino_margin, is_best_dino)

        results.append({
            "filename": filename,
            "inliers": 0,
            "dino_score": dino_score,
            "is_match": is_match,
            "match_reason": match_reason
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

    is_match, match_reason = classify_match(dino_score, len(inlier_matches), dino_margin, is_best_dino) #match if DINO is strong, or if ORB is strong and DINO is decent
    results.append({
        "filename": filename,
        "inliers": len(inlier_matches),
        "dino_score": dino_score,
        "is_match": is_match,
        "match_reason": match_reason
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
        print(f"  Reason: {result['match_reason']}")

    print("\n===== FINAL MATCH =====")

    if len(confirmed_results) > 0:
        best_match = max(
            confirmed_results,
            key=lambda x: (
                x["match_reason"] == "DINO strong", #if DINO is strong, match regardless of ORB
                x["inliers"] if x["match_reason"] != "DINO strong" else x["dino_score"], #if DINO is not strong, rely on ORB
                x["dino_score"] 
            )
        )

        print(f"File: {best_match['filename']}")
        print(f"Inliers: {best_match['inliers']}")
        print(f"DINOv3 similarity: {best_match['dino_score']:.4f}")
        print(f"Reason: {best_match['match_reason']}")
        print("Match: YES")
    else:
        best_dino = max(results, key=lambda x: x["dino_score"])  

        print("No confident match found")
        print(f"Closest DINO candidate: {best_dino['filename']}")
        print(f"DINOv3 similarity: {best_dino['dino_score']:.4f}")
        print(f"ORB/RANSAC inliers: {best_dino['inliers']}")
        print(f"Reason: {best_dino['match_reason']}")
        print("Match: NO")

print(f"\nDone. Results saved to '{output_folder}/'")