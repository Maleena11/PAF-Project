package com.smartcampus.controller;



import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private String currentUserEmail() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null) ? auth.getName() : null;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String email    = body.get("email");
        String password = body.get("password");

        if (email == null || email.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        if (password == null || password.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Password is required"));

        String normalizedEmail = email.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid email or password"));
        }

        User user = userOpt.get();
        if (user.getPasswordHash() == null) {
            return ResponseEntity.status(403).body(Map.of(
                "message", "This account has no password set. Use Google sign-in or ask an admin to set a password."
            ));
        }
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid email or password"));
        }

        String token = jwtUtil.generateToken(user);
        return ResponseEntity.ok(Map.of(
            "token",     token,
            "id",        user.getId(),
            "name",      user.getName(),
            "email",     user.getEmail(),
            "role",      user.getRole().name(),
            "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : ""
        ));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String name     = body.get("name");
        String email    = body.get("email");
        String password = body.get("password");

        if (name == null || name.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Name is required"));
        if (email == null || email.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        if (password == null || password.length() < 8)
            return ResponseEntity.badRequest().body(Map.of("message", "Password must be at least 8 characters"));

        String normalizedEmail = email.trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            return ResponseEntity.badRequest().body(Map.of("message", "An account already exists with that email"));
        }

        User user = userRepository.save(User.builder()
            .name(name.trim())
            .email(normalizedEmail)
            .passwordHash(passwordEncoder.encode(password))
            .role(User.Role.STUDENT)
            .provider("local")
            .providerId("local-" + System.currentTimeMillis())
            .build());

        String token = jwtUtil.generateToken(user);
        return ResponseEntity.status(201).body(Map.of(
            "token",     token,
            "id",        user.getId(),
            "name",      user.getName(),
            "email",     user.getEmail(),
            "role",      user.getRole().name(),
            "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : ""
        ));
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(@RequestParam(required = false) String role) {
        if (role != null && !role.isBlank()) {
            try {
                User.Role r = User.Role.valueOf(role.toUpperCase());
                return ResponseEntity.ok(userRepository.findByRole(r));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid role: " + role));
            }
        }
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> body) {
        String name     = body.get("name");
        String email    = body.get("email");
        String roleStr  = body.getOrDefault("role", "STUDENT");
        String password = body.get("password");

        if (name == null || name.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Name is required"));
        if (email == null || email.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        if (password != null && !password.isBlank() && password.length() < 8)
            return ResponseEntity.badRequest().body(Map.of("message", "Password must be at least 8 characters"));

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
            .passwordHash(password != null && !password.isBlank() ? passwordEncoder.encode(password) : null)
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

                String newPassword = body.get("password");
                if (newPassword != null && !newPassword.isBlank()) {
                    if (newPassword.length() < 8)
                        return ResponseEntity.badRequest().<Object>body(Map.of("message", "Password must be at least 8 characters"));
                    user.setPasswordHash(passwordEncoder.encode(newPassword));
                }

                return ResponseEntity.ok((Object) userRepository.save(user));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id))
            return ResponseEntity.notFound().build();

        String email = currentUserEmail();
        if (email != null) {
            Optional<User> self = userRepository.findByEmail(email);
            if (self.isPresent() && self.get().getId().equals(id))
                return ResponseEntity.badRequest().body(Map.of("message", "You cannot delete your own account"));
        }

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

        String email = currentUserEmail();
        if (email != null) {
            Optional<User> self = userRepository.findByEmail(email);
            if (self.isPresent() && self.get().getId().equals(id))
                return ResponseEntity.badRequest().body(Map.of("message", "You cannot change your own role"));
        }

        return userRepository.findById(id)
            .map(user -> {
                user.setRole(newRole);
                return ResponseEntity.ok(userRepository.save(user));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
