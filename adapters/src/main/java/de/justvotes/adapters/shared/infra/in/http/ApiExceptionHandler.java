package de.justvotes.adapters.shared.infra.in.http;

import de.justvotes.pollmanagement.core.exception.PollNotFoundException;
import de.justvotes.pollmanagement.core.exception.PollNotActiveException;
import de.justvotes.pollmanagement.core.exception.ResultsNotAvailableException;
import de.justvotes.templatecatalog.core.exception.CatalogItemNotFoundException;
import de.justvotes.templatecatalog.core.exception.CatalogNameAlreadyExistsException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.method.MethodValidationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.core.annotation.Order;
import org.springframework.core.Ordered;

import java.net.URI;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public final class ApiExceptionHandler {
    private static ResponseEntity<ProblemDetail> problem(HttpStatus status, String code, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail == null ? status.getReasonPhrase() : detail);
        problem.setType(URI.create("https://justvotes.de/problems/" + code));
        problem.setProperty("code", code);
        ResponseEntity.BodyBuilder response = ResponseEntity.status(status).contentType(MediaType.APPLICATION_PROBLEM_JSON);
        response.cacheControl(CacheControl.noStore());
        return response.body(problem);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ProblemDetail> methodNotAllowed(HttpRequestMethodNotSupportedException exception) {
        return problem(HttpStatus.METHOD_NOT_ALLOWED, "method-not-allowed", "The HTTP method is not supported.");
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ProblemDetail> unsupportedMediaType(HttpMediaTypeNotSupportedException exception) {
        return problem(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "unsupported-media-type", "The request media type is not supported.");
    }

    @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class})
    ResponseEntity<ProblemDetail> routeNotFound(Exception exception) {
        return problem(HttpStatus.NOT_FOUND, "resource-not-found", "The requested resource was not found.");
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, MethodValidationException.class, IllegalArgumentException.class})
    ResponseEntity<ProblemDetail> invalidInput(Exception exception) {
        return problem(HttpStatus.BAD_REQUEST, "invalid-request", "The request is invalid.");
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ProblemDetail> malformedMessage(HttpMessageNotReadableException exception) {
        return problem(HttpStatus.BAD_REQUEST, "invalid-request", "The request is invalid.");
    }

    @ExceptionHandler(ErrorResponseException.class)
    ResponseEntity<ProblemDetail> frameworkError(ErrorResponseException exception) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        return problem(status, status == HttpStatus.UNSUPPORTED_MEDIA_TYPE ? "unsupported-media-type" : "invalid-request",
                "The request is invalid.");
    }

    @ExceptionHandler({PollNotFoundException.class, CatalogItemNotFoundException.class})
    ResponseEntity<ProblemDetail> notFound(RuntimeException exception) {
        return problem(HttpStatus.NOT_FOUND, "resource-not-found", "The requested resource was not found.");
    }

    @ExceptionHandler(ResultsNotAvailableException.class)
    ResponseEntity<ProblemDetail> resultsNotAvailable(ResultsNotAvailableException exception) {
        return problem(HttpStatus.FORBIDDEN, "results-not-available", "The poll results are not available yet.");
    }

    @ExceptionHandler(PollNotActiveException.class)
    ResponseEntity<ProblemDetail> pollNotActive(PollNotActiveException exception) {
        return problem(HttpStatus.CONFLICT, "poll-not-active", "The poll is not active.");
    }

    @ExceptionHandler({IllegalStateException.class, CatalogNameAlreadyExistsException.class, DataIntegrityViolationException.class})
    ResponseEntity<ProblemDetail> invalidState(RuntimeException exception) {
        return problem(HttpStatus.CONFLICT, "invalid-state", "The requested operation conflicts with the current state.");
    }
}
