package com.awsomeproject.epilepsy.controller;

import com.awsomeproject.epilepsy.models.Role;
import com.awsomeproject.epilepsy.models.User;
import com.awsomeproject.epilepsy.models.UserSupportRelation;
import com.awsomeproject.epilepsy.repository.SeizureRepository;
import com.awsomeproject.epilepsy.repository.UserRepository;
import com.awsomeproject.epilepsy.repository.UserSupportRelationRepository;
import com.awsomeproject.epilepsy.services.NotificationService;
import com.awsomeproject.epilepsy.models.Seizure;
import com.awsomeproject.epilepsy.models.SeizureDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.time.LocalDateTime;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class NotificationController {

    private final UserRepository userRepository;
    private final UserSupportRelationRepository relationRepository;
    private final NotificationService notificationService;
    private final SeizureRepository seizureRepository;

    public NotificationController(
            UserRepository userRepository,
            UserSupportRelationRepository relationRepository,
            NotificationService notificationService,
            SeizureRepository seizureRepository
    ) {
        this.userRepository = userRepository;
        this.relationRepository = relationRepository;
        this.notificationService = notificationService;
        this.seizureRepository = seizureRepository;
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

            relation.setId(UUID.randomUUID().toString());

            relationRepository.save(relation);
        }

        return ResponseEntity.ok("Support user added");
    }

    // Trigger seizure notification to selected support users only
    @PostMapping("/seizure")
public ResponseEntity<?> sendSeizureAlert(@RequestBody Map<String, Object> request) {
    String epilepsyEmail = (String) request.get("epilepsyUserEmail");
    Double latitude = request.get("latitude") != null ? ((Number) request.get("latitude")).doubleValue() : null;
    Double longitude = request.get("longitude") != null ? ((Number) request.get("longitude")).doubleValue() : null;
    Double heartRate = request.get("heartRate") != null ? ((Number) request.get("heartRate")).doubleValue() : null;
    Double spO2 = request.get("spO2") != null ? ((Number) request.get("spO2")).doubleValue() : null;
    Integer movement = request.get("movement") != null ? ((Number) request.get("movement")).intValue() : null;

    User epilepsyUser = userRepository.findByEmail(epilepsyEmail).orElseThrow();
    List<UserSupportRelation> relations = relationRepository.findByEpilepsyUser(epilepsyUser);

    // Save seizure if health data is provided
    if (heartRate != null && spO2 != null && movement != null) {
        Seizure seizure = new Seizure();
        seizure.setEpilepsyUser(epilepsyUser);
        seizure.setHeartRate(heartRate);
        seizure.setSpO2(spO2);
        seizure.setMovement(movement);
        seizure.setTimestamp(LocalDateTime.now());
        seizureRepository.save(seizure);
    }

    // Notify support users
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

    return ResponseEntity.ok("Seizure logged and notification sent");
}

    // GET seizures for a given epilepsy user by email
    @GetMapping("/seizures")
    public ResponseEntity<List<SeizureDTO>> getSeizures(
            @RequestParam(required = false) String epilepsyUserEmail,
            @RequestParam(required = false) String supportUserEmail) {

        List<Seizure> seizures = new ArrayList<>();

        if (epilepsyUserEmail != null) {
            User user = userRepository.findByEmail(epilepsyUserEmail)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Epilepsy user not found"));
            seizures = seizureRepository.findByEpilepsyUser(user);
        } else if (supportUserEmail != null) {
            User supportUser = userRepository.findByEmail(supportUserEmail)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Support user not found"));

            List<UserSupportRelation> relations = relationRepository.findBySupportUser(supportUser);
            for (UserSupportRelation relation : relations) {
                seizures.addAll(seizureRepository.findByEpilepsyUser(relation.getEpilepsyUser()));
            }
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email parameter is required");
        }

        List<SeizureDTO> seizureDTOs = seizures.stream()
                .map(s -> new SeizureDTO(s.getId(), s.getHeartRate(), s.getSpO2(), s.getMovement(), s.getTimestamp(), s.getNote()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(seizureDTOs);
    }

    //to be able to update the notes in seizures
    @PatchMapping("/seizures/{id}/note")
    public ResponseEntity<?> updateSeizureNote(@PathVariable Long id, @RequestBody Map<String, String> request) {
        String newNote = request.get("note");
        Seizure seizure = seizureRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Seizure not found"));

        seizure.setNote(newNote);
        seizureRepository.save(seizure);

        return ResponseEntity.ok("Note updated");
    }

}