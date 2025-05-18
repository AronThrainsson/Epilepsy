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
    public List<Map<String, Object>> getSupportUsers() {
        System.out.println("Fetching all support users");
        List<User> supportUsers = userRepository.findByRole(Role.SUPPORT);
        System.out.println("Found " + supportUsers.size() + " support users");
        
        List<Map<String, Object>> result = supportUsers.stream()
            .map(user -> {
                Map<String, Object> userInfo = new HashMap<>();
                userInfo.put("firstName", user.getFirstName());
                userInfo.put("surname", user.getSurname());
                userInfo.put("email", user.getEmail());
                userInfo.put("isAvailable", user.getIsAvailable());
                return userInfo;
            })
            .collect(Collectors.toList());
        
        System.out.println("Returning support users: " + result);
        return result;
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
        
        // If relation exists and we're calling this endpoint again, it means we want to remove it
        if (exists) {
            relationRepository.deleteByEpilepsyUserAndSupportUser(epilepsyUser, supportUser);
            return ResponseEntity.ok("Support user removed");
        } else {
            // Add new relation
            UserSupportRelation relation = new UserSupportRelation(epilepsyUser, supportUser);
            relation.setId(UUID.randomUUID().toString());
            relationRepository.save(relation);
            return ResponseEntity.ok("Support user added");
        }
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

    // Get team members for an epilepsy user
    @GetMapping("/user/{epilepsyUserEmail}/team")
    public ResponseEntity<Map<String, Object>> getTeamMembers(@PathVariable String epilepsyUserEmail) {
        try {
            System.out.println("Fetching team for epilepsy user: " + epilepsyUserEmail);
            
            User epilepsyUser = userRepository.findByEmail(epilepsyUserEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

            List<UserSupportRelation> relations = relationRepository.findByEpilepsyUser(epilepsyUser);
            System.out.println("Found " + relations.size() + " team relations");

            List<Map<String, Object>> teamMembers = relations.stream()
                .map(relation -> {
                    User supportUser = relation.getSupportUser();
                    Map<String, Object> memberInfo = new HashMap<>();
                    memberInfo.put("firstName", supportUser.getFirstName());
                    memberInfo.put("surname", supportUser.getSurname());
                    memberInfo.put("email", supportUser.getEmail());
                    memberInfo.put("isAvailable", supportUser.getIsAvailable());
                    return memberInfo;
                })
                .collect(Collectors.toList());

            System.out.println("Returning team members: " + teamMembers);

            Map<String, Object> response = new HashMap<>();
            response.put("teamMembers", teamMembers);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error fetching team members: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to fetch team members: " + e.getMessage()));
        }
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

    // Update support user availability
    @PostMapping("/user/{email}/availability")
    public ResponseEntity<?> updateAvailability(@PathVariable String email, @RequestBody Map<String, Boolean> request) {
        try {
            Boolean isAvailable = request.get("isAvailable");
            User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
            
            user.setIsAvailable(isAvailable);
            userRepository.save(user);
            
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Add or remove support user from team
    @PostMapping("/user/team/manage")
    public ResponseEntity<?> manageSupportUser(@RequestBody Map<String, Object> request) {
        try {
            System.out.println("Received team manage request: " + request);
            
            // Validate request parameters
            String epilepsyUserEmail = (String) request.get("epilepsyUserEmail");
            String supportUserEmail = (String) request.get("supportUserEmail");
            Boolean activate = (Boolean) request.get("activate");

            if (epilepsyUserEmail == null || supportUserEmail == null || activate == null) {
                System.out.println("Missing required parameters");
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Missing required parameters"));
            }

            System.out.println("Looking up users - Epilepsy: " + epilepsyUserEmail + ", Support: " + supportUserEmail);
            
            User epilepsyUser = userRepository.findByEmail(epilepsyUserEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Epilepsy user not found"));
            User supportUser = userRepository.findByEmail(supportUserEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Support user not found"));

            boolean relationExists = relationRepository.existsByEpilepsyUserAndSupportUser(epilepsyUser, supportUser);
            System.out.println("Relation exists: " + relationExists + ", Activate: " + activate);

            if (activate && !relationExists) {
                // Add support user
                UserSupportRelation relation = new UserSupportRelation();
                relation.setId(UUID.randomUUID().toString());
                relation.setEpilepsyUser(epilepsyUser);
                relation.setSupportUser(supportUser);
                relationRepository.save(relation);
                System.out.println("Added new relation");
                return ResponseEntity.ok()
                    .body(Map.of("message", "Support user added to team"));
            } else if (!activate && relationExists) {
                // Remove support user
                relationRepository.deleteByEpilepsyUserAndSupportUser(epilepsyUser, supportUser);
                System.out.println("Removed existing relation");
                return ResponseEntity.ok()
                    .body(Map.of("message", "Support user removed from team"));
            }

            System.out.println("No changes needed");
            return ResponseEntity.ok()
                .body(Map.of("message", "No changes needed"));
        } catch (Exception e) {
            System.err.println("Error managing team member: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to manage team member: " + e.getMessage()));
        }
    }

    // Get epilepsy teams for a specific support user
    @GetMapping("/user/{supportUserEmail}/support-teams")
    public ResponseEntity<?> getSupportTeams(@PathVariable String supportUserEmail) {
        try {
            System.out.println("Fetching epilepsy teams for support user: " + supportUserEmail);
            
            User supportUser = userRepository.findByEmail(supportUserEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Support user not found"));

            // Find all relations where this user is the support user
            List<UserSupportRelation> relations = relationRepository.findBySupportUser(supportUser);
            System.out.println("Found " + relations.size() + " team relations for support user");

            List<Map<String, Object>> teams = relations.stream()
                .map(relation -> {
                    User epilepsyUser = relation.getEpilepsyUser();
                    Map<String, Object> teamInfo = new HashMap<>();
                    teamInfo.put("firstName", epilepsyUser.getFirstName());
                    teamInfo.put("surname", epilepsyUser.getSurname());
                    teamInfo.put("email", epilepsyUser.getEmail());
                    
                    // Count other team members for this epilepsy user
                    long teamSize = relationRepository.findByEpilepsyUser(epilepsyUser).size();
                    teamInfo.put("teamSize", teamSize);
                    
                    return teamInfo;
                })
                .collect(Collectors.toList());

            System.out.println("Returning teams: " + teams);
            return ResponseEntity.ok(teams);
        } catch (Exception e) {
            System.err.println("Error fetching support teams: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to fetch support teams: " + e.getMessage()));
        }
    }

    // Get user availability
    @GetMapping("/user/{userEmail}/availability")
    public ResponseEntity<?> getUserAvailability(@PathVariable String userEmail) {
        try {
            User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
            
            Map<String, Object> response = new HashMap<>();
            response.put("isAvailable", user.getIsAvailable());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to get availability: " + e.getMessage()));
        }
    }

}