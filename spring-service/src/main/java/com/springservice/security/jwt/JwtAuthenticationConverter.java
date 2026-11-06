package com.springservice.security.jwt;

import java.util.List;
import java.util.Map;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;


@Component
public final class JwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private static final Map<String, String> ROLE_AUTHORITIES = Map.of(
            "LEARNER", "ROLE_LEARNER",
            "INSTRUCTOR", "ROLE_INSTRUCTOR",
            "REVIEWER", "ROLE_REVIEWER",
            "ADMIN", "ROLE_ADMIN");

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String role = jwt.getClaimAsString("role");
        String authority = ROLE_AUTHORITIES.get(role);
        if (authority == null) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("invalid_token", "Unsupported role", null));
        }

        return new JwtAuthenticationToken(
                jwt,
                List.of(new SimpleGrantedAuthority(authority)),
                jwt.getSubject());
    }
}
