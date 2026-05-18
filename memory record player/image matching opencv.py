import cv2
import numpy as np
import requests
import os
import torch
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1

ESP32_URL        = "http://10.0.0.94:81/jpeg"
DATASET_FOLDER  = "image_dataset"
output_folder    = "match_results"

MAX_KEYPOINTS    = 3000   # more = slower but more accurate
MATCH_THRESHOLD  = 0.80  # Lowe's ratio test — lower = stricter (0.6–0.8 typical)
GOOD_MATCH_MIN   = 20     # minimum RANSAC inliers to consider a positive match
RANSAC_THRESHOLD = 5.0    # max pixel reprojection error for RANSAC inlier (lower = stricter)

FACE_SIMILARITY_THRESHOLD = 0.5  # Adjust based on your needs (0.6–0.9 typical)

# FaceNet Setup
mtcnn = MTCNN(thresholds=[0.5, 0.6, 0.6])  # default is [0.6, 0.7, 0.7]
resnet = InceptionResnetV1(pretrained='vggface2').eval()

def get_image_from_esp32():
    response = requests.get(ESP32_URL)
    image_array = np.frombuffer(response.content, np.uint8)
    physical_image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    return physical_image

def get_digital_image(image_path):
    digital_image = cv2.imread(image_path, cv2.IMREAD_COLOR)
    return digital_image

def get_face_embedding(bgr_img):
    rgb_img = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(rgb_img)
    face    = mtcnn(pil_img)  # detects and crops face to 160x160
    print(f"Face detected: {'YES' if face is not None else 'NO'}")
    if face is None:
        return None
    with torch.no_grad():
        embedding = resnet(face.unsqueeze(0))  # get 512-dim embedding
    return torch.nn.functional.normalize(embedding, dim=-1)

def face_similarity(emb1, emb2):
    return (emb1 @ emb2.T).item()  # cosine similarity, -1 to 1

# Create output folder if it doesn't exist
os.makedirs(output_folder, exist_ok=True)

# Fetch ESP32 image once before the loop
im1_bgr  = get_image_from_esp32()
im1_gray = cv2.cvtColor(im1_bgr, cv2.COLOR_BGR2GRAY) #grayscale
im1_gray = cv2.flip(im1_gray, 1)  # 1 = horizontal flip, 0 = vertical, -1 = both
im1_bgr  = cv2.flip(im1_bgr, 1)

esp32_embedding = get_face_embedding(im1_bgr)

orb     = cv2.ORB_create(nfeatures=MAX_KEYPOINTS)
matcher = cv2.BFMatcher(cv2.DESCRIPTOR_MATCHER_BRUTEFORCE_HAMMING, crossCheck=False) #finds hamming distance between descriptors

# Save ESP32 keypoints once
keypoints1, descriptors1 = orb.detectAndCompute(im1_gray, None)
im1_display = cv2.drawKeypoints(im1_gray, keypoints1, None, color=(255,0,0), flags=cv2.DRAW_MATCHES_FLAGS_DEFAULT) #draws keypoints
cv2.imwrite("esp32imagekp.jpg", im1_display)

for filename in os.listdir(DATASET_FOLDER):
    if not filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        continue

    path    = os.path.join(DATASET_FOLDER, filename)
    im2_bgr  = get_digital_image(path)
    im2_gray = cv2.cvtColor(im2_bgr, cv2.COLOR_BGR2GRAY) #grayscale

    keypoints1, descriptors1 = orb.detectAndCompute(im1_gray, None)
    keypoints2, descriptors2 = orb.detectAndCompute(im2_gray, None)

    im2_display = cv2.drawKeypoints(im2_gray, keypoints2, None, color=(255,0,0), flags=cv2.DRAW_MATCHES_FLAGS_DEFAULT)
    cv2.imwrite(os.path.join(output_folder, f"kp_{filename}"), im2_display)

    if descriptors1 is None or descriptors2 is None:
        print(f"{filename}: no descriptors found, skipping")
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

    if len(good_matches) < 4:
        print(f"{filename}: not enough matches for homography, skipping") #need at least 4 matches to compute homography
        continue

    points1 = np.zeros((len(good_matches), 2), dtype=np.float32)
    points2 = np.zeros((len(good_matches), 2), dtype=np.float32)

    for i, match in enumerate(good_matches):
        points1[i, :] = keypoints1[match.queryIdx].pt
        points2[i, :] = keypoints2[match.trainIdx].pt
    h, mask = cv2.findHomography(points1, points2, cv2.RANSAC, RANSAC_THRESHOLD)

    inlier_matches = [good_matches[i] for i in range(len(good_matches)) if mask[i]]

    is_match = len(inlier_matches) >= GOOD_MATCH_MIN

    # Face similarity — only runs if both images have a detected face
    face_result = "no face"
    if esp32_embedding is not None:
        ref_embedding = get_face_embedding(im2_bgr)
        if ref_embedding is not None:
            score       = face_similarity(esp32_embedding, ref_embedding)
            face_result = f"{score:.4f} ({'MATCH' if score >= FACE_SIMILARITY_THRESHOLD else 'NO MATCH'})"

    print(f"{filename}: {len(inlier_matches)} inliers — {'YES' if is_match else 'NO'} | face: {face_result}")

    im_matches = cv2.drawMatches(im1_gray, keypoints1, im2_gray, keypoints2, inlier_matches, None)
    cv2.imwrite(os.path.join(output_folder, f"matches_{filename}"), im_matches)

print(f"\nDone. Results saved to '{output_folder}/'")