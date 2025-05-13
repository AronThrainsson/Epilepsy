package com.awsomeproject.epilepsy.controller;

import com.awsomeproject.epilepsy.models.User;
import com.awsomeproject.epilepsy.services.AuthService;
import com.awsomeproject.epilepsy.services.infoObjects.LoginResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<Map<String, String>> signup(@RequestBody User user) {
        String result = authService.signup(user);
        Map<String, String> response = new HashMap<>();
        response.put("message", result);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody User user) {
        
        LoginResponse result = authService.login(user);

        if (result.hasError)
            return ResponseEntity.status(401).body(result);
        
        return ResponseEntity.ok(result);
    }
}
