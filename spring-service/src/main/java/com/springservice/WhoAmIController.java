package com.springservice;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WhoAmIController {

    @GetMapping("/whoami")
    public WhoAmIResponse whoAmI(
            @AuthenticationPrincipal Jwt jwt,
            Authentication authentication) {
        List<String> authorities = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(authority -> authority.startsWith("ROLE_"))
                .sorted()
                .toList();

        return new WhoAmIResponse(
                true,
                jwt.getSubject(),
                jwt.getClaimAsString("email"),
                jwt.getClaimAsString("role"),
                authorities);
    }

    public record WhoAmIResponse(
            boolean authenticated,
            String userId,
            String email,
            String role,
            List<String> authorities) {
    }
}
