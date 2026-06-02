# Memory Record Player

The Memory Record Player is a physical photo matching feature for LifeStory. It uses an ESP32-S3 camera to capture a printed photo, then compares that camera image against a local dataset of saved digital photos.

## How It Works

The system uses a hybrid matching pipeline:

```text
ESP32-S3 Camera Image
        ↓
DINOv2 Visual Similarity Filtering
        ↓
Top Candidate Images
        ↓
ORB Feature Matching
        ↓
Lowe's Ratio Test
        ↓
BFMatcher Hamming Distance
        ↓
RANSAC Homography Check
        ↓
Final Match Decision
```

## Image Capture

The ESP32-S3 camera streams JPEG images over Wi-Fi. The Python script requests the image from the ESP32 URL, converts the raw bytes into a NumPy array, and decodes it into an OpenCV image.

## DINOv2 Similarity Filtering

DINOv2 is used first to compare the physical camera image against every image in the dataset. Each image is converted into an embedding vector, and the vectors are compared using cosine similarity.

This step ranks the dataset images by high-level visual similarity, which helps handle blur, glare, angle changes, and partial crops better than traditional feature matching alone.

## ORB Feature Matching

After DINOv2 selects the top candidate images, ORB computes keypoints and descriptors in both the physical and every digital candidate.

This is because ORB is computationally expensive and we expect our image database to be much larger than my test samples, DINO is very efficient at fast semantic processing, while ORB gives one-to-one matches.

## Lowe's Ratio Test

The matcher finds the two closest descriptor matches for each ORB feature. Lowe's ratio test keeps a match only if the best match is significantly better than the second-best match.

This helps remove weak or ambiguous matches.

## Brute-Force Hamming Matcher

ORB creates binary descriptors, so the project uses a brute-force matcher with Hamming distance. Hamming distance compares two binary descriptors by counting how many bits are different.

Lower Hamming distance means the two ORB descriptors are more similar.

## RANSAC Verification

After good ORB matches are found, RANSAC checks whether the matched keypoints fit a valid homography between the physical camera image and the digital reference image.

This filters out random false matches and keeps only geometrically consistent inliers.

## Final Match Logic

The final decision acts like a checks-and-balances system between DINOv2 and ORB/RANSAC:

* DINOv2 filters for visually similar photos
* ORB/RANSAC verifies local feature alignment
* If DINOv2 scores are close, ORB inliers decide the best match
* If ORB finds many matches but DINOv2 similarity is too low, the result is rejected as a false positive
* If DINOv2 is clearly ahead by a strong margin, the system can trust the DINOv2 result

This hybrid approach was used because ORB alone can produce false positives, while DINOv2 alone does not verify exact geometric alignment. Together, they make the photo matching pipeline more reliable for real-world camera input.

## Adjusting Matching Thresholds (IF ALGORITHM DOESN'T WORK FOR YOU)

The matching behavior can be tuned by changing the threshold constants near the top of `image matching opencv.py`.

```python
MAX_KEYPOINTS      = 3000
MATCH_THRESHOLD    = 0.8
GOOD_MATCH_MIN     = 15
RANSAC_THRESHOLD   = 5.0
TOP_DINO_MATCHES   = 3
DINO_DECENT_MIN    = 0.25
DINO_STRONG_MIN    = 0.35
DINO_MARGIN_MIN    = 0.08
```

### ORB / RANSAC Thresholds

* `MAX_KEYPOINTS` controls how many ORB keypoints are detected. Higher values may improve matching but can slow the program down.
* `MATCH_THRESHOLD` controls Lowe’s ratio test. Lower values are stricter, while higher values allow more possible matches.
* `GOOD_MATCH_MIN` is the minimum number of RANSAC inliers needed for ORB to be considered strong.
* `RANSAC_THRESHOLD` controls how strict the homography check is. Lower values require tighter geometric alignment, while higher values allow more distortion.

### DINOv2 Thresholds

* `TOP_DINO_MATCHES` controls how many visually similar images are passed from DINOv2 into ORB/RANSAC.
* `DINO_DECENT_MIN` is the minimum DINOv2 similarity needed for ORB matches to be trusted.
* `DINO_STRONG_MIN` is the minimum DINOv2 similarity needed for DINOv2 to potentially override ORB.
* `DINO_MARGIN_MIN` requires the best DINOv2 candidate to beat the second-best candidate by a clear margin before DINOv2 is trusted on its own.

### Tuning Guide

If the system misses correct matches, try:

* Increasing `MATCH_THRESHOLD`
* Lowering `GOOD_MATCH_MIN`
* Lowering `DINO_STRONG_MIN`

If the system gives false positives, try:

* Lowering `MATCH_THRESHOLD`
* Increasing `GOOD_MATCH_MIN`
* Increasing `DINO_DECENT_MIN`
* Increasing `DINO_MARGIN_MIN`

The current logic is designed so DINOv2 and ORB/RANSAC act as a checks-and-balances system. DINOv2 handles high-level visual similarity, while ORB/RANSAC verifies local feature alignment when the DINOv2 scores are close.

