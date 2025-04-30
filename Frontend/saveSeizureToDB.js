import { open } from 'react-native-sqlite-storage';

// Direkte default export
export default async function saveSeizureToDB(userId, timestamp, duration, heartRate, spO2, movement) {
  try {
    const db = await open({ name: 'seizures.db', location: 'default' });

    await db.transaction(async (tx) => {
      await tx.executeSql(
        'CREATE TABLE IF NOT EXISTS seizures (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, timestamp TEXT, duration INTEGER, heartRate REAL, spO2 REAL, movement REAL);'
      );

      await tx.executeSql(
        'INSERT INTO seizures (userId, timestamp, duration, heartRate, spO2, movement) VALUES (?, ?, ?, ?, ?, ?);',
        [userId, timestamp, duration, heartRate, spO2, movement]
      );
    });

    console.log('Anfald gemt i databasen.');
  } catch (error) {
    console.error('Fejl ved gemning i databasen:', error);
  }
}
