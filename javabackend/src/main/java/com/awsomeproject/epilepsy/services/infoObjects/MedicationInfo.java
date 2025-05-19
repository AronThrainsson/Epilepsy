package com.awsomeproject.epilepsy.services.infoObjects;

public class MedicationInfo {
    public Long id;
    public Long userId;
    public String name;
    public String dose;
    public String time; // Format: "HH:MM"
    public boolean enabled;
} 