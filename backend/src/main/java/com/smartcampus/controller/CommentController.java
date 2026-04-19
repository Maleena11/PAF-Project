package com.smartcampus.controller;

import com.smartcampus.model.Comment;
import com.smartcampus.model.User.Role;
import com.smartcampus.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173","http://localhost:5174","http://localhost:5175","http://localhost:3000"})
public class CommentController {

    private final CommentService commentService;

    @PutMapping("/{id}")
    public ResponseEntity<Comment> updateComment(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        
        Long userId = Long.valueOf(body.get("userId").toString());
        Role role = Role.valueOf(body.get("role").toString().toUpperCase());
        String content = body.get("content").toString();

        Comment updatedComment = commentService.updateComment(id, userId, role, content);
        return ResponseEntity.ok(updatedComment);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long id,
            @RequestParam Long userId,
            @RequestParam String role) {
        
        Role userRole = Role.valueOf(role.toUpperCase());
        commentService.deleteComment(id, userId, userRole);
        return ResponseEntity.noContent().build();
    }
}
