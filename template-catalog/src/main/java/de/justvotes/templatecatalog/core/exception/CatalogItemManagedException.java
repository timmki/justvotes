package de.justvotes.templatecatalog.core.exception;

public final class CatalogItemManagedException extends RuntimeException {
    public CatalogItemManagedException(String item, Object id) {
        super(item + " " + id + " is maintained automatically and cannot be changed manually.");
    }
}
