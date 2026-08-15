package de.justvotes.templatecatalog.core;

public final class CatalogNameAlreadyExistsException extends RuntimeException {
    public CatalogNameAlreadyExistsException(String name) {
        super("A template or template group named '" + name + "' already exists.");
    }
}
