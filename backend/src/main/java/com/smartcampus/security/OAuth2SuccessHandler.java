package com.smartcampus.security;

import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();

        String email     = oauth2User.getAttribute("email");
        String name      = oauth2User.getAttribute("name");
        String avatarUrl = oauth2User.getAttribute("picture");
        String googleId  = oauth2User.getAttribute("sub");

        // Find existing user or create a new one
        User user = userRepository.findByEmail(email)
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .email(email)
                            .name(name)
                            .role(User.Role.STUDENT)
                            .provider("google")
                            .providerId(googleId)
                            .avatarUrl(avatarUrl)
                            .build();
                    return userRepository.save(newUser);
                });

        // Sync Google profile data — link provider if this was a local account
        boolean dirty = false;
        if (!"google".equals(user.getProvider())) {
            user.setProvider("google");
            user.setProviderId(googleId);
            dirty = true;
        }
        if (avatarUrl != null && !avatarUrl.equals(user.getAvatarUrl())) {
            user.setAvatarUrl(avatarUrl);
            dirty = true;
        }
        if (dirty) {
            userRepository.save(user);
        }

        String token = jwtUtil.generateToken(user);
        getRedirectStrategy().sendRedirect(request, response,
                frontendUrl + "/oauth2/callback?token=" + token);
    }
}
