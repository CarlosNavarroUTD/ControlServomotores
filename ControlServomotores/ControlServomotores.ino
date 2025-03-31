#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

// Configuración WiFi
const char* ssid = "UTD";
const char* password = "a1b1c1d1e1";

// Servidor web en puerto 80
WebServer server(80);

// Definir 6 objetos Servo
Servo servo1, servo2, servo3, servo4, servo5, servo6;

// Pines de conexión de los servos
const int pinServo1 = 13;
const int pinServo2 = 12;
const int pinServo3 = 14;
const int pinServo4 = 27;
const int pinServo5 = 26;
const int pinServo6 = 25;

// Variables para guardar los ángulos actuales
int currentAngles[6] = {90, 90, 90, 90, 90, 90};

// Estructura para presets guardados
struct ServoPreset {
  String name;
  int angles[6];
};

// Arreglo de presets predefinidos (puedes modificarlos)
ServoPreset presets[] = {
  {"Posición Inicial", {90, 90, 90, 90, 90, 90}},
  {"Brazo Extendido", {0, 45, 90, 90, 90, 90}},
  {"Brazo Recogido", {180, 135, 90, 90, 90, 90}},
  {"Pinza Abierta", {90, 90, 90, 90, 90, 180}},
  {"Pinza Cerrada", {90, 90, 90, 90, 90, 0}},
  {"Saludar", {90, 45, 45, 90, 90, 90}}
};

void setup() {
  Serial.begin(115200);
  
  // Conectar a WiFi
  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi conectado");
  Serial.print("Dirección IP: ");
  Serial.println(WiFi.localIP());
  
  // Configurar rutas del servidor
  server.on("/", HTTP_GET, handleRoot);
  server.on("/servo", HTTP_POST, handleServoControl);
  // server.on("/servo", HTTP_OPTIONS, handleOptions);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/presets", HTTP_GET, handleGetPresets);
  
  // En la función setup(), después de configurar las rutas
  server.enableCORS(true);
  // Agregar headers adicionales para CORS
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

  // Manejar peticiones no encontradas
  server.onNotFound(handleNotFound);
  
  // Habilitar CORS
  server.enableCORS(true);
  
  // Iniciar servidor
  server.begin();
  Serial.println("Servidor HTTP iniciado");
  Serial.println("Esperando solicitudes...");

  // Adjuntar los servos a sus respectivos pines
  servo1.attach(pinServo1);
  servo2.attach(pinServo2);
  servo3.attach(pinServo3);
  servo4.attach(pinServo4);
  servo5.attach(pinServo5);
  servo6.attach(pinServo6);
  
  // Inicializar servos a 90 grados
  servo1.write(90);
  servo2.write(90);
  servo3.write(90);
  servo4.write(90);
  servo5.write(90);
  servo6.write(90);
}

void loop() {
  server.handleClient();
}

// Página principal
void handleRoot() {
  Serial.println("Cliente conectado - Página principal solicitada");
  String html = "<html><head><title>Control de Servomotores ESP32</title>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>body{font-family:Arial;margin:0;padding:20px;text-align:center;}</style>";
  html += "</head><body>";
  html += "<h1>Control de Servomotores ESP32</h1>";
  html += "<p>Utiliza la aplicación React para controlar los servomotores</p>";
  html += "<h2>Estado actual:</h2>";
  
  for (int i = 0; i < 6; i++) {
    html += "<p>Servo " + String(i+1) + ": " + String(currentAngles[i]) + " grados</p>";
  }
  
  html += "</body></html>";
  
  server.send(200, "text/html", html);
  Serial.println("Página principal enviada al cliente");

}

// Obtener estado actual
void handleStatus() {
  Serial.println("Solicitud de estado recibida");
  DynamicJsonDocument doc(1024);
  JsonArray servos = doc.createNestedArray("servos");
  
  for (int i = 0; i < 6; i++) {
    JsonObject servo = servos.createNestedObject();
    servo["id"] = i + 1;
    servo["angle"] = currentAngles[i];
  }
  
  String response;
  serializeJson(doc, response);
  
  server.send(200, "application/json", response);
  Serial.println("Respuesta de estado enviada: " + response);
}

// Obtener presets predefinidos
void handleGetPresets() {
  Serial.println("Solicitud de presets recibida");

  DynamicJsonDocument doc(2048);
  JsonArray presetsArray = doc.createNestedArray("presets");
  
  int numPresets = sizeof(presets) / sizeof(presets[0]);
  
  for (int i = 0; i < numPresets; i++) {
    JsonObject preset = presetsArray.createNestedObject();
    preset["name"] = presets[i].name;
    
    JsonArray angles = preset.createNestedArray("angles");
    for (int j = 0; j < 6; j++) {
      angles.add(presets[i].angles[j]);
    }
  }
  
  String response;
  serializeJson(doc, response);
  
  server.send(200, "application/json", response);
  Serial.println("Lista de presets enviada");

}

// Manejar solicitudes para controlar servos
void handleServoControl() {
  Serial.println("Received servo control request");

  // Verificar si la solicitud tiene cuerpo
  if (!server.hasArg("plain")) {
    Serial.println("ERROR: No se recibieron datos en la solicitud");
    server.send(400, "text/plain", "Bad Request: No data");
    return;
  }
  
  String body = server.arg("plain");
  Serial.println("Datos recibidos: " + body);

  
  // Analizar JSON
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, body);
  
  if (error) {
    server.send(400, "text/plain", "Error: JSON inválido");
    return;
  }
  
  // Comprobar si es una solicitud para un solo servo o para múltiples
  if (doc.containsKey("servo") && doc.containsKey("angle")) {
    // Control de un solo servo
    int servoNum = doc["servo"];
    int angle = doc["angle"];
    
    Serial.print("Intento de mover el servo ");
    Serial.print(servoNum);
    Serial.print(" a ");
    Serial.print(angle);
    Serial.println(" grados");

    // Validar valores
    if (servoNum < 1 || servoNum > 6) {
      Serial.println("ERROR: Número de servo fuera de rango (1-6)");
      server.send(400, "text/plain", "Error: Número de servo inválido (1-6)");
      return;
    }
    
    if (angle < 0 || angle > 180) {
      Serial.println("ERROR: Ángulo fuera de rango (0-180)");
      server.send(400, "text/plain", "Error: Ángulo inválido (0-180)");
      return;
    }
    
    // Mover el servo correspondiente
    bool success = moveServo(servoNum, angle);
    
    if (success) {
      // Actualizar ángulo actual
      currentAngles[servoNum-1] = angle;
      
      String response = "Servo " + String(servoNum) + " movido a " + String(angle) + " grados";
      Serial.println("ÉXITO: " + response);
      server.send(200, "text/plain", response);
    } else {
      Serial.println("ERROR: No se pudo mover el servo");
      server.send(500, "text/plain", "Error: No se pudo mover el servo");
    }
  } 
  else if (doc.containsKey("preset")) {
    // Aplicar un preset predefinido
    int presetIndex = doc["preset"];
    int numPresets = sizeof(presets) / sizeof(presets[0]);

    Serial.print("Intento de aplicar preset #");
    Serial.print(presetIndex);
    Serial.print(": ");

    
    if (presetIndex < 0 || presetIndex >= numPresets) {
      Serial.println("ERROR: Índice de preset fuera de rango");
      server.send(400, "text/plain", "Error: Índice de preset inválido");
      return;
    }
    
    // Aplicar cada ángulo del preset
    for (int i = 0; i < 6; i++) {
      int angle = presets[presetIndex].angles[i];
      Serial.print("  Servo ");
      Serial.print(i + 1);
      Serial.print(": ");
      Serial.print(angle);
      Serial.println(" grados");
      
      moveServo(i + 1, angle);
      currentAngles[i] = angle;
      delay(100); // Pequeña pausa entre movimientos
    }
    
    String response = "Preset '" + presets[presetIndex].name + "' aplicado correctamente";
    Serial.println("ÉXITO: " + response);
    server.send(200, "text/plain", response);  } 
  else {
    server.send(400, "text/plain", "Error: Formato de solicitud inválido");
  }
}

// Función para mover un servo específico
bool moveServo(int servoNum, int angle) {
  Serial.print("Moviendo servo ");
  Serial.print(servoNum);
  Serial.print(" de ");
  Serial.print(currentAngles[servoNum-1]);
  Serial.print(" a ");
  Serial.print(angle);
  Serial.println(" grados");
  switch (servoNum) {
    case 1:
      servo1.write(angle);
      break;
    case 2:
      servo2.write(angle);
      break;
    case 3:
      servo3.write(angle);
      break;
    case 4:
      servo4.write(angle);
      break;
    case 5:
      servo5.write(angle);
      break;
    case 6:
      servo6.write(angle);
      break;
    default:
      Serial.println("ERROR: Número de servo inválido");
      return false;
  }
  
  // Guardar el ángulo actual
  currentAngles[servoNum-1] = angle;
  
  Serial.printf("Servo %d movido a %d grados\n", servoNum, angle);
  return true;
}

// Manejo de rutas no encontradas
void handleNotFound() {
  Serial.print("ERROR: Ruta no encontrada: ");
  Serial.println(server.uri());
  server.send(404, "text/plain", "Ruta no encontrada");
}

void handleOptions() {
  Serial.println("Recibida solicitud OPTIONS preflight");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(200);
}

