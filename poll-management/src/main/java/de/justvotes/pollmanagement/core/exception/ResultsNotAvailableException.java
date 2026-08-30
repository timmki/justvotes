package de.justvotes.pollmanagement.core.exception;

public class ResultsNotAvailableException extends RuntimeException {
    public ResultsNotAvailableException() {
        super("Poll results are only available to participants until the poll expires.");
    }
}
