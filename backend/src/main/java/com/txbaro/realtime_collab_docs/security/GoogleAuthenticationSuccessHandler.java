package com.txbaro.realtime_collab_docs.security;

import com.txbaro.realtime_collab_docs.entity.User;
import com.txbaro.realtime_collab_docs.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor // Chỉ giữ lại các dependency cần thiết
public class GoogleAuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    // Đã xóa: private final GoogleAuthenticationSuccessHandler googleAuthenticationSuccessHandler;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
        String email = oauth2User.getAttribute("email");
        String firstname = oauth2User.getAttribute("given_name");
        String lastname = oauth2User.getAttribute("family_name");

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setFirstname(firstname);
            newUser.setLastname(lastname);
            newUser.setStatus("ACTIVE");
            return userRepository.save(newUser);
        });

        String token = jwtUtil.generateToken(user.getEmail());
        response.sendRedirect("http://localhost:3000/oauth2/redirect?token=" + token);
    }
}