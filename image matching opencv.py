import cv2
import numpy as np
import requests
import os

ESP32_URL        = "http://10.0.0.94:81/jpeg"
DATASET_FOLDER  = "image_dataset"
output_folder    = "match_results"

MAX_KEYPOINTS    = 3000   # more = slower but more accurate
MATCH_THRESHOLD  = 0.80  # Lowe's ratio test — lower = stricter (0.6–0.8 typical)
GOOD_MATCH_MIN   = 20     # minimum RANSAC inliers to consider a positive match
RANSAC_THRESHOLD = 5.0    # max pixel reprojection error for RANSAC inlier (lower = stricter)

def get_image_from_esp32():
    response = requests.get(ESP32_URL)
    image_array = np.frombuffer(response.content, np.uint8)
    physical_image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    return physical_image

def get_digital_image(image_path):
    digital_image = cv2.imread(image_path, cv2.IMREAD_COLOR)
    return digital_image

# Create output folder if it doesn't exist
os.makedirs(output_folder, exist_ok=True)

# Fetch ESP32 image once before the loop
im1_gray = cv2.cvtColor(get_image_from_esp32(), cv2.COLOR_BGR2GRAY) #grayscale
im1_gray = cv2.flip(im1_gray, 1)  # 1 = horizontal flip, 0 = vertical, -1 = both

orb     = cv2.ORB_create(nfeatures=MAX_KEYPOINTS)
matcher = cv2.BFMatcher(cv2.DESCRIPTOR_MATCHER_BRUTEFORCE_HAMMING, crossCheck=False) #finds hamming distance between descriptors

# Save ESP32 keypoints once
keypoints1, descriptors1 = orb.detectAndCompute(im1_gray, None)
im1_display = cv2.drawKeypoints(im1_gray, keypoints1, None, color=(255,0,0), flags=cv2.DRAW_MATCHES_FLAGS_DEFAULT) #draws keypoints
cv2.imwrite("esp32imagekp.jpg", im1_display)

for filename in os.listdir(DATASET_FOLDER):
    if not filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        continue

    path = os.path.join(DATASET_FOLDER, filename)
    im2_gray = cv2.cvtColor(get_digital_image(path), cv2.COLOR_BGR2GRAY) #grayscale

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
    print(f"{filename}: {len(inlier_matches)} inliers — {'YES' if is_match else 'NO'}")

    im_matches = cv2.drawMatches(im1_gray, keypoints1, im2_gray, keypoints2, inlier_matches, None)
    cv2.imwrite(os.path.join(output_folder, f"matches_{filename}"), im_matches)

print(f"\nDone. Results saved to '{output_folder}/'")