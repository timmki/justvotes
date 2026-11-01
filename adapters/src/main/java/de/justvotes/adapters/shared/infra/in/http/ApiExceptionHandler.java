package de.justvotes.adapters.shared.infra.in.http;

import de.justvotes.accountmanagement.core.exception.AccountNotFoundException;
import de.justvotes.accountmanagement.core.exception.AccountNotManageableException;
import de.justvotes.accountmanagement.core.exception.ContactImportInvalidException;
import de.justvotes.accountmanagement.core.exception.ContactImportTooManyException;
import de.justvotes.accountmanagement.core.exception.CurrentPasswordInvalidException;
import de.justvotes.accountmanagement.core.exception.EmailAlreadyInvitedException;
import de.justvotes.accountmanagement.core.exception.IdentityTakenException;
import de.justvotes.accountmanagement.core.exception.InvalidAccountInputException;
import de.justvotes.accountmanagement.core.exception.InvalidCredentialsException;
import de.justvotes.accountmanagement.core.exception.InvitationDeliveryUnavailableException;
import de.justvotes.accountmanagement.core.exception.InvitationNotFoundException;
import de.justvotes.accountmanagement.core.exception.InvitationNotUsableException;
import de.justvotes.accountmanagement.core.exception.PasswordPolicyViolationException;
import de.justvotes.pollmanagement.core.exception.PollNotActiveException;
import de.justvotes.pollmanagement.core.exception.PollNotFoundException;
import de.justvotes.pollmanagement.core.exception.ResultsNotAvailableException;
import de.justvotes.pollmanagement.core.exception.VoteNotFoundException;
import de.justvotes.templatecatalog.core.exception.CatalogItemNotFoundException;
import de.justvotes.templatecatalog.core.exception.CatalogNameAlreadyExistsException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.ResponseEntity.BodyBuilder;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.method.MethodValidationException;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.net.URI;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public final class ApiExceptionHandler {
    private static ResponseEntity<ProblemDetail> problem(HttpStatus status, String code, String detail) {
        if (detail == null) {
            detail = status.getReasonPhrase();
        }
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setType(URI.create("https://justvotes.de/problems/" + code));
        problem.setProperty("code", code);
        BodyBuilder response = ResponseEntity.status(status).contentType(MediaType.APPLICATION_PROBLEM_JSON);
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

    @ExceptionHandler({MethodArgumentNotValidException.class, MethodValidationException.class, ConstraintViolationException.class, IllegalArgumentException.class})
    ResponseEntity<ProblemDetail> invalidInput(Exception exception) {
        return problem(HttpStatus.BAD_REQUEST, "invalid-request", "The request is invalid.");
    }

    @ExceptionHandler(InvalidAccountInputException.class)
    ResponseEntity<ProblemDetail> invalidAccountInput(InvalidAccountInputException exception) {
        ResponseEntity<ProblemDetail> response = problem(HttpStatus.BAD_REQUEST, "invalid-account-input", exception.getMessage());
        response.getBody().setProperty("field", exception.field());
        response.getBody().setProperty("rule", exception.rule());
        return response;
    }

    @ExceptionHandler(ContactImportInvalidException.class)
    ResponseEntity<ProblemDetail> contactImportInvalid(ContactImportInvalidException exception) {
        return problem(HttpStatus.BAD_REQUEST, "contact-import-invalid", exception.getMessage());
    }

    @ExceptionHandler(ContactImportTooManyException.class)
    ResponseEntity<ProblemDetail> contactImportTooMany(ContactImportTooManyException exception) {
        return problem(HttpStatus.BAD_REQUEST, "contact-import-too-many", exception.getMessage());
    }

    @ExceptionHandler(ContactImportTooLargeException.class)
    ResponseEntity<ProblemDetail> contactImportTooLarge(ContactImportTooLargeException exception) {
        return problem(HttpStatus.PAYLOAD_TOO_LARGE, "contact-import-too-large", exception.getMessage());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ProblemDetail> malformedMessage(HttpMessageNotReadableException exception) {
        return problem(HttpStatus.BAD_REQUEST, "invalid-request", "The request is invalid.");
    }

    @ExceptionHandler(ErrorResponseException.class)
    ResponseEntity<ProblemDetail> frameworkError(ErrorResponseException exception) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        String code = "invalid-request";
        if (status == HttpStatus.UNSUPPORTED_MEDIA_TYPE) {
            code = "unsupported-media-type";
        }
        return problem(status, code, "The request is invalid.");
    }

    @ExceptionHandler({PollNotFoundException.class, CatalogItemNotFoundException.class, VoteNotFoundException.class,
            AccountNotFoundException.class, InvitationNotFoundException.class})
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

    @ExceptionHandler(InvalidCredentialsException.class)
    ResponseEntity<ProblemDetail> invalidCredentials(InvalidCredentialsException exception) {
        return problem(HttpStatus.UNAUTHORIZED, "invalid-credentials", "The account name or password is invalid.");
    }

    @ExceptionHandler(IdentityTakenException.class)
    ResponseEntity<ProblemDetail> identityTaken(IdentityTakenException exception) {
        return problem(HttpStatus.CONFLICT, "identity-taken", "The identity is already taken.");
    }

    @ExceptionHandler(EmailAlreadyInvitedException.class)
    ResponseEntity<ProblemDetail> emailAlreadyInvited(EmailAlreadyInvitedException exception) {
        return problem(HttpStatus.CONFLICT, "email-already-invited", "The email address already has an account or an open invitation.");
    }

    @ExceptionHandler(InvitationNotUsableException.class)
    ResponseEntity<ProblemDetail> invitationNotUsable(InvitationNotUsableException exception) {
        return problem(HttpStatus.CONFLICT, "invitation-not-usable", "The invitation has been used, revoked or has expired.");
    }

    @ExceptionHandler(InvitationDeliveryUnavailableException.class)
    ResponseEntity<ProblemDetail> invitationDeliveryUnavailable(InvitationDeliveryUnavailableException exception) {
        return problem(HttpStatus.CONFLICT, "invitation-delivery-unavailable", "Invitations cannot be sent because mail delivery is not configured.");
    }

    @ExceptionHandler(AccountNotManageableException.class)
    ResponseEntity<ProblemDetail> accountNotManageable(AccountNotManageableException exception) {
        return problem(HttpStatus.CONFLICT, "account-not-manageable", "This account cannot be managed this way.");
    }

    @ExceptionHandler(PasswordPolicyViolationException.class)
    ResponseEntity<ProblemDetail> passwordPolicyViolation(PasswordPolicyViolationException exception) {
        return problem(HttpStatus.UNPROCESSABLE_ENTITY, "password-policy-violation", exception.getMessage());
    }

    @ExceptionHandler(CurrentPasswordInvalidException.class)
    ResponseEntity<ProblemDetail> currentPasswordInvalid(CurrentPasswordInvalidException exception) {
        return problem(HttpStatus.UNPROCESSABLE_ENTITY, "current-password-invalid", "The current password is invalid.");
    }
}
