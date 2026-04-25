package com.smartcampus.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final OAuth2SuccessHandler oauth2SuccessHandler;
    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                // Public: email login endpoints
                .requestMatchers("/api/auth/login", "/api/auth/register").permitAll()
                // Public: OAuth2 flow
                .requestMatchers("/oauth2/**", "/login/oauth2/**", "/error").permitAll()
                // Public: uploaded files
                .requestMatchers("/uploads/**").permitAll()
                // Admin-only: user management
                .requestMatchers("/api/auth/users", "/api/auth/users/**").hasRole("ADMIN")
                // Admin-only: delete resources
                .requestMatchers(HttpMethod.DELETE, "/api/resources/**").hasRole("ADMIN")
                // Admin + Staff: create/edit resources
                .requestMatchers(HttpMethod.POST, "/api/resources").hasAnyRole("ADMIN", "STAFF")
                .requestMatchers(HttpMethod.PUT, "/api/resources/**").hasAnyRole("ADMIN", "STAFF")
                // Admin + Staff: delete bookings
                .requestMatchers(HttpMethod.DELETE, "/api/bookings/**").hasAnyRole("ADMIN", "STAFF")
                // Any authenticated user: owner-only booking actions are enforced in the service layer
                .requestMatchers(HttpMethod.PUT, "/api/bookings/**").authenticated()
                .requestMatchers(HttpMethod.PATCH, "/api/bookings/*/cancel", "/api/bookings/*/cancel-series").authenticated()
                // Admin + Staff: approve / reject / complete bookings
                .requestMatchers(HttpMethod.PATCH, "/api/bookings/*/status").hasAnyRole("ADMIN", "STAFF")
                // All other API requests require authentication
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth -> oauth
                .successHandler(oauth2SuccessHandler)
            )
            .exceptionHandling(ex -> ex
                .defaultAuthenticationEntryPointFor(
                    new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                    request -> request.getRequestURI().startsWith("/api/")
                )
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("http://localhost:*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
