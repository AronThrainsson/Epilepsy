package com.awsomeproject.epilepsy.controller;

import com.awsomeproject.epilepsy.models.Role;
import com.awsomeproject.epilepsy.models.User;
import com.awsomeproject.epilepsy.repository.UserRepository;
import com.awsomeproject.epilepsy.services.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class NotificationController {

    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public NotificationController(UserRepository userRepository, NotificationService notificationService) {
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    // Store push token from frontend
    @PostMapping("/user/push-token")
    public ResponseEntity<?> savePushToken(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String token = request.get("pushToken");

        User user = userRepository.findByEmail(email).orElseThrow();
        user.setPushToken(token);
        userRepository.save(user);

        return ResponseEntity.ok("Push token saved");
    }

    // Trigger seizure notification to all SUPPORT users
    @PostMapping("/seizure")
    public ResponseEntity<?> sendSeizureAlert() {
        List<User> supportUsers = userRepository.findByRole(Role.SUPPORT);

        for (User user : supportUsers) {
            if (user.getPushToken() != null) {
                notificationService.sendPushNotification(user.getPushToken(), "Seizure Alert!", "A patient might need help.");
            }
        }

        return ResponseEntity.ok("Seizure notification sent");
    }
}