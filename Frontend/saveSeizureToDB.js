import * as SQLite from 'expo-sqlite';

// Open or create database
const db = SQLite.openDatabase('seizures.db');

export default function saveSeizureToDB(userId, timestamp, duration, heartRate, spO2, movement) {
  return new Promise((resolve, reject) => {
    db.transaction(
      tx => {
        // Create table if not exists
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS seizures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            timestamp TEXT,
            duration INTEGER,
            heartRate REAL,
            spO2 REAL,
            movement REAL
          );`,
          [],
          () => {
            // Insert seizure data
            tx.executeSql(
              `INSERT INTO seizures
               (userId, timestamp, duration, heartRate, spO2, movement)
               VALUES (?, ?, ?, ?, ?, ?);`,
              [userId, timestamp, duration, heartRate, spO2, movement],
              (_, result) => {
                console.log('Anfald gemt i databasen.');
                resolve(result);
              },
              (_, error) => {
                console.error('Fejl ved gemning i databasen:', error);
                reject(error);
              }
            );
          },
          (_, error) => {
            console.error('Fejl ved oprettelse af tabel:', error);
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