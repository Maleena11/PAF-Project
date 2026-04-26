package com.smartcampus.service;

import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.Resource;
import com.smartcampus.model.Resource.ResourceStatus;
import com.smartcampus.model.Resource.ResourceType;
import com.smartcampus.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ResourceService {

    private final ResourceRepository resourceRepository;

    public List<Resource> getAllResources() {
        return resourceRepository.findAll();
    }

    public Resource getResourceById(Long id) {
        return resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));
    }

    public List<Resource> getAvailableResources() {
        return resourceRepository.findByStatus(ResourceStatus.AVAILABLE);
    }

    public List<Resource> getResourcesByStatus(ResourceStatus status) {
        return resourceRepository.findByStatus(status);
    }

    public List<Resource> getResourcesByType(ResourceType type) {
        return resourceRepository.findByType(type);
    }

    public List<Resource> getResourcesByStatusAndType(ResourceStatus status, ResourceType type) {
        return resourceRepository.findByStatusAndType(status, type);
    }

    public List<Resource> searchResources(String name) {
        return resourceRepository.findByNameContainingIgnoreCase(name);
    }

    public Resource createResource(Resource resource) {
        String name = resource.getName() == null ? "" : resource.getName().trim();
        if (resourceRepository.existsByNameIgnoreCase(name)) {
            throw new IllegalStateException("A resource with this name already exists");
        }
        resource.setName(name);
        return resourceRepository.save(resource);
    }

    public Resource updateResource(Long id, Resource updatedResource) {
        Resource existing = getResourceById(id);
        existing.setName(updatedResource.getName());
        existing.setType(updatedResource.getType());
        existing.setLocation(updatedResource.getLocation());
        existing.setCapacity(updatedResource.getCapacity());
        existing.setStatus(updatedResource.getStatus());
        existing.setDescription(updatedResource.getDescription());
        if (updatedResource.getImageUrl() != null) {
            existing.setImageUrl(updatedResource.getImageUrl());
        }
        return resourceRepository.save(existing);
    }

    public Resource updateStatus(Long id, ResourceStatus status) {
        Resource resource = getResourceById(id);
        resource.setStatus(status);
        return resourceRepository.save(resource);
    }

    public void deleteResource(Long id) {
        Resource resource = getResourceById(id);
        resourceRepository.delete(resource);
    }
}
