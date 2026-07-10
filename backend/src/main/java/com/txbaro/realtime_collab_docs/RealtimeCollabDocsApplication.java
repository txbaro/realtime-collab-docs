package com.txbaro.realtime_collab_docs;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RealtimeCollabDocsApplication {

	public static void main(String[] args) {
		SpringApplication.run(RealtimeCollabDocsApplication.class, args);
	}

}
