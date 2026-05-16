import cv2
import numpy as np
import requests

esp32_url = "http://10.16.124.250:81/jpeg"  # replace with ESP32 IP

response = requests.get(esp32_url)
image_array = np.frombuffer(response.content, np.uint8)
img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

cv2.imshow("ESP32 Capture", img)
cv2.waitKey(0)
cv2.destroyAllWindows()