package com.txbaro.realtime_collab_docs.scheduler;

import com.txbaro.realtime_collab_docs.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;

@Component
@RequiredArgsConstructor
public class UserCleanupScheduler {

    private final UserRepository userRepository;

    // Chạy dọn dẹp mỗi 1 giờ
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void cleanUnverifiedUsers() {
        ZonedDateTime limitTime = ZonedDateTime.now().minusHours(24);
        userRepository.deleteByStatusAndCreatedAtBefore("PENDING_VERIFICATION", limitTime);
    }
}
