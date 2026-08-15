package de.justvotes.templatecatalog.core;

public final class CatalogItemNotFoundException extends RuntimeException {
    public CatalogItemNotFoundException(String type, long id) {
        super(type + " " + id + " does not exist.");
    }
}
