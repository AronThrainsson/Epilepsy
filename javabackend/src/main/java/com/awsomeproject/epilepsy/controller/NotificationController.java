package com.awsomeproject.epilepsy.controller;

import com.awsomeproject.epilepsy.models.Role;
import com.awsomeproject.epilepsy.models.User;
import com.awsomeproject.epilepsy.models.UserSupportRelation;
import com.awsomeproject.epilepsy.repository.UserRepository;
import com.awsomeproject.epilepsy.repository.UserSupportRelationRepository;
import com.awsomeproject.epilepsy.services.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

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

    @GetMapping("/support-users")
    public List<User> getSupportUsers() {
        return userRepository.findByRole(Role.SUPPORT);
    }

    @PostMapping("/user/push-token")
    public ResponseEntity<?> savePushToken(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String token = request.get("pushToken");

        User user = userRepository.findByEmail(email).orElseThrow();
        user.setPushToken(token);
        userRepository.save(user);

        return ResponseEntity.ok("Push token saved");
    }

    @PostMapping("/user/add-support")
    public ResponseEntity<?> addSupportUser(@RequestBody Map<String, String> request) {
        String epilepsyEmail = request.get("epilepsyUserEmail");
        String supportEmail = request.get("supportUserEmail");

        User epilepsyUser = userRepository.findByEmail(epilepsyEmail).orElseThrow();
        User supportUser = userRepository.findByEmail(supportEmail).orElseThrow();

        boolean exists = relationRepository.existsByEpilepsyUserAndSupportUser(epilepsyUser, supportUser);
        if (!exists) {
            UserSupportRelation relation = new UserSupportRelation(epilepsyUser, supportUser);
            relation.setId(UUID.randomUUID().toString());
            relationRepository.save(relation);
        }

        return ResponseEntity.ok("Support user added");
    }

    @PostMapping("/seizure")
    public ResponseEntity<?> sendSeizureAlert(@RequestBody Map<String, Object> request) {
        String epilepsyEmail = (String) request.get("epilepsyUserEmail");
        Double latitude = request.get("latitude") != null ? ((Number) request.get("latitude")).doubleValue() : null;
        Double longitude = request.get("longitude") != null ? ((Number) request.get("longitude")).doubleValue() : null;

        User epilepsyUser = userRepository.findByEmail(epilepsyEmail).orElseThrow();
        List<UserSupportRelation> relations = relationRepository.findByEpilepsyUser(epilepsyUser);

        for (UserSupportRelation relation : relations) {
            User supportUser = relation.getSupportUser();
            if (supportUser.getPushToken() != null) {
                String title = "Seizure Alert!";
                String body = epilepsyUser.getFirstName() + " might need help!";
                Map<String, String> data = new HashMap<>();

                data.put("navigateTo", "gps");
                if (latitude != null && longitude != null) {
                    data.put("latitude", String.valueOf(latitude));
                    data.put("longitude", String.valueOf(longitude));
                }

                notificationService.sendPushNotification(
                        supportUser.getPushToken(),
                        title,
                        body,
                        data
                );
            }
        }

        return ResponseEntity.ok("Seizure notification sent");
    }
}