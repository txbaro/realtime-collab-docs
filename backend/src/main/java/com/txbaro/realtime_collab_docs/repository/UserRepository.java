package com.txbaro.realtime_collab_docs.repository;

import com.txbaro.realtime_collab_docs.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    // Spring Data JPA tự động dịch tên hàm này thành câu SQL kiểm tra tồn tại
    boolean existsByEmail(String email);
}