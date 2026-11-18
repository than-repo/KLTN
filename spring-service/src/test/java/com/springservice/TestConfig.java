package com.springservice;

import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import com.springservice.payment.client.CourseClient;

@TestConfiguration
@EnableAutoConfiguration(exclude = {
        org.springframework.cloud.client.discovery.simple.SimpleDiscoveryClientAutoConfiguration.class,
        org.springframework.cloud.openfeign.FeignAutoConfiguration.class,
        org.springframework.cloud.openfeign.loadbalancer.FeignLoadBalancerAutoConfiguration.class
})
public class TestConfig {

    @Bean
    @Primary
    public CourseClient courseClient() {
        return org.mockito.Mockito.mock(CourseClient.class);
    }
}