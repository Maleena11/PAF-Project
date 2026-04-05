package com.smartcampus.controller;

import com.smartcampus.model.Resource;
import com.smartcampus.model.Resource.ResourceStatus;
import com.smartcampus.model.Resource.ResourceType;
import com.smartcampus.service.ResourceService;
import com.smartcampus.util.FileUploadUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ResourceController {

    private final ResourceService resourceService;
    private final FileUploadUtil fileUploadUtil;

    @GetMapping
    public ResponseEntity<List<Resource>> getAllResources(
            @RequestParam(required = false) ResourceStatus status,
            @RequestParam(required = false) ResourceType type,
            @RequestParam(required = false) String search) {

        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(resourceService.searchResources(search));
        }
        if (status != null && type != null) {
            return ResponseEntity.ok(resourceService.getAvailableResources());
        }
        if (status != null) {
            return ResponseEntity.ok(resourceService.getAvailableResources());
        }
        if (type != null) {
            return ResponseEntity.ok(resourceService.getResourcesByType(type));
        }
        return ResponseEntity.ok(resourceService.getAllResources());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> getResourceById(@PathVariable Long id) {
        return ResponseEntity.ok(resourceService.getResourceById(id));
    }

    @PostMapping
    public ResponseEntity<Resource> createResource(@Valid @RequestBody Resource resource) {
        return ResponseEntity.status(201).body(resourceService.createResource(resource));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Resource> updateResource(
            @PathVariable Long id,
            @Valid @RequestBody Resource resource) {
        return ResponseEntity.ok(resourceService.updateResource(id, resource));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Resource> updateStatus(
            @PathVariable Long id,
            @RequestParam ResourceStatus status) {
        return ResponseEntity.ok(resourceService.updateStatus(id, status));
    }

    @PostMapping("/{id}/image")
    public ResponseEntity<Resource> uploadImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) throws IOException {
        String fileName = fileUploadUtil.saveFile("resources", file);
        Resource resource = resourceService.getResourceById(id);
        resource.setImageUrl("/uploads/resources/" + fileName);
        return ResponseEntity.ok(resourceService.updateResource(id, resource));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResource(@PathVariable Long id) {
        resourceService.deleteResource(id);
        return ResponseEntity.noContent().build();
    }
}
