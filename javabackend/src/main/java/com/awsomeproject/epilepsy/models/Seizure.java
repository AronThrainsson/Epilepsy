package com.awsomeproject.epilepsy.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Seizure {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private double heartRate;
    private double spO2;
    private int movement;
    private LocalDateTime timestamp;

    @ManyToOne
    @JoinColumn(name = "epilepsy_user_id", nullable = false)
    private User epilepsyUser;

    // Constructors
    public Seizure() {
    }

    public Seizure(User epilepsyUser, double heartRate, double spO2, int movement, LocalDateTime timestamp) {
        this.epilepsyUser = epilepsyUser;
        this.heartRate = heartRate;
        this.spO2 = spO2;
        this.movement = movement;
        this.timestamp = timestamp;
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public double getHeartRate() {
        return heartRate;
    }

    public void setHeartRate(double heartRate) {
        this.heartRate = heartRate;
    }

    public double getSpO2() {
        return spO2;
    }

    public void setSpO2(double spO2) {
        this.spO2 = spO2;
    }

    public int getMovement() {
        return movement;
    }

    public void setMovement(int movement) {
        this.movement = movement;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public User getEpilepsyUser() {
        return epilepsyUser;
    }

    public void setEpilepsyUser(User epilepsyUser) {
        this.epilepsyUser = epilepsyUser;
    }
}