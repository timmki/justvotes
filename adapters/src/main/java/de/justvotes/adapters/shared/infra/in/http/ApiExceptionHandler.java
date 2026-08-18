package de.justvotes.adapters.shared.infra.in.http;

import de.justvotes.pollmanagement.core.exception.PollNotFoundException;
import de.justvotes.templatecatalog.core.exception.CatalogItemNotFoundException;
import de.justvotes.templatecatalog.core.exception.CatalogNameAlreadyExistsException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.method.MethodValidationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;

@RestControllerAdvice
public final class ApiExceptionHandler {
    private static ResponseEntity<ProblemDetail> problem(HttpStatus status, String code, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail == null ? status.getReasonPhrase() : detail);
        problem.setType(URI.create("https://justvotes.de/problems/" + code));
        problem.setProperty("code", code);
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_PROBLEM_JSON).body(problem);
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, MethodValidationException.class, HttpMessageNotReadableException.class, IllegalArgumentException.class})
    ResponseEntity<ProblemDetail> invalidInput(Exception exception) {
        return problem(HttpStatus.BAD_REQUEST, "invalid-request", exception.getMessage());
    }

    @ExceptionHandler({PollNotFoundException.class, CatalogItemNotFoundException.class})
    ResponseEntity<ProblemDetail> notFound(RuntimeException exception) {
        return problem(HttpStatus.NOT_FOUND, "resource-not-found", exception.getMessage());
    }

    @ExceptionHandler({IllegalStateException.class, CatalogNameAlreadyExistsException.class, DataIntegrityViolationException.class})
    ResponseEntity<ProblemDetail> invalidState(RuntimeException exception) {
        return problem(HttpStatus.CONFLICT, "invalid-state", exception.getMessage());
    }
}
