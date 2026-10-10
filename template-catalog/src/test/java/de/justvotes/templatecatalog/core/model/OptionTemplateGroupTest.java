package de.justvotes.templatecatalog.core.model;

import de.justvotes.templatecatalog.core.model.OptionTemplate.OptionTemplateId;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup.OptionTemplateGroupId;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OptionTemplateGroupTest {
    @Test
    void managesTemplateMembershipByReference() {
        OptionTemplateId template = OptionTemplateId.of(7);
        OptionTemplateGroup group = new OptionTemplateGroup(OptionTemplateGroupId.of(3), "Gremium", "", Set.of());

        group.addTemplate(template);
        group.removeTemplate(template);

        assertTrue(group.templateReferences().isEmpty());
    }

    @Test
    void renamesTheGroupWithoutChangingItsOtherState() {
        OptionTemplateGroup group = new OptionTemplateGroup("Gremium", "Leitung");

        group.rename("Beirat");

        assertEquals("Beirat", group.name());
        assertEquals("Leitung", group.description());
    }
}
