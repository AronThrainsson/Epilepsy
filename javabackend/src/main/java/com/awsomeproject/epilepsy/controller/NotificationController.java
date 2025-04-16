package com.awsomeproject.epilepsy.controller;

import com.awsomeproject.epilepsy.models.Role;
import com.awsomeproject.epilepsy.models.User;
import com.awsomeproject.epilepsy.models.UserSupportRelation;
import com.awsomeproject.epilepsy.repository.UserRepository;
import com.awsomeproject.epilepsy.repository.UserSupportRelationRepository;
import com.awsomeproject.epilepsy.services.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class NotificationController {

    private final UserRepository userRepository;
    private final UserSupportRelationRepository relationRepository;
    private final NotificationService notificationService;

    public NotificationController(
            UserRepository userRepository,
            UserSupportRelationRepository relationRepository,
            NotificationService notificationService
    ) {
        this.userRepository = userRepository;
        this.relationRepository = relationRepository;
        this.notificationService = notificationService;
    }

    // Get all support users (for search in frontend)
    @GetMapping("/support-users")
    public List<User> getSupportUsers() {
        return userRepository.findByRole(Role.SUPPORT);
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

    // Link support user to epilepsy user (avoid duplicates)
    @PostMapping("/user/add-support")
    public ResponseEntity<?> addSupportUser(@RequestBody Map<String, String> request) {
        String epilepsyEmail = request.get("epilepsyUserEmail");
        String supportEmail = request.get("supportUserEmail");

        User epilepsyUser = userRepository.findByEmail(epilepsyEmail).orElseThrow();
        User supportUser = userRepository.findByEmail(supportEmail).orElseThrow();

        // Check if relation already exists
        boolean exists = relationRepository.existsByEpilepsyUserAndSupportUser(epilepsyUser, supportUser);
        if (!exists) {
            UserSupportRelation relation = new UserSupportRelation(epilepsyUser, supportUser);
            relationRepository.save(relation);
        }

        return ResponseEntity.ok("Support user added");
    }

    // Trigger seizure notification to selected support users only
    @PostMapping("/seizure")
    public ResponseEntity<?> sendSeizureAlert(@RequestBody Map<String, String> request) {
        String epilepsyEmail = request.get("epilepsyUserEmail");

        User epilepsyUser = userRepository.findByEmail(epilepsyEmail).orElseThrow();
        List<UserSupportRelation> relations = relationRepository.findByEpilepsyUser(epilepsyUser);

        for (UserSupportRelation relation : relations) {
            User supportUser = relation.getSupportUser();
            if (supportUser.getPushToken() != null) {
                notificationService.sendPushNotification(
                        supportUser.getPushToken(),
                        "Seizure Alert!",
                        epilepsyUser.getFirstName() + " might need help!"
                );
            }
        }

        return ResponseEntity.ok("Seizure notification sent");
    }
}