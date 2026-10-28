package de.justvotes.bootstrap.support;

import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;

/**
 * A browser-like HTTP client state: cookies (CSRF and, once signed in, the session) plus the CSRF token.
 */
public record TestSession(TestRestTemplate client, String cookies, String csrfToken) {
    public ResponseEntity<String> get(String url) {
        return client.exchange(RequestEntity.get(url).header(HttpHeaders.COOKIE, cookies).build(), String.class);
    }

    public ResponseEntity<String> post(String url) {
        return client.exchange(RequestEntity.post(url).header(HttpHeaders.COOKIE, cookies)
                .header("X-XSRF-TOKEN", csrfToken).build(), String.class);
    }

    public ResponseEntity<String> post(String url, String body) {
        return client.exchange(RequestEntity.post(url).contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.COOKIE, cookies).header("X-XSRF-TOKEN", csrfToken).body(body), String.class);
    }

    public ResponseEntity<String> postWithoutCsrf(String url, String body) {
        return client.exchange(RequestEntity.post(url).contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.COOKIE, cookies).body(body), String.class);
    }

    public ResponseEntity<String> patch(String url, String body) {
        return client.exchange(RequestEntity.patch(url).contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.COOKIE, cookies).header("X-XSRF-TOKEN", csrfToken).body(body), String.class);
    }

    public ResponseEntity<String> put(String url) {
        return client.exchange(RequestEntity.put(url).header(HttpHeaders.COOKIE, cookies)
                .header("X-XSRF-TOKEN", csrfToken).build(), String.class);
    }

    public ResponseEntity<String> put(String url, String body) {
        return client.exchange(RequestEntity.put(url).contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.COOKIE, cookies).header("X-XSRF-TOKEN", csrfToken).body(body), String.class);
    }

    public ResponseEntity<String> delete(String url) {
        return client.exchange(RequestEntity.delete(url).header(HttpHeaders.COOKIE, cookies)
                .header("X-XSRF-TOKEN", csrfToken).build(), String.class);
    }

    public ResponseEntity<String> delete(String url, String body) {
        return client.exchange(RequestEntity.method(org.springframework.http.HttpMethod.DELETE, url)
                .contentType(MediaType.APPLICATION_JSON).header(HttpHeaders.COOKIE, cookies)
                .header("X-XSRF-TOKEN", csrfToken).body(body), String.class);
    }

    public ResponseEntity<String> deleteWithoutCsrf(String url) {
        return client.exchange(RequestEntity.delete(url).header(HttpHeaders.COOKIE, cookies).build(), String.class);
    }
}
