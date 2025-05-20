//java model class called seizure, represents seizure entry in the database 
//define package location for the seizure model
package com.awsomeproject.epilepsy.models;

import jakarta.persistence.*; //import annotations to connect class to database
import java.time.LocalDateTime; //for handling data and time of seizure

//defines seizure as a database table: each instance will be a row in the seizure table
@Entity
public class Seizure {
    //unique ID for each seizure (auto-generated)
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
    //seizure vital stats and timestamp/core values measured during seizure
    private double heartRate;
    private double spO2;
    private int movement;
    private LocalDateTime timestamp;
    
    //user-written note as long text 
    @Column(columnDefinition = "TEXT")
    private String note;

    //create relationship with user/each seizure belongs to one user, "ManyToOne" = user can have multiple seizures
    @ManyToOne
    @JoinColumn(name = "epilepsy_user_id", nullable = false)
    private User epilepsyUser;

    //default constructors (needed by Java/JPA to create blank object)
    public Seizure() {
    }
    //constructor to create a seizure with all values set
    public Seizure(User epilepsyUser, double heartRate, double spO2, int movement, LocalDateTime timestamp, String note) {
        this.epilepsyUser = epilepsyUser;
        this.heartRate = heartRate;
        this.spO2 = spO2;
        this.movement = movement;
        this.timestamp = timestamp;
        this.note = note;
    }

    // Getters and Setters for seizure fields
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

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}