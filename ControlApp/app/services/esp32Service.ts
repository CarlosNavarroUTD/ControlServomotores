// esp32Service.ts - Servicio centralizado para comunicación con ESP32

export const esp32Service = {
  // Función para mover un servo específico
  async moveServo(ipAddress: string, servoNum: number, angle: number) {
    try {
      const url = `http://${ipAddress}/servo`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ servo: servoNum, angle: angle })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText || 'No hay detalle del error'}`);
      }
      
      return await response.text();
    } catch (error) {
      console.error('Error al controlar servo:', error);
      throw error;
    }
  },
  
  // Función para obtener el estado actual
  async getStatus(ipAddress: string) {
    try {
      const response = await fetch(`http://${ipAddress}/status`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error al obtener estado:', error);
      throw error;
    }
  },
  
  // Verificar conexión
  async checkConnection(ipAddress: string) {
    try {
      const response = await fetch(`http://${ipAddress}/status`, { 
        method: 'GET',
        timeout: 3000  // Timeout de 3 segundos
      } as RequestInit);
      return response.ok;
    } catch (error) {
      console.error('Error de conexión:', error);
      return false;
    }
  },
  
  // Aplicar un preset predefinido
  async applyPreset(ipAddress: string, preset: { name: string; angles: number[] }) {
    try {
      // Aplicar cada ángulo del preset a cada servo
      for (let i = 0; i < 6; i++) {
        const servoNum = i + 1;
        const angle = preset.angles[i];
        
        await this.moveServo(ipAddress, servoNum, angle);
        
        // Pequeña pausa entre cada movimiento
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return `Preset "${preset.name}" aplicado correctamente.`;
    } catch (error) {
      console.error('Error al aplicar preset:', error);
      throw error;
    }
  }
}; 