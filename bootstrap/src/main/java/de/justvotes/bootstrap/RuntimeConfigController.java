package de.justvotes.bootstrap;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class RuntimeConfigController {
    private final ObjectMapper objectMapper;
    private final String appName;

    public RuntimeConfigController(ObjectMapper objectMapper, @Value("${VITE_APP_NAME:}") String appName) {
        this.objectMapper = objectMapper;
        this.appName = appName;
    }

    @GetMapping(value = "/config.js", produces = "application/javascript")
    ResponseEntity<String> config() throws JsonProcessingException {
        Map<String, String> config = appName.isBlank() ? Map.of() : Map.of("appName", appName.trim());
        return ResponseEntity.ok()
                .contentType(MediaType.valueOf("application/javascript"))
                .cacheControl(CacheControl.noStore())
                .body("window.__JUSTVOTES_CONFIG__ = " + objectMapper.writeValueAsString(config) + ";");
    }
}
