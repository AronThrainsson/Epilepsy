import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { sendPushNotification } from './notificationService';
import * as SQLite from 'expo-sqlite';

const { HealthModule, WearableModule } = NativeModules;
const healthEmitter = new NativeEventEmitter(HealthModule);

// Open or create database
const db = SQLite.openDatabase('users.db');

// Internal function for saving seizure data to database
function saveSeizureToDB(
  epilepsyUserId,
  timestamp,
  duration,
  avgHeartRate,
  avgSpO2,
  avgMovement,
  indicatorsJson = '',
  note = ''
) {
  return new Promise((resolve, reject) => {
    db.transaction(
      tx => {
        tx.executeSql(
          `INSERT INTO seizures (
            epilepsy_user_id,
            timestamp,
            duration,
            avg_heart_rate,
            avg_spO2,
            avg_movement,
            indicators_json,
            note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            epilepsyUserId,
            timestamp,
            duration,
            avgHeartRate,
            avgSpO2,
            avgMovement,
            indicatorsJson,
            note
          ],
          (_, result) => {
            console.log('Seizure data saved successfully.');
            resolve(result);
          },
          (_, error) => {
            console.error('Failed to insert seizure data:', error);
            reject(error);
          }
        );
      },
      error => {
        console.error('Transaction error:', error);
        reject(error);
      },
      () => {
        console.log('Transaction completed successfully');
      }
    );
  });
}

class SeizureDetection {
  constructor() {
    this.isMonitoring = false;
    this.isEpilepticUser = false;
    this.userId = null;
    this.heartRateBuffer = [];
    this.spO2Buffer = [];
    this.movementBuffer = [];
    this.watchConnected = false;
    this.detectionStartTime = null;

    // Configurable thresholds (medical guidance required)
    this.thresholds = {
      heartRate: {
        suddenIncrease: 30,  // BPM increase in 10s
        sustainedHigh: 120   // BPM absolute
      },
      spO2: {
        drop: 4,             // % drop in 10s
        lowThreshold: 92     // % absolute
      },
      movement: {
        intensity: 12,       // Magnitude threshold
        rhythmicThreshold: 0.65 // Pattern correlation
      },
      overallThreshold: 0.75 // % indicators to trigger
    };
  }

  // ======================
  // 1. User Initialization
  // ======================
  async initialize(userId) {
    try {
      this.userId = userId; // Store for later use
      this.isEpilepticUser = await this._checkIfEpilepticUser(userId);

      if (this.isEpilepticUser) {
        await this._initWatchConnection();
        this.startMonitoring();
      }
    } catch (error) {
      console.error('Initialization error:', error);
      throw error;
    }
  }

  async _checkIfEpilepticUser(userId) {
    // Implement your actual user role check here
    return true; // Default for testing
  }

  // ======================
  // 2. Sensor Setup
  // ======================
  async _initWatchConnection() {
    if (Platform.OS !== 'android') return;

    try {
      await WearableModule.connect();
      this.watchConnected = true;

      new NativeEventEmitter(WearableModule).addListener(
        'WatchData',
        (data) => this._handleSensorData({
          heartRate: data.heartRate,
          spO2: data.spO2,
          ...data.acceleration
        })
      );
    } catch (error) {
      console.warn('Watch connection failed:', error);
      throw error;
    }
  }

  startMonitoring() {
    if (!this.isEpilepticUser || this.isMonitoring) return;

    this.isMonitoring = true;
    HealthModule.startMonitoring();

    // Phone sensor listeners
    healthEmitter.addListener('HeartRateData',
      (data) => this._handleSensorData({ heartRate: data.value }));

    healthEmitter.addListener('SpO2Data',
      (data) => this._handleSensorData({ spO2: data.value }));

    healthEmitter.addListener('MovementData',
      (data) => this._handleSensorData({ ...data }));

    // 10-second analysis loop
    this.detectionInterval = setInterval(() => {
      if (this._hasMinimumData()) this._analyzeData();
      this._cleanBuffers();
    }, 10000);
  }

  // ======================
  // 3. Data Processing
  // ======================
  _handleSensorData = ({ heartRate, spO2, x, y, z }) => {
    const timestamp = Date.now();

    // Validate sensor data ranges
    if (heartRate !== undefined && heartRate > 30 && heartRate < 250) {
      this.heartRateBuffer.push({ value: heartRate, timestamp });
    }

    if (spO2 !== undefined && spO2 >= 70 && spO2 <= 100) {
      this.spO2Buffer.push({ value: spO2, timestamp });
    }

    if (x !== undefined && y !== undefined && z !== undefined) {
      const magnitude = Math.sqrt(x**2 + y**2 + z**2);
      if (magnitude < 50) { // Filter out extreme movements
        this.movementBuffer.push({ x, y, z, magnitude, timestamp });
      }
    }
  };

  _hasMinimumData() {
    return (
      this.heartRateBuffer.length >= 5 &&
      this.spO2Buffer.length >= 3 && // SpO2 may update less frequently
      this.movementBuffer.length >= 10
    );
  }

  _cleanBuffers() {
    const cutoff = Date.now() - 15000; // Keep 15s window
    const clean = (buffer) => buffer.filter(item => item.timestamp >= cutoff);

    this.heartRateBuffer = clean(this.heartRateBuffer);
    this.spO2Buffer = clean(this.spO2Buffer);
    this.movementBuffer = clean(this.movementBuffer);
  }

  // ======================
  // 4. Seizure Detection
  // ======================
  _analyzeData() {
    const indicators = {
      highHeartRate: this._checkHighHeartRate(),
      suddenHeartRateIncrease: this._checkSuddenIncrease(),
      lowSpO2: this._checkLowSpO2(),
      spO2Drop: this._checkSpO2Drop(),
      highIntensityMovement: this._checkHighIntensityMovement(),
      rhythmicMovement: this._checkRhythmicMovement()
    };

    const confidence = this._calculateConfidence(indicators);
    if (confidence >= this.thresholds.overallThreshold) {
      if (!this.detectionStartTime) {
        this.detectionStartTime = Date.now();
      }
      this._triggerAlert(indicators, confidence);
    } else {
      this.detectionStartTime = null;
    }
  }

  _checkHighHeartRate() {
    const avg = this._calculateAverage(this.heartRateBuffer);
    return avg > this.thresholds.heartRate.sustainedHigh;
  }

  _checkSuddenIncrease() {
    if (this.heartRateBuffer.length < 2) return false;
    const [prev, current] = this.heartRateBuffer.slice(-2);
    return (current.value - prev.value) >= this.thresholds.heartRate.suddenIncrease;
  }

  _checkLowSpO2() {
    const avg = this._calculateAverage(this.spO2Buffer);
    return avg < this.thresholds.spO2.lowThreshold;
  }

  _checkSpO2Drop() {
    if (this.spO2Buffer.length < 2) return false;
    const [prev, current] = this.spO2Buffer.slice(-2);
    return (prev.value - current.value) >= this.thresholds.spO2.drop;
  }

  _checkHighIntensityMovement() {
    const avg = this._calculateAverage(this.movementBuffer.map(m => m.magnitude));
    return avg > this.thresholds.movement.intensity;
  }

  _checkRhythmicMovement() {
    // Simplified rhythmic detection - implement FFT for better accuracy
    const magnitudes = this.movementBuffer.map(m => m.magnitude);
    if (magnitudes.length < 5) return false;

    const changes = [];
    for (let i = 1; i < magnitudes.length; i++) {
      changes.push(Math.abs(magnitudes[i] - magnitudes[i-1]));
    }

    const consistency = changes.filter(c => c < 2).length / changes.length;
    return consistency > this.thresholds.movement.rhythmicThreshold;
  }

  _calculateConfidence(indicators) {
    return Object.values(indicators).filter(Boolean).length /
           Object.keys(indicators).length;
  }

  // ======================
  // 5. Alert Flow
  // ======================
  async _triggerAlert(indicators, confidence) {
    if (!this.userId) {
      console.error('No user ID set for seizure alert');
      return;
    }

    const timestamp = new Date().toISOString();
    const duration = this.detectionStartTime ?
      Math.round((Date.now() - this.detectionStartTime) / 1000) : 0;

    try {
      await saveSeizureToDB(
        this.userId,
        timestamp,
        duration,
        this._calculateAverage(this.heartRateBuffer),
        this._calculateAverage(this.spO2Buffer),
        this._calculateAverage(this.movementBuffer.map(m => m.magnitude)),
        JSON.stringify(indicators), // Store as string
        '' // No note by default
      );

      await sendPushNotification(
        'Seizure Detected',
        `Confidence: ${Math.round(confidence * 100)}% at ${new Date().toLocaleTimeString()}`
      );
    } catch (error) {
      console.error('Alert pipeline failed:', error);
      // Implement retry logic here if needed
    }
  }

  _calculateAverage(buffer) {
    if (!buffer.length) return 0;
    return buffer.reduce((sum, item) => sum + (item.value || item), 0) / buffer.length;
  }

  // ======================
  // 6. System Cleanup
  // ======================
  stopMonitoring() {
    if (!this.isMonitoring) return;

    clearInterval(this.detectionInterval);
    HealthModule.stopMonitoring();
    if (this.watchConnected) WearableModule.disconnect();

    this.isMonitoring = false;
    this.detectionStartTime = null;
  }
}

export default new SeizureDetection();