package de.justvotes.templatecatalog.core.exception;

import de.justvotes.templatecatalog.core.model.OptionTemplate;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup;

public final class CatalogItemNotFoundException extends RuntimeException {
    public CatalogItemNotFoundException(String type, OptionTemplate.OptionTemplateId id) {
        this(type, id.value());
    }

    public CatalogItemNotFoundException(String type, OptionTemplateGroup.OptionTemplateGroupId id) {
        this(type, id.value());
    }

    public CatalogItemNotFoundException(String type, long id) {
        super(type + " " + id + " does not exist.");
    }
}
