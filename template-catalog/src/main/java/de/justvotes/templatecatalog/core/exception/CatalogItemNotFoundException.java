package de.justvotes.templatecatalog.core.exception;

import de.justvotes.templatecatalog.core.model.OptionTemplate.OptionTemplateId;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup.OptionTemplateGroupId;

public final class CatalogItemNotFoundException extends RuntimeException {
    public CatalogItemNotFoundException(String type, OptionTemplateId id) {
        this(type, id.value());
    }

    public CatalogItemNotFoundException(String type, OptionTemplateGroupId id) {
        this(type, id.value());
    }

    public CatalogItemNotFoundException(String type, long id) {
        super(type + " " + id + " does not exist.");
    }
}
