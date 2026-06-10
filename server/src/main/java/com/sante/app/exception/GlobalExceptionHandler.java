package com.sante.app.exception;

import com.sante.app.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // Shared response builder keeps handlers concise while preserving status-specific behavior.
    private ResponseEntity<ApiResponse<Void>> errorResponse(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(ApiResponse.error(message));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex) {
        return errorResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(BadRequestException ex) {
        return errorResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnauthorized(UnauthorizedException ex) {
        return errorResponse(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleForbidden(AccessDeniedException ex) {
        return errorResponse(HttpStatus.FORBIDDEN, "Accès refusé. Droits insuffisants.");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        ApiResponse<Map<String, String>> response = new ApiResponse<>(false, "Erreur de validation", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return errorResponse(HttpStatus.PAYLOAD_TOO_LARGE, "La pièce jointe dépasse la taille maximale autorisée.");
    }

    @ExceptionHandler(RedisConnectionFailureException.class)
    public ResponseEntity<ApiResponse<Void>> handleRedisUnavailable(RedisConnectionFailureException ex) {
        log.error("Redis indisponible: {}", ex.getMessage());
        return errorResponse(HttpStatus.SERVICE_UNAVAILABLE, "Service OTP temporairement indisponible (Redis inaccessible).");
    }

    @ExceptionHandler(MailException.class)
    public ResponseEntity<ApiResponse<Void>> handleMailUnavailable(MailException ex) {
        log.error("Service email OTP indisponible: {}", ex.getMessage());
        return errorResponse(HttpStatus.SERVICE_UNAVAILABLE, "Service email OTP temporairement indisponible.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception ex) {
        log.error("Erreur inattendue: ", ex);
        return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Une erreur interne s'est produite.");
    }
}
