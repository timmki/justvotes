package de.justvotes.bootstrap.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@ConditionalOnProperty(prefix = "justvotes.api-docs", name = "enabled", havingValue = "true")
class ApiDocsConfiguration implements WebMvcConfigurer {
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/api-docs/openapi-v1.yaml").addResourceLocations("classpath:/docs/justvotes-v1.yaml");
        registry.addResourceHandler("/swagger-ui/**").addResourceLocations("classpath:/docs/swagger-ui/", "classpath:/META-INF/resources/webjars/swagger-ui/5.17.14/");
    }
}
