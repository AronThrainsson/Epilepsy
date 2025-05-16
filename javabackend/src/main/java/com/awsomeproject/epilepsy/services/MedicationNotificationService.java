package com.awsomeproject.epilepsy.services;

import com.awsomeproject.epilepsy.models.Medication;
import com.awsomeproject.epilepsy.models.User;
import com.awsomeproject.epilepsy.repository.MedicationRepository;
import com.awsomeproject.epilepsy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.logging.Logger;

@Service
public class MedicationNotificationService {

    private static final Logger logger = Logger.getLogger(MedicationNotificationService.class.getName());
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    @Autowired
    private MedicationRepository medicationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    /**
     * Sends a one-time notification when a medication is added
     */
    public boolean sendMedicationAddedNotification(Medication medication) {
        if (medication == null) {
            logger.warning("Cannot send notification: Medication is null");
            return false;
        }
        
        User user = medication.getUser();
        if (user == null) {
            logger.warning("Cannot send notification: User is null");
            return false;
        }
        
        // Only send if user has push token
        if (user.getPushToken() == null || user.getPushToken().isEmpty()) {
            logger.warning("Cannot send notification: User has no push token: " + user.getEmail());
            return false;
        }
        
        String message = String.format("Medication added: %s %s at %s", 
                medication.getName(), medication.getDose(), medication.getTime().format(TIME_FORMATTER));
        
        logger.info("Sending medication added notification to user: " + user.getEmail() + 
                " for medication: " + medication.getName());
        
        return notificationService.sendNotificationToUser(
                user.getId(), 
                "Medication Added", 
                message);
    }
} 