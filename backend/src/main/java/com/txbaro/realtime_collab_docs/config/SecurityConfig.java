package com.txbaro.realtime_collab_docs.config;

import com.txbaro.realtime_collab_docs.security.JwtAuthenticationFilter;
import com.txbaro.realtime_collab_docs.security.GoogleAuthenticationSuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;


@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final GoogleAuthenticationSuccessHandler googleAuthenticationSuccessHandler; // Cần khai báo biến này

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/auth/register", 
                    "/api/auth/login", 
                    "/api/auth/test-email", 
                    "/api/auth/request-register-otp",
                    "/api/auth/request-password-otp",
                    "/api/auth/request-delete-otp",
                    "/api/auth/request-deactivate-otp"
                ).permitAll()
                .anyRequest().authenticated()
            )
            // Cấu hình OAuth2 Login nối tiếp vào chuỗi http
            .oauth2Login(oauth2 -> oauth2
                .successHandler(googleAuthenticationSuccessHandler)
            )
            // Gọi addFilterBefore tiếp theo mà không bị ngắt quãng bởi dấu ;
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
            
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}