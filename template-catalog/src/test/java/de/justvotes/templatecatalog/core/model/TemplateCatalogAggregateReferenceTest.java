package de.justvotes.templatecatalog.core.model;

import de.justvotes.templatecatalog.core.model.OptionTemplate.OptionTemplateId;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup.OptionTemplateGroupId;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TemplateCatalogAggregateReferenceTest {
    @Test
    void templateContainsGroupReferencesInsteadOfGroups() {
        OptionTemplateGroupId groupReference = OptionTemplateGroupId.of(3);
        OptionTemplate template = new OptionTemplate(OptionTemplateId.of(7), "Vorstand", Set.of(groupReference));

        assertEquals(Set.of(groupReference), template.groupReferences());
    }

    @Test
    void groupContainsTemplateReferencesInsteadOfTemplates() {
        OptionTemplateId templateReference = OptionTemplateId.of(7);
        OptionTemplateGroup group = new OptionTemplateGroup(OptionTemplateGroupId.of(3), "Leitung", "", Set.of(templateReference));

        assertEquals(Set.of(templateReference), group.templateReferences());
    }
}
