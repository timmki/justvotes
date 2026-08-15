package de.justvotes.templatecatalog.core.model;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TemplateCatalogAggregateReferenceTest {
    @Test
    void templateContainsGroupReferencesInsteadOfGroups() {
        OptionTemplateGroup.OptionTemplateGroupId groupReference = OptionTemplateGroup.OptionTemplateGroupId.of(3);
        OptionTemplate template = new OptionTemplate(OptionTemplate.OptionTemplateId.of(7), "Vorstand", Set.of(groupReference));

        assertEquals(Set.of(groupReference), template.groupReferences());
    }

    @Test
    void groupContainsTemplateReferencesInsteadOfTemplates() {
        OptionTemplate.OptionTemplateId templateReference = OptionTemplate.OptionTemplateId.of(7);
        OptionTemplateGroup group = new OptionTemplateGroup(OptionTemplateGroup.OptionTemplateGroupId.of(3), "Leitung", "", Set.of(templateReference));

        assertEquals(Set.of(templateReference), group.templateReferences());
    }
}
