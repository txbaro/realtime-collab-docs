package com.txbaro.realtime_collab_docs.repository;

import com.txbaro.realtime_collab_docs.entity.Document;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {

    @EntityGraph(attributePaths = {"owner"})
    Optional<Document> findWithOwnerById(UUID id);
}
