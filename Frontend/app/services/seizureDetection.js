import { sendPushNotification } from './notificationService';

// ===== EXPO-COMPATIBLE SQLITE SETUP ===== //
let db;
try {
  const SQLite = require('expo-sqlite').default;
  db = SQLite.openDatabase('users.db');
  console.log('✅ SQLite database initialized');
} catch (error) {
  console.log('❌ SQLite not available, using mock database');
  db = {
    transaction: (callback) => {
      callback({
        executeSql: (sql, args, success, error) => {
          console.log(`[MOCK DB] Executing: ${sql}`);
          if (success) success({}, { rows: { _array: [], length: 0, item: () => null } });
        }
      });
    }
  };
}

const saveSeizureToDB = (
  userID,
  timestamp,
  avgHeartRate,
  avgSpO2,
  movementIntensity,
  note = null
) => {
  return new Promise((resolve) => {
    db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS seizure (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          heart_rate FLOAT NOT NULL,
          movement TEXT NOT NULL,
          spo2 FLOAT NOT NULL,
          timestamp TIMESTAMP,
          epilepsy_user_id BIGINT NOT NULL,
          note TEXT
        );`,
        [],
        () => {
          tx.executeSql(
            `INSERT INTO seizure (
              heart_rate,
              movement,
              spo2,
              timestamp,
              epilepsy_user_id,
              note
            ) VALUES (?, ?, ?, ?, ?, ?);`,
            [
              avgHeartRate,
              movementIntensity,
              avgSpO2,
              timestamp,
              userID,
              note || `Seizure detected with HR: ${avgHeartRate.toFixed(1)}, SpO2: ${avgSpO2.toFixed(1)}, Movement: ${movementIntensity}`
            ],
            (_, result) => {
              console.log('✅ Seizure saved to DB with ID:', result.insertId);
              resolve(result);
            },
            (_, error) => {
              console.log('❌ DB Error:', error);
              resolve(null);
            }
          );
        },
        (_, error) => {
          console.log('❌ DB Creation Error:', error);
          resolve(null);
        }
      );
    });
  });
};

class SeizureDetection {
  constructor() {
    this.isMonitoring = false;
    this.heartRateBuffer = [];
    this.spO2Buffer = [];
    this.movementBuffer = [];
    this.seizureDetected = false;
    this.notificationSent = false; // Track if notification was sent
    this.notificationLock = false; // Lock for notification sending
    this.resetTimeout = null; // Timeout for resetting detection state
    this.currentUser = {
      id: 1, // Default user ID
      email: "default@user.com",
      latitude: 55.4038,
      longitude: 10.4024
    };
  }

  setUserData(email, latitude, longitude, id = 1) {
    this.currentUser.email = email || "default@user.com";
    this.currentUser.latitude = latitude || 55.4038;
    this.currentUser.longitude = longitude || 10.4024;
    this.currentUser.id = id || 1;
    console.log('✅ User data updated:', this.currentUser);
  }

  async checkForSeizure() {
    // Return immediately if notification already sent or we're in the process of sending one
    if (this.notificationSent || this.notificationLock) {
      return;
    }

    if (this.heartRateBuffer.length < 5 || this.spO2Buffer.length < 5 || this.movementBuffer.length < 5) {
      console.log('⚠️ Not enough data to detect seizure');
      return;
    }

    const avgHeartRate = this.calculateAverage(this.heartRateBuffer);
    const avgSpO2 = this.calculateAverage(this.spO2Buffer);
    const movementIntensity = this.calculateMovementIntensity(this.movementBuffer);

    const seizureDetected = avgHeartRate > 120 || avgSpO2 < 92 || movementIntensity === 'HIGH';

    if (seizureDetected && !this.seizureDetected && !this.notificationSent) {
      // Lock notification sending to prevent race conditions
      this.notificationLock = true;
      this.seizureDetected = true;

      console.log('🚨 Seizure detected, logging to database...');

      const timestamp = new Date().toISOString();
      const note = `Seizure detected with HR: ${avgHeartRate.toFixed(1)}, SpO2: ${avgSpO2.toFixed(1)}, Movement: ${movementIntensity}`;

      try {
        await saveSeizureToDB(
          this.currentUser.id,
          timestamp,
          avgHeartRate,
          avgSpO2,
          movementIntensity,
          note
        );

        // Only mark as sent to prevent further database entries
        if (!this.notificationSent) {
          this.notificationSent = true;
          // TO RE-ENABLE NOTIFICATIONS IN THE FUTURE, UNCOMMENT THE LINE BELOW:
          // await sendPushNotification('Seizure Alert', 'A seizure has been detected. Alert sent to mates.');
          console.log('✅ Notification sending is currently disabled');
        }
      } catch (error) {
        console.error('❌ Error processing seizure:', error);
      } finally {
        this.notificationLock = false;
      }

      // Clear any existing timeout
      if (this.resetTimeout) {
        clearTimeout(this.resetTimeout);
      }

      // Set a new timeout to reset detection state
      this.resetTimeout = setTimeout(() => {
        console.log('✅ Resetting seizure detection state');
        this.seizureDetected = false;
        this.notificationSent = false;
      }, 30000); // 30 seconds cooldown before allowing new notifications
    }
  }

  calculateAverage(buffer) {
    if (!buffer || buffer.length === 0) return 0;
    const sum = buffer.reduce((acc, curr) => acc + curr, 0);
    return sum / buffer.length;
  }

  calculateMovementIntensity(buffer) {
    if (!buffer || buffer.length === 0) return 'LOW';

    const magnitudes = buffer.map(({ x, y, z }) => Math.sqrt(x * x + y * y + z * z));
    const avgMagnitude = magnitudes.reduce((acc, curr) => acc + curr, 0) / magnitudes.length;

    if (avgMagnitude > 15) {
      return 'HIGH';
    } else if (avgMagnitude > 8) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }
}

const seizureDetection = new SeizureDetection();

export default seizureDetection;