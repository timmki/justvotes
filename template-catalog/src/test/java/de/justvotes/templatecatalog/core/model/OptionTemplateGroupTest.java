package de.justvotes.templatecatalog.core.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OptionTemplateGroupTest {
    @Test
    void managesTemplateMembershipOnBothSidesOfTheRelationship() {
        OptionTemplate template = new OptionTemplate("Vorstand");
        OptionTemplateGroup group = new OptionTemplateGroup("Gremium", "");

        group.addTemplate(template);
        group.removeTemplate(template);

        assertTrue(group.templates().isEmpty());
        assertTrue(template.groups().isEmpty());
    }

    @Test
    void renamesTheGroupWithoutChangingItsOtherState() {
        OptionTemplateGroup group = new OptionTemplateGroup("Gremium", "Leitung");

        group.rename("Beirat");

        assertEquals("Beirat", group.name());
        assertEquals("Leitung", group.description());
    }
}
