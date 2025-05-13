package com.awsomeproject.epilepsy.controller;

import com.awsomeproject.epilepsy.services.ProfileService;
import com.awsomeproject.epilepsy.services.infoObjects.UserInfo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    @Autowired
    private ProfileService profileService;

    @GetMapping("/get/{userId}")
    public ResponseEntity<UserInfo> get(@PathVariable Long userId) {
        
        UserInfo result = profileService.getProfile(userId);

        return ResponseEntity.ok(result);
    }

    @PutMapping("/update")
    public ResponseEntity<String> get(@RequestBody UserInfo userInfo) {
        
        Boolean success = profileService.updateProfile(userInfo);

        if (!success)
            return ResponseEntity.status(500).body(null); // HttpstatusCode 500 = InternalServerError

        return ResponseEntity.ok(null);
    }
}
