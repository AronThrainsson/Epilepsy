package com.awsomeproject.epilepsy.services;

import com.awsomeproject.epilepsy.models.User;
import com.awsomeproject.epilepsy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.awsomeproject.epilepsy.services.infoObjects.*;

import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    public String signup(User user) {
        Optional<User> existingUser = userRepository.findByEmail(user.getEmail());
        if (existingUser.isPresent()) {
            return "User with this email already exists.";
        }
        userRepository.save(user);
        return "Signup successful!";
    }

    public LoginResponse login(User user) {
        LoginResponse result = new LoginResponse();
        Optional<User> optionalUser = userRepository.findByEmail(user.getEmail());

        if (optionalUser.isEmpty() || !optionalUser.get().getPassword().equals(user.getPassword())) {
            result.hasError = true;
            result.message = "Invalid credentials";
            return result; // return early as we have error
        }

        // User correctly logged in, add user 
        var userResult = optionalUser.get();

        var userInfo = new UserInfo();
        result.userInfo = userInfo;
        
        // copy information
        userInfo.id = userResult.getId();
        userInfo.email = userResult.getEmail();
        userInfo.role = userResult.getRole(); // Returns "EPILEPSY" or "SUPPORT" 

        return result;
    }
}
