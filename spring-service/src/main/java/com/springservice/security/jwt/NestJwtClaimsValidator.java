package com.springservice.security.jwt;

import java.time.Instant;
import java.util.Set;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

public final class NestJwtClaimsValidator implements OAuth2TokenValidator<Jwt> {

    private static final Set<String> ALLOWED_ROLES = Set.of(
            "LEARNER", "INSTRUCTOR", "REVIEWER", "ADMIN");
    private static final long ISSUED_AT_CLOCK_SKEW_SECONDS = 60;
    private static final OAuth2Error INVALID_TOKEN = new OAuth2Error(
            "invalid_token", "Required JWT claims are missing or invalid", null);

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        Object email = jwt.getClaims().get("email");
        Object role = jwt.getClaims().get("role");
        Instant issuedAt = jwt.getIssuedAt();
        Instant expiresAt = jwt.getExpiresAt();

        if (isBlank(jwt.getSubject())
                || !(email instanceof String emailValue) || isBlank(emailValue)
                || !(role instanceof String roleValue) || !ALLOWED_ROLES.contains(roleValue)
                || issuedAt == null
                || expiresAt == null
                || !expiresAt.isAfter(issuedAt)
                || issuedAt.isAfter(Instant.now().plusSeconds(ISSUED_AT_CLOCK_SKEW_SECONDS))) {
            return OAuth2TokenValidatorResult.failure(INVALID_TOKEN);
        }

        return OAuth2TokenValidatorResult.success();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
