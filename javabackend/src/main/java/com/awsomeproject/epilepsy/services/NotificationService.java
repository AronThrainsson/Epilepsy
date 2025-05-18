package com.awsomeproject.epilepsy.services;

import com.awsomeproject.epilepsy.models.User;
import com.awsomeproject.epilepsy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.logging.Logger;

@Service
public class NotificationService {
    
    private static final Logger logger = Logger.getLogger(NotificationService.class.getName());
    
    @Autowired
    private UserRepository userRepository;

    public void sendPushNotification(String token, String title, String body, Map<String, String> data) {
        RestTemplate restTemplate = new RestTemplate();

        Map<String, Object> payload = new HashMap<>();
        payload.put("to", token);
        payload.put("title", title);
        payload.put("body", body);
        payload.put("data", data); // attach navigation info and optional coordinates

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        try {
            restTemplate.postForEntity("https://exp.host/--/api/v2/push/send", request, String.class);
            logger.info("Push notification sent to token: " + token);
        } catch (Exception e) {
            logger.warning("Failed to send push notification: " + e.getMessage());
        }
    }
    
    /**
     * Sends a notification to a specific user by their ID
     * 
     * @param userId The ID of the user to notify
     * @param title The notification title
     * @param body The notification message
     * @return true if notification was sent, false otherwise
     */
    public boolean sendNotificationToUser(Long userId, String title, String body) {
        Optional<User> userOptional = userRepository.findById(userId);
        
        if (userOptional.isEmpty()) {
            logger.warning("Cannot send notification: User not found with ID " + userId);
            return false;
        }
        
        User user = userOptional.get();
        String pushToken = user.getPushToken();
        
        if (pushToken == null || pushToken.isEmpty()) {
            logger.warning("Cannot send notification: User has no push token: " + user.getEmail());
            return false;
        }
        
        Map<String, String> data = new HashMap<>();
        data.put("screen", "Medicine");
        
        sendPushNotification(pushToken, title, body, data);
        return true;
    }
}