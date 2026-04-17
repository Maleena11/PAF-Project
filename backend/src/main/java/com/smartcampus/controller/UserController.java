package com.smartcampus.controller;



import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class UserController {

    private final UserRepository userRepository;

    // Simple login: match by email (no password needed for student project)
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim().toLowerCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "No account found with that email"));
        }

        return ResponseEntity.ok(userOpt.get());
    }

    // Login with email + name (auto-register if not found)
    @PostMapping("/login-or-register")
    public ResponseEntity<?> loginOrRegister(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String name  = body.get("name");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }

        User user = userRepository.findByEmail(email.trim().toLowerCase())
            .orElseGet(() -> {
                User newUser = User.builder()
                    .email(email.trim().toLowerCase())
                    .name(name != null ? name : email.split("@")[0])
                    .role(User.Role.STUDENT)
                    .provider("local")
                    .providerId("local-" + System.currentTimeMillis())
                    .build();
                return userRepository.save(newUser);
            });

        return ResponseEntity.ok(user);
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> body) {
        String name    = body.get("name");
        String email   = body.get("email");
        String roleStr = body.getOrDefault("role", "STUDENT");

        if (name == null || name.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Name is required"));
        if (email == null || email.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));

        String normalEmail = email.trim().toLowerCase();
        if (userRepository.existsByEmail(normalEmail))
            return ResponseEntity.badRequest().body(Map.of("message", "Email already in use"));

        User.Role role;
        try { role = User.Role.valueOf(roleStr.toUpperCase()); }
        catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid role: " + roleStr));
        }

        User user = User.builder()
            .name(name.trim())
            .email(normalEmail)
            .role(role)
            .provider("local")
            .providerId("admin-" + System.currentTimeMillis())
            .build();

        return ResponseEntity.status(201).body(userRepository.save(user));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return userRepository.findById(id)
            .map(user -> {
                String name    = body.get("name");
                String email   = body.get("email");
                String roleStr = body.get("role");

                if (name != null && !name.isBlank()) user.setName(name.trim());

                if (email != null && !email.isBlank()) {
                    String normalEmail = email.trim().toLowerCase();
                    if (!normalEmail.equals(user.getEmail()) && userRepository.existsByEmail(normalEmail))
                        return ResponseEntity.badRequest().<Object>body(Map.of("message", "Email already in use"));
                    user.setEmail(normalEmail);
                }

                if (roleStr != null && !roleStr.isBlank()) {
                    try { user.setRole(User.Role.valueOf(roleStr.toUpperCase())); }
                    catch (IllegalArgumentException e) {
                        return ResponseEntity.badRequest().<Object>body(Map.of("message", "Invalid role: " + roleStr));
                    }
                }

                return ResponseEntity.ok((Object) userRepository.save(user));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id))
            return ResponseEntity.notFound().build();
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<?> updateUserRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String roleStr = body.get("role");
        if (roleStr == null || roleStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Role is required"));
        }
        User.Role newRole;
        try {
            newRole = User.Role.valueOf(roleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid role: " + roleStr));
        }
        return userRepository.findById(id)
            .map(user -> {
                user.setRole(newRole);
                return ResponseEntity.ok(userRepository.save(user));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}