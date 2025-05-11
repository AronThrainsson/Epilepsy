package com.awsomeproject.epilepsy.models;
// SeizureDTO.java

import java.time.LocalDateTime;

public class SeizureDTO {
    private Long id;
    private double heartRate;
    private double spO2;
    private int movement;
    private LocalDateTime timestamp;

    public SeizureDTO(Long id, double heartRate, double spO2, int movement, LocalDateTime timestamp) {
        this.id = id;
        this.heartRate = heartRate;
        this.spO2 = spO2;
        this.movement = movement;
        this.timestamp = timestamp;
    }

    // Getters
    public Long getId() { return id; }
    public double getHeartRate() { return heartRate; }
    public double getSpO2() { return spO2; }
    public int getMovement() { return movement; }
    public LocalDateTime getTimestamp() { return timestamp; }
}