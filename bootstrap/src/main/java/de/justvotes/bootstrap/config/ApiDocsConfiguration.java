package de.justvotes.bootstrap.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves the contract and Swagger UI through explicit mappings, which take precedence over the SPA fallback.
 */
@RestController
@ConditionalOnProperty(prefix = "justvotes.api-docs", name = "enabled", havingValue = "true")
class ApiDocsConfiguration {
    private static final String[] SWAGGER_UI_LOCATIONS = {"classpath:/docs/swagger-ui/", "classpath:/META-INF/resources/webjars/swagger-ui/5.17.14/"};

    private final ResourceLoader resources;

    ApiDocsConfiguration(ResourceLoader resources) {
        this.resources = resources;
    }

    @GetMapping("/api-docs/openapi-v1.yaml")
    ResponseEntity<Resource> contract() {
        return serve(resources.getResource("classpath:/docs/justvotes-v1.yaml"), MediaType.parseMediaType("application/yaml"));
    }

    @GetMapping({"/swagger-ui", "/swagger-ui/"})
    ResponseEntity<Resource> swaggerUi() {
        return swaggerUiFile("index.html");
    }

    @GetMapping("/swagger-ui/{file:[A-Za-z0-9._-]+}")
    ResponseEntity<Resource> swaggerUiFile(@PathVariable("file") String file) {
        if (file.startsWith(".")) return ResponseEntity.notFound().build();
        for (String location : SWAGGER_UI_LOCATIONS) {
            Resource resource = resources.getResource(location + file);
            if (resource.exists() && resource.isReadable()) {
                return serve(resource, MediaTypeFactory.getMediaType(file).orElse(MediaType.APPLICATION_OCTET_STREAM));
            }
        }
        return ResponseEntity.notFound().build();
    }

    private static ResponseEntity<Resource> serve(Resource resource, MediaType mediaType) {
        if (!resource.exists()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().contentType(mediaType).body(resource);
    }
}
