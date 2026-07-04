package com.txbaro.realtime_collab_docs.repository;

import com.txbaro.realtime_collab_docs.entity.UserAuth;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface UserAuthRepository extends JpaRepository<UserAuth, UUID> {
}