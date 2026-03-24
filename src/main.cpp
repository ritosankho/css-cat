#include <Arduino.h>
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <Arduino_JSON.h>

// #include <Wire.h>

const char *ssid = "";
const char *password = "";

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
// JSONVar data;
const int stickX = 36;
const int stickY = 39;
const int stickButton = 26;
// const int sda = 21;
// const int scl = 22;
// Set your Static IP address
IPAddress local_IP(192, 168, 1, 184);
// Set your Gateway IP address
IPAddress gateway(192, 168, 1, 1);

IPAddress subnet(255, 255, 0, 0);
IPAddress primaryDNS(8, 8, 8, 8);   // optional
IPAddress secondaryDNS(8, 8, 4, 4); // optional

struct CatState
{
  float head;
  float x;
  float depth;
  int size;
  int mood;
  int meow;
};
CatState readStick()
{

  CatState s;
  s.meow = 0; 
  s.mood = 0; 
  static unsigned long moodUntil = 0;
  static float headPos = 0; // actual rendered head angle
  static float headVel = 0; // velocity

  // --- READ RAW ---
  int xValue = analogRead(stickX);
  int yValue = analogRead(stickY);

  // --- NORMALIZE (-1 to +1) ---
  float normX = (xValue - 2048.0f) / 2048.0f;
  float normY = (yValue - 2048.0f) / 2048.0f;
  // Smoothing
  static float smoothX = 0;
  static float smoothY = 0;

  smoothX = smoothX * 0.8 + normX * 0.2;
  smoothY = smoothY * 0.8 + normY * 0.2;

  normX = smoothX;
  normY = smoothY;

  // --- DEADZONE ---
  if (fabs(normX) < 0.01)
    normX = 0;
  if (fabs(normY) < 0.01)
    normY = 0;

  // --- HEAD LATERAL MOVEMENT ---
  float pos = normX * 25.0;
  pos *= (1.0 - fabs(normX) * 0.3); // non-linear feel
  s.x = pos;
  s.x = constrain(s.x, -25, 25);

  // --- DEPTH (Y AXIS) ---
  float depth = normY * fabs(normY); // smooth curve
  depth = constrain(depth, -1.0, 1.0);
  s.depth = depth;

  if (s.depth > 0.5)
  {
    // curious
    s.mood = 1;
  }
  else if (s.depth < -0.5)
  {
    // eepy
    s.mood = 4;
  }

  // --- HEAD ROTATION TARGET ---
  float maxAngle = 20.0 - fabs(s.depth) * 8.0;
  float targetHead = normX * maxAngle;
  // Idle noise
  float idleAmp = 2.0;
  float idleSpeed = 0.002;

  if (s.mood == 4) // sleepy
  {
    idleAmp = 1.0;
    idleSpeed = 0.001;
  }
  else if (s.mood == 1) // curious
  {
    idleAmp = 3.0;
    idleSpeed = 0.004;
  }

  if (fabs(normX) < 0.08 && fabs(normY) < 0.08)
  {
    targetHead += sin(millis() * idleSpeed) * idleAmp;
  }

  // --- INERTIA SYSTEM ---
  float stiffness = 0.05; // how strongly it follows target
  float damping = 0.75;   // how much motion is resisted
  if (s.mood == 4)        // sleepy
  {
    stiffness = 0.01;
    damping = 0.8;
  }
  else if (s.mood == 1) // curious
  {
    stiffness = 0.22;
    damping = 0.7;
  }

  float force = (targetHead - headPos) * stiffness;

  headVel += force;
  headVel *= damping;

  headPos += headVel;
  headPos = constrain(headPos, -30, 30);
  if (fabs(headPos) > 24.5)
  {
    headVel *= 0.5; // absorb energy at limits
  }

  // Output
  s.head = headPos;

  static int lastStableState = LOW;
  static int lastReading = LOW;
  static unsigned long lastDebounceTime = 0;

  int reading = !digitalRead(stickButton);
  unsigned long now = millis();

  if (reading != lastReading)
  {
    lastDebounceTime = now;
  }

  if ((now - lastDebounceTime) > 50)
  {
    if (reading != lastStableState)
    {
      lastStableState = reading;

      if (lastStableState == HIGH)
      {
        s.meow = 1;
        moodUntil = now + 300;
      }
    }
  }

  // ALWAYS run this
  if (now < moodUntil)
  {
    s.mood = 2;
  }

  lastReading = reading;

  

  return s;
}
void onWsEvent(AsyncWebSocket *server,
               AsyncWebSocketClient *client,
               AwsEventType type,
               void *arg,
               uint8_t *data,
               size_t len)
{
  if (type == WS_EVT_CONNECT)
  {
    Serial.println("Client connected");
  }
  else if (type == WS_EVT_DISCONNECT)
  {
    Serial.println("Client disconnected");
  }
}

String catToJson(const CatState &s)
{
  String json = "{";

  json += "\"head\":" + String(s.head, 2) + ",";
  json += "\"x\":" + String(s.x, 2) + ",";
  json += "\"depth\":" + String(s.depth, 2) + ",";
  json += "\"mood\":" + String(s.mood) + ",";
  json += "\"meow\":" + String(s.meow);

  json += "}";

  return json;
}

void setup()
{
  pinMode(stickX, INPUT);
  pinMode(stickY, INPUT);
  pinMode(stickButton, INPUT_PULLUP);
  Serial.begin(115200);
  // Configures static IP address
  if (!WiFi.config(local_IP, gateway, subnet, primaryDNS, secondaryDNS))
  {
    Serial.println("STA Failed to configure");
  }

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
  Serial.println(WiFi.localIP());

  ws.onEvent(onWsEvent);
  server.addHandler(&ws);

  server.begin();
}

void loop()
{

  static unsigned long last = 0;
  unsigned long now = millis();

  if (now - last >= 16)
  {
    last = now;

    CatState s = readStick();
    Serial.printf("Head: %.2f | X: %.2f | Meow: %d\n", s.head, s.x, s.meow);
    String json = catToJson(s);
    ws.textAll(json);
  }
  ws.cleanupClients();
}