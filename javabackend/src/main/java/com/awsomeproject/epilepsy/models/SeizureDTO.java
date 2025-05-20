//A DTO class, DTO = Data Transfer Object  (to send without full entity)
//safely transfer seizure data between backend and frontend, without exposing user, relationship or sensitive fields
package com.awsomeproject.epilepsy.models;

//import Java's date-time class for timestamps
import java.time.LocalDateTime;

//simplified version of seizure used for data transfer
public class SeizureDTO { 
    //data fields included in API response
    private Long id;
    private double heartRate;
    private double spO2;
    private int movement;
    private LocalDateTime timestamp;
    private String note;

    //constructors to create a DTO with all fields
    public SeizureDTO(Long id, double heartRate, double spO2, int movement, LocalDateTime timestamp, String note) {
        this.id = id;
        this.heartRate = heartRate;
        this.spO2 = spO2;
        this.movement = movement;
        this.timestamp = timestamp;
        this.note = note;
    }

    //getter and setter for the seizure note/allows getting and updating the note field
    public String getNote() {
        return note;
    }
    public void setNote(String note) {
        this.note = note;
    }

    //read-only accessors for DTO fields
    public Long getId() { return id; }
    public double getHeartRate() { return heartRate; }
    public double getSpO2() { return spO2; }
    public int getMovement() { return movement; }
    public LocalDateTime getTimestamp() { return timestamp; }
}