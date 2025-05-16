package com.awsomeproject.epilepsy.models;

import jakarta.persistence.*;
import java.time.LocalTime;

@Entity
@Table(name = "medications")
public class Medication {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private String name;
    private String dose;
    private LocalTime time;
    private boolean enabled;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Constructors
    public Medication() {
    }

    public Medication(String name, String dose, LocalTime time, boolean enabled, User user) {
        this.name = name;
        this.dose = dose;
        this.time = time;
        this.enabled = enabled;
        this.user = user;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDose() {
        return dose;
    }

    public void setDose(String dose) {
        this.dose = dose;
    }

    public LocalTime getTime() {
        return time;
    }

    public void setTime(LocalTime time) {
        this.time = time;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
} 