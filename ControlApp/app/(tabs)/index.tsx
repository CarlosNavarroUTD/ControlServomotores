import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView, SafeAreaView } from 'react-native';

// Componentes de las ventanas
interface ManualControlProps {
  ipAddress: string;
  isConnected: boolean;
  onConnect: () => void;
}

const ManualControl: React.FC<ManualControlProps> = ({ ipAddress, isConnected, onConnect }) => {
  const [servoAngles, setServoAngles] = useState<{ [key: number]: number }>({
    1: 90, 2: 90, 3: 90, 4: 90, 5: 90, 6: 90
  });
  const [serverResponse, setServerResponse] = useState('');

  const handleConnect = () => {
    onConnect();
  };

  const controlServo = async (servoNum: number, angle: number) => {
    
    if (!isConnected) {
      Alert.alert('Error', 'Por favor conecta a un dispositivo primero');
      return;
    }

    console.log(`Intentando mover servo ${servoNum} a ${angle}° en ${ipAddress}`);
    setServerResponse(`Enviando comando: Servo ${servoNum} a ${angle}°...`);
    
    try {
      const url = `http://${ipAddress}/servo`;
      const data = {
        servo: servoNum,
        angle: angle
      };
      
      console.log(`Enviando POST a ${url}`, data);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*' // Acepta cualquier tipo de contenido
        },
        mode: 'no-cors',
        body: JSON.stringify(data)
      });
      
      // Mejor manejo de la respuesta
      let responseText = '';
      try {
        responseText = await response.text();
      } catch (e) {
        responseText = 'No se pudo leer la respuesta';
      }

      console.log(`Status: ${response.status}, Respuesta: ${responseText}`);

      if (response.ok || response.status === 200) {
        setServerResponse(responseText || 'Comando ejecutado correctamente');
      } else {
        throw new Error(`Error ${response.status}: ${responseText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Excepción al controlar servo:', errorMessage);
      setServerResponse(`Error: ${errorMessage}`);
      Alert.alert('Error', `No se pudo controlar el servo: ${errorMessage}`);
    }
  };

  const handleSliderChange = (servoNum: number, angle: number) => {
    setServoAngles(prev => ({
      ...prev,
      [servoNum]: angle
    }));
    
    controlServo(servoNum, angle);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Control Manual</Text>
        
        {/* Controles para cada servo */}
        {[1, 2, 3, 4, 5, 6].map(servoNum => (
          <View key={servoNum} style={styles.servoControl}>
            <Text style={styles.servoLabel}>Servo {servoNum}</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.angleValue}>0°</Text>
              <input
                type="range"
                min="0"
                max="180"
                value={servoAngles[servoNum]}
                onChange={(e) => handleSliderChange(servoNum, parseInt(e.target.value))}
                style={styles.slider}
              />
              <Text style={styles.angleValue}>180°</Text>
            </View>
            <Text style={styles.currentAngle}>{servoAngles[servoNum]}°</Text>
          </View>
        ))}

        {/* Área de respuesta del servidor */}
        {serverResponse && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseTitle}>Respuesta:</Text>
            <Text style={styles.responseText}>{serverResponse}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

interface PreConfiguradosProps {
  ipAddress: string;
  isConnected: boolean;
}

const PreConfigurados: React.FC<PreConfiguradosProps> = ({ ipAddress, isConnected }) => {
  const [serverResponse, setServerResponse] = useState('');

  const presets = [
    { name: "Posición Inicial", angles: [90, 90, 90, 90, 90, 90] },
    { name: "Brazo Extendido", angles: [0, 45, 90, 90, 90, 90] },
    { name: "Brazo Recogido", angles: [180, 135, 90, 90, 90, 90] },
    { name: "Pinza Abierta", angles: [90, 90, 90, 90, 90, 180] },
    { name: "Pinza Cerrada", angles: [90, 90, 90, 90, 90, 0] },
    { name: "Saludar", angles: [90, 45, 45, 90, 90, 90] }
  ];

  const applyPreset = async (preset: { name: string; angles: number[] }) => {
    if (!isConnected) {
      Alert.alert('Error', 'Por favor conecta a un dispositivo primero');
      return;
    }

    setServerResponse(`Aplicando preset: ${preset.name}...`);
    
    try {
      // Aplicar cada ángulo del preset a cada servo
      for (let i = 0; i < 6; i++) {
        const servoNum = i + 1;
        const angle = preset.angles[i];
        
        await fetch(`http://${ipAddress}/servo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          mode: 'no-cors',
          body: JSON.stringify({
            servo: servoNum,
            angle: angle
          })
        });
        
        // Pequeña pausa entre cada movimiento
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setServerResponse(`Preset "${preset.name}" aplicado correctamente.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setServerResponse(`Error al aplicar preset: ${errorMessage}`);
      Alert.alert('Error', `No se pudo aplicar el preset: ${errorMessage}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Movimientos Pre-configurados</Text>
        
        {presets.map((preset, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.presetButton}
            onPress={() => applyPreset(preset)}
          >
            <Text style={styles.presetButtonText}>{preset.name}</Text>
            <Text style={styles.presetDetails}>
              {preset.angles.map((angle, i) => `S${i+1}: ${angle}°`).join(', ')}
            </Text>
          </TouchableOpacity>
        ))}
        
        {/* Área de respuesta del servidor */}
        {serverResponse && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseTitle}>Estado:</Text>
            <Text style={styles.responseText}>{serverResponse}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

interface ConfiguracionesProps {
  ipAddress: string;
  setIpAddress: (value: string) => void;
  handleConnect: () => void;
}

const Configuraciones: React.FC<ConfiguracionesProps> = ({ ipAddress, setIpAddress, handleConnect }) => {
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Configuraciones</Text>
        
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Conexión ESP32</Text>
          <TextInput
            style={styles.input}
            placeholder="Ingresa la IP del ESP32"
            value={ipAddress}
            onChangeText={setIpAddress}
            keyboardType="numeric"
          />
          <TouchableOpacity 
            style={[styles.button, styles.connectButton]} 
            onPress={handleConnect}
          >
            <Text style={styles.buttonText}>Conectar</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Información</Text>
          <Text style={styles.configInfo}>
            Esta aplicación controla 6 servomotores conectados a un ESP32.
          </Text>
          <Text style={styles.configInfo}>
            - En la pestaña "Manual" puedes controlar cada servo individualmente.
          </Text>
          <Text style={styles.configInfo}>
            - En la pestaña "Pre-configurados" puedes aplicar posiciones predefinidas.
          </Text>
          <Text style={styles.configInfo}>
            - Si tienes problemas de conexión, verifica que el ESP32 esté encendido y en la misma red.
          </Text>
        </View>
        
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Sobre la aplicación</Text>
          <Text style={styles.configInfo}>
            Versión: 1.0.0
          </Text>
          <Text style={styles.configInfo}>
            Desarrollado con React Native
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default function App() {
  const [ipAddress, setIpAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');
  
  const handleConnect = () => {
    if (!ipAddress) {
      Alert.alert('Error', 'Por favor ingresa la dirección IP del ESP32');
      return;
    }
    
    // Validación simple de dirección IP
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(ipAddress)) {
      Alert.alert('Error', 'Formato de IP inválido');
      return;
    }
    
    setIsConnected(true);
    Alert.alert('Conectado', `Conectado a: ${ipAddress}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Control de Servomotores</Text>
        <View style={styles.connectionIndicator}>
          <View style={[
            styles.connectionDot, 
            isConnected ? styles.connectedDot : styles.disconnectedDot
          ]} />
          <Text style={styles.connectionText}>
            {isConnected ? 'Conectado: ' + ipAddress : 'Desconectado'}
          </Text>
        </View>
      </View>
      
      {/* Contenido principal según la pestaña activa */}
      <View style={styles.content}>
        {activeTab === 'manual' && (
          <ManualControl 
            ipAddress={ipAddress} 
            isConnected={isConnected} 
            onConnect={handleConnect}
          />
        )}
        
        {activeTab === 'presets' && (
          <PreConfigurados 
            ipAddress={ipAddress} 
            isConnected={isConnected}
          />
        )}
        
        {activeTab === 'config' && (
          <Configuraciones 
            ipAddress={ipAddress} 
            setIpAddress={setIpAddress} 
            handleConnect={handleConnect} 
          />
        )}
      </View>
      
      {/* Navegación */}
      <View style={styles.navbar}>
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'manual' && styles.activeNavItem]} 
          onPress={() => setActiveTab('manual')}
        >
          <Text style={[styles.navText, activeTab === 'manual' && styles.activeNavText]}>Manual</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'presets' && styles.activeNavItem]} 
          onPress={() => setActiveTab('presets')}
        >
          <Text style={[styles.navText, activeTab === 'presets' && styles.activeNavText]}>Pre-configurados</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'config' && styles.activeNavItem]} 
          onPress={() => setActiveTab('config')}
        >
          <Text style={[styles.navText, activeTab === 'config' && styles.activeNavText]}>Configuraciones</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4287f5',
    padding: 15,
    paddingTop: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  connectedDot: {
    backgroundColor: '#4cd964',
  },
  disconnectedDot: {
    backgroundColor: '#ff3b30',
  },
  connectionText: {
    fontSize: 12,
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  sectionContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  navbar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  navItem: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 14,
    color: '#666',
  },
  activeNavItem: {
    borderTopWidth: 3,
    borderTopColor: '#4287f5',
  },
  activeNavText: {
    color: '#4287f5',
    fontWeight: 'bold',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    marginVertical: 10,
  },
  connectButton: {
    backgroundColor: '#4287f5',
    marginTop: 10,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  servoControl: {
    width: '100%',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  servoLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  angleValue: {
    fontSize: 14,
    color: '#666',
    width: 40,
    textAlign: 'center',
  },
  currentAngle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4287f5',
    textAlign: 'center',
    marginTop: 10,
  },
  responseContainer: {
    width: '100%',
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0f8ff',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4287f5',
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  responseText: {
    fontSize: 14,
    color: '#666',
  },
  presetButton: {
    width: '100%',
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  presetButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4287f5',
    marginBottom: 5,
  },
  presetDetails: {
    fontSize: 14,
    color: '#666',
  },
  configItem: {
    width: '100%',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  configLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  configInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20,
  },
});