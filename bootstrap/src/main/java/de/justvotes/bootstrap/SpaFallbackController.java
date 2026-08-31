package de.justvotes.bootstrap;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves the SPA for browser routes, while leaving API and operational URLs alone.
 */
@RestController
public class SpaFallbackController {
    private final ResourceLoader resources;

    public SpaFallbackController(ResourceLoader resources) {
        this.resources = resources;
    }

    @GetMapping("/{*path}")
    public ResponseEntity<Resource> fallback(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path.equals("/api") || path.startsWith("/api/") || path.equals("/actuator") || path.startsWith("/actuator/")) {
            return ResponseEntity.notFound().build();
        }
        Resource resource = resources.getResource("classpath:/static" + path);
        if (resource.exists() && resource.isReadable()) {
            MediaType mediaType = MediaTypeFactory.getMediaType(path).orElse(MediaType.APPLICATION_OCTET_STREAM);
            return ResponseEntity.ok().contentType(mediaType).body(resource);
        }
        if (path.substring(path.lastIndexOf('/') + 1).contains(".")) {
            return ResponseEntity.notFound().build();
        }
        Resource index = resources.getResource("classpath:/static/index.html");
        return index.exists()
                ? ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(index)
                : ResponseEntity.notFound().build();
    }
}
