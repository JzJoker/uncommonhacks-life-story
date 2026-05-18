#define WIFI_SSID "[]" //replace wiht hotspot info
#define WIFI_PASS "" //replace w hotspot info
#define HOSTNAME "esp32cam"

#include <eloquent_esp32cam.h>
#include <eloquent_esp32cam/extra/esp32/wifi/sta.h>
#include <eloquent_esp32cam/viz/mjpeg.h>

using namespace eloq;
using namespace eloq::viz;

void setup() {
    delay(3000);
    Serial.begin(115200);

    Serial.println("___LIFESTORY CAMERA SERVER___");

    camera.pinout.freenove_s3(); //board pinout
    camera.resolution.uxga(); //currently 1024 x 768 //use uxga for FULL 2MP 1600 x 1200
    camera.quality.best();

    camera.config.fb_location = CAMERA_FB_IN_PSRAM;

    while (!camera.begin().isOk()) {
        Serial.println(camera.exception.toString());
    }

    while (!wifi.connect().isOk()) {
        Serial.println(wifi.exception.toString());
    }

    while (!mjpeg.begin().isOk()) {
        Serial.println(mjpeg.exception.toString());
    }

    Serial.println("Camera OK");
    Serial.println("WiFi OK");
    Serial.println("MJPEG Server OK");

    Serial.print("Stream URL: ");
    Serial.println(mjpeg.address());

    Serial.print("Still image URL for OpenCV: ");
    Serial.print(mjpeg.address());
    Serial.println("/jpeg");
}

void loop() {
    // server runs in background
}