package com.awsomeproject.epilepsy.services;

import com.awsomeproject.epilepsy.models.Medication;
import com.awsomeproject.epilepsy.models.User;
import com.awsomeproject.epilepsy.repository.MedicationRepository;
import com.awsomeproject.epilepsy.repository.UserRepository;
import com.awsomeproject.epilepsy.services.infoObjects.MedicationInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.logging.Logger;

@Service
public class MedicationService {

    private static final Logger logger = Logger.getLogger(MedicationService.class.getName());
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    @Autowired
    private MedicationRepository medicationRepository;

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private MedicationNotificationService notificationService;

    public List<MedicationInfo> getUserMedications(Long userId) {
        Optional<User> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            return new ArrayList<>();
        }

        List<Medication> medications = medicationRepository.findByUser(userOptional.get());
        List<MedicationInfo> medicationInfos = new ArrayList<>();

        for (Medication medication : medications) {
            MedicationInfo info = new MedicationInfo();
            info.id = medication.getId();
            info.userId = userId;
            info.name = medication.getName();
            info.dose = medication.getDose();
            info.time = medication.getTime().format(TIME_FORMATTER);
            info.enabled = medication.isEnabled();
            medicationInfos.add(info);
        }

        return medicationInfos;
    }

    public MedicationInfo saveMedication(MedicationInfo medicationInfo) {
        Optional<User> userOptional = userRepository.findById(medicationInfo.userId);
        if (userOptional.isEmpty()) {
            return null;
        }

        User user = userOptional.get();
        Medication medication;
        boolean isNewMedication = false;

        if (medicationInfo.id != null) {
            // Update existing medication
            Optional<Medication> existingMedication = medicationRepository.findById(medicationInfo.id);
            if (existingMedication.isEmpty() || !existingMedication.get().getUser().getId().equals(user.getId())) {
                return null;
            }
            medication = existingMedication.get();
        } else {
            // Create new medication
            medication = new Medication();
            medication.setUser(user);
            isNewMedication = true;
        }

        // Update medication fields
        medication.setName(medicationInfo.name);
        medication.setDose(medicationInfo.dose);
        medication.setTime(LocalTime.parse(medicationInfo.time, TIME_FORMATTER));
        medication.setEnabled(medicationInfo.enabled);

        // Save to database
        medication = medicationRepository.save(medication);

        // If it's a new medication, send notification
        if (isNewMedication) {
            try {
                notificationService.sendMedicationAddedNotification(medication);
                logger.info("Sent notification for new medication: " + medication.getName());
            } catch (Exception e) {
                logger.warning("Failed to send notification for new medication: " + e.getMessage());
                // Don't fail the operation if notification fails
            }
        }

        // Return updated info
        medicationInfo.id = medication.getId();
        return medicationInfo;
    }

    @Transactional
    public boolean deleteMedication(Long userId, Long medicationId) {
        Optional<User> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            return false;
        }

        Optional<Medication> medicationOptional = medicationRepository.findById(medicationId);
        if (medicationOptional.isEmpty() || !medicationOptional.get().getUser().getId().equals(userId)) {
            return false;
        }

        medicationRepository.deleteByUserAndId(userOptional.get(), medicationId);
        return true;
    }
} 