import { NativeModules, NativeEventEmitter } from 'react-native';
import { sendPushNotification } from './notificationService';
import SQLite from 'react-native-sqlite-storage';
import { Platform } from 'react-native';
import { saveSeizureToDB } from '../../saveSeizureToDB';



const { HealthModule } = NativeModules;
const healthEmitter = new NativeEventEmitter(HealthModule);

class SeizureDetection {
    constructor() {
        this.isMonitoring = false;
        this.heartRateBuffer = [];
        this.spO2Buffer = [];
        this.movementBuffer = [];

        this.thresholds = {
            heartRate: {
                suddenIncrease: 30,
                sustainedHigh: 120
            },
            spO2: {
                drop: 4,
                lowThreshold: 92
            },
            movement: {
                intensity: 12,
                rhythmicThreshold: 0.65
            },
            overallThreshold: 0.75
        };
    }

    startMonitoring() {
        if (this.isMonitoring) {
            console.log('Already monitoring');
            return;
        }

        this.isMonitoring = true;
        HealthModule.startMonitoring();

        this.heartRateSubscription = healthEmitter.addListener(
            'HeartRateData',
            this.handleHeartRateData.bind(this)
        );

        this.spO2Subscription = healthEmitter.addListener(
            'SpO2Data',
            this.handleSpO2Data.bind(this)
        );

        this.movementSubscription = healthEmitter.addListener(
            'MovementData',
            this.handleMovementData.bind(this)
        );

        this.detectionInterval = setInterval(() => {
            this.checkForSeizure();
        }, 10000);

        console.log('Monitoring started');
    }

    stopMonitoring() {
        if (!this.isMonitoring) return;

        HealthModule.stopMonitoring();

        if (this.heartRateSubscription) this.heartRateSubscription.remove();
        if (this.spO2Subscription) this.spO2Subscription.remove();
        if (this.movementSubscription) this.movementSubscription.remove();

        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
        }

        this.isMonitoring = false;
        console.log('Monitoring stopped');
    }

    handleHeartRateData = (data) => {
        this.heartRateBuffer.push({
            value: data.heartRate,
            timestamp: new Date().getTime()
        });
        this.cleanBuffer(this.heartRateBuffer);
    }

    handleSpO2Data = (data) => {
        this.spO2Buffer.push({
            value: data.spO2,
            timestamp: new Date().getTime(),
        });
        this.cleanBuffer(this.spO2Buffer);
    }

    handleMovementData = (data) => {
        const magnitude = Math.sqrt(
            Math.pow(data.x, 2) +
            Math.pow(data.y, 2) +
            Math.pow(data.z, 2)
        );

        this.movementBuffer.push({
            x: data.x,
            y: data.y,
            z: data.z,
            magnitude: magnitude,
            timestamp: new Date().getTime()
        });
        this.cleanBuffer(this.movementBuffer);
    }

    cleanBuffer(buffer) {
        const now = new Date().getTime();
        const tenSecondsAgo = now - 10000;

        while (buffer.length > 0 && buffer[0].timestamp < tenSecondsAgo) {
            buffer.shift();
        }
    }

    calculateAverage(buffer) {
        if (buffer.length === 0) return 0;
        const sum = buffer.reduce((acc, curr) => acc + curr.value, 0);
        return sum / buffer.length;
    }

    calculateCorrelation(movementMagnitude) {
        // Simplified correlation calculation
        if (movementMagnitude.length < 2) return 0;
        return 0.7; // Placeholder value
    }

    checkForSeizure() {
        if (this.heartRateBuffer.length < 5 || this.spO2Buffer.length < 5 || this.movementBuffer.length < 5) {
            console.log('Not enough data to detect seizure');
            return;
        }

        let seizureIndicators = {
            highHeartRate: false,
            SuddenHeartRateIncrease: false,
            lowSpO2: false,
            spO2Drop: false,
            rhythmicMovement: false,
            highIntensityMovement: false
        };

        // Check heart rate for sudden increase
        if (this.heartRateBuffer.length >= 2) {
            const last = this.heartRateBuffer[this.heartRateBuffer.length - 1].value;
            const prev = this.heartRateBuffer[this.heartRateBuffer.length - 2].value;
            if (last - prev >= this.thresholds.heartRate.suddenIncrease) {
                seizureIndicators.SuddenHeartRateIncrease = true;
            }
        }

        // Check for sustained high heart rate
        const avgHeartRate = this.calculateAverage(this.heartRateBuffer);
        if (avgHeartRate > this.thresholds.heartRate.sustainedHigh) {
            seizureIndicators.highHeartRate = true;
        }

        // Check SpO2 for sudden drop
        if (this.spO2Buffer.length >= 2) {
            const last = this.spO2Buffer[this.spO2Buffer.length - 1].value;
            const prev = this.spO2Buffer[this.spO2Buffer.length - 2].value;
            if (prev - last >= this.thresholds.spO2.drop) {
                seizureIndicators.spO2Drop = true;
            }
        }

        // Check for low SpO2
        const avgSpO2 = this.calculateAverage(this.spO2Buffer);
        if (avgSpO2 < this.thresholds.spO2.lowThreshold) {
            seizureIndicators.lowSpO2 = true;
        }

        // Check movement intensity
        const movementMagnitudes = this.movementBuffer.map(m => m.magnitude);
        const avgMovement = this.calculateAverage(movementMagnitudes);
        if (avgMovement > this.thresholds.movement.intensity) {
            seizureIndicators.highIntensityMovement = true;
        }

        // Check for rhythmic movement (simplified)
        const correlation = this.calculateCorrelation(movementMagnitudes);
        if (correlation > this.thresholds.movement.rhythmicThreshold) {
            seizureIndicators.rhythmicMovement = true;
        }

        // Count positive indicators
        const positiveIndicators = Object.values(seizureIndicators).filter(Boolean).length;
        const totalIndicators = Object.keys(seizureIndicators).length;
        const confidence = positiveIndicators / totalIndicators;

        if (confidence >= this.thresholds.overallThreshold) {
            console.log('Seizure detected:', seizureIndicators);
            sendPushNotification('Seizure Detected', 'A seizure has been detected based on your health data.');

            // Save to database
            saveSeizureToDB(
                1, // userID (hardcoded)
                new Date().toISOString(), // timestamp
                0, // duration (placeholder)
                avgHeartRate,
                avgSpO2,
                avgMovement,
                seizureIndicators
            ).catch(error => console.log('DB save error:', error));
        }
    }
}

export default new SeizureDetection();