package de.justvotes.templatecatalog.core.model;

import de.justvotes.templatecatalog.core.exception.CatalogItemManagedException;
import de.justvotes.templatecatalog.core.model.OptionTemplate.OptionTemplateId;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup.OptionTemplateGroupId;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ManagedCatalogItemsTest {
    private static OptionTemplateGroup members() {
        return new OptionTemplateGroup(OptionTemplateGroupId.of(1), "Alle Mitglieder", "", Set.of(), TemplateGroupKind.MEMBERS);
    }

    @Test
    void rejectsManualChangesToTheMembersGroup() {
        OptionTemplateGroup group = members();
        OptionTemplateId template = OptionTemplateId.of(7);

        assertThrows(CatalogItemManagedException.class, () -> group.rename("Andere"));
        assertThrows(CatalogItemManagedException.class, () -> group.description("Neu"));
        assertThrows(CatalogItemManagedException.class, () -> group.addTemplate(template));
        assertThrows(CatalogItemManagedException.class, () -> group.removeTemplate(template));
        assertThrows(CatalogItemManagedException.class, group::requireUnmanaged);
    }

    @Test
    void acceptsMemberTemplatesOnlyThroughTheSynchronisation() {
        OptionTemplateGroup group = members();

        group.addMember(OptionTemplateId.of(7));

        assertEquals(Set.of(OptionTemplateId.of(7)), group.templateReferences());
        assertThrows(IllegalStateException.class, () -> new OptionTemplateGroup("Gremium", "").addMember(OptionTemplateId.of(7)));
    }

    @Test
    void protectsMemberTemplatesAgainstRenameAndDeletion() {
        OptionTemplate template = OptionTemplate.forMember("anna");

        assertTrue(template.managed());
        assertThrows(CatalogItemManagedException.class, () -> template.rename("berta"));
        assertThrows(CatalogItemManagedException.class, template::requireUnmanaged);
    }
}
