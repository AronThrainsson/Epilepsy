package com.awsomeproject.epilepsy.services;

import com.awsomeproject.epilepsy.models.User;
import com.awsomeproject.epilepsy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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

    public String login(User user) {
        Optional<User> optionalUser = userRepository.findByEmail(user.getEmail());

        if (optionalUser.isEmpty() || !optionalUser.get().getPassword().equals(user.getPassword())) {
            return "Invalid credentials";
        }

        return optionalUser.get().getRole().toString(); // Returns "EPILEPSY" or "SUPPORT"
    }
}