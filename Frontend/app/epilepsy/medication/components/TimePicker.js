import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';

const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
const ITEM_HEIGHT = 50;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function TimePicker({ selectedTime, onTimeChange }) {
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (selectedTime && scrollViewRef.current) {
      const initialIndex = hours.indexOf(selectedTime);
      const y = Math.max(0, initialIndex * ITEM_HEIGHT - SCREEN_HEIGHT * 0.25);
      setTimeout(() => scrollViewRef.current?.scrollTo({ y, animated: false }), 50);
    }
  }, [selectedTime]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.timeList}
        showsVerticalScrollIndicator={true}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
      >
        {hours.map((hour) => (
          <TouchableOpacity
            key={hour}
            style={[styles.timeOption, selectedTime === hour && styles.selectedTime]}
            onPress={() => onTimeChange(hour)}
          >
            <Text style={[styles.timeText, selectedTime === hour && styles.selectedTimeText]}>
              {hour}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: SCREEN_HEIGHT * 0.4, marginBottom: 20 },
  timeList: { flexGrow: 0 },
  timeOption: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  selectedTime: { backgroundColor: '#e3f2fd' },
  timeText: { fontSize: 18, color: '#333' },
  selectedTimeText: { fontWeight: '600', color: '#007AFF' },
});
