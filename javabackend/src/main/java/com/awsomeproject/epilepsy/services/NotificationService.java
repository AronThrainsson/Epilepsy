package com.awsomeproject.epilepsy.services;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class NotificationService {

    public void sendPushNotification(String token, String title, String body) {
        RestTemplate restTemplate = new RestTemplate();

        Map<String, Object> payload = Map.of(
                "to", token,
                "title", title,
                "body", body
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        restTemplate.postForEntity("https://exp.host/--/api/v2/push/send", request, String.class);
    }
}