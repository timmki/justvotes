package de.justvotes.templatecatalog.core.model;

import jakarta.persistence.Entity;
import jakarta.persistence.ManyToMany;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class TemplateCatalogJpaMappingTest {
    @Test
    void mapsTheCatalogAggregatesAndTheirMembershipWithJpa() throws NoSuchFieldException {
        assertNotNull(OptionTemplate.class.getAnnotation(Entity.class));
        assertNotNull(OptionTemplateGroup.class.getAnnotation(Entity.class));
        assertNotNull(OptionTemplate.class.getDeclaredField("groups").getAnnotation(ManyToMany.class));
        assertNotNull(OptionTemplateGroup.class.getDeclaredField("templates").getAnnotation(ManyToMany.class));
    }
}
