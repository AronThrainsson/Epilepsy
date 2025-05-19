package com.awsomeproject.epilepsy.controller;

import com.awsomeproject.epilepsy.services.MedicationService;
import com.awsomeproject.epilepsy.services.infoObjects.MedicationInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medications")
public class MedicationController {

    @Autowired
    private MedicationService medicationService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<MedicationInfo>> getUserMedications(@PathVariable Long userId) {
        List<MedicationInfo> medications = medicationService.getUserMedications(userId);
        return ResponseEntity.ok(medications);
    }

    @PostMapping("/save")
    public ResponseEntity<MedicationInfo> saveMedication(@RequestBody MedicationInfo medicationInfo) {
        MedicationInfo savedMedication = medicationService.saveMedication(medicationInfo);
        if (savedMedication == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(savedMedication);
    }

    @DeleteMapping("/delete/{userId}/{medicationId}")
    public ResponseEntity<Void> deleteMedication(
            @PathVariable Long userId,
            @PathVariable Long medicationId) {
        boolean deleted = medicationService.deleteMedication(userId, medicationId);
        if (!deleted) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok().build();
    }
} 