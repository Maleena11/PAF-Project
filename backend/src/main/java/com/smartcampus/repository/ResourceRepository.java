package com.smartcampus.repository;

import com.smartcampus.model.Resource;
import com.smartcampus.model.Resource.ResourceStatus;
import com.smartcampus.model.Resource.ResourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, Long> {
    List<Resource> findByStatus(ResourceStatus status);
    List<Resource> findByType(ResourceType type);
    List<Resource> findByStatusAndType(ResourceStatus status, ResourceType type);
    List<Resource> findByNameContainingIgnoreCase(String name);
    boolean existsByNameIgnoreCase(String name);
}
