package de.justvotes.templatecatalog.core;

import de.justvotes.templatecatalog.core.exception.CatalogItemManagedException;
import de.justvotes.templatecatalog.core.model.OptionTemplate;
import de.justvotes.templatecatalog.core.model.OptionTemplate.OptionTemplateId;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup.OptionTemplateGroupId;
import de.justvotes.templatecatalog.core.model.TemplateGroupKind;
import de.justvotes.templatecatalog.core.ports.out.OptionTemplateGroupRepository;
import de.justvotes.templatecatalog.core.ports.out.OptionTemplateRepository;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TemplateCatalogAdministrationTest {
    private final InMemoryTemplates templates = new InMemoryTemplates();
    private final InMemoryGroups groups = new InMemoryGroups();
    private final TemplateCatalogAdministration catalog = new TemplateCatalogAdministration(templates, groups);

    TemplateCatalogAdministrationTest() {
        groups.save(new OptionTemplateGroup(OptionTemplateGroupId.newId(), "Alle Mitglieder", "", Set.of(), TemplateGroupKind.MEMBERS));
    }

    private List<String> memberNames() {
        return catalog.templatesInGroup(groups.findMembersGroup().orElseThrow().id().value()).stream().map(OptionTemplate::name).toList();
    }

    @Test
    void addsAJoiningMemberOnceToTheMembersGroup() {
        catalog.memberJoined("anna");
        catalog.memberJoined("anna");
        catalog.memberJoined(" ");

        assertEquals(List.of("anna"), memberNames());
        assertTrue(templates.findByMemberIdentity("anna").orElseThrow().managed());
    }

    @Test
    void takesOverAnExistingTemplateNamedLikeTheMember() {
        OptionTemplate existing = catalog.createTemplate("anna");

        catalog.memberJoined("Anna");

        assertEquals(1, catalog.templates().size());
        assertEquals(existing.id(), templates.findByMemberIdentity("anna").orElseThrow().id());
        assertEquals(List.of("anna"), memberNames());
    }

    @Test
    void rejectsChangingTheMembersGroupOrAMemberTemplate() {
        catalog.memberJoined("anna");
        long groupId = groups.findMembersGroup().orElseThrow().id().value();
        long templateId = templates.findByMemberIdentity("anna").orElseThrow().id().value();

        assertThrows(CatalogItemManagedException.class, () -> catalog.deleteGroup(groupId));
        assertThrows(CatalogItemManagedException.class, () -> catalog.deleteTemplate(templateId));
        assertThrows(CatalogItemManagedException.class, () -> catalog.renameGroup(groupId, "Neu"));
        assertThrows(CatalogItemManagedException.class, () -> catalog.removeTemplateFromGroup(templateId, groupId));
    }

    private static final class InMemoryTemplates implements OptionTemplateRepository {
        private final Map<Long, OptionTemplate> templates = new LinkedHashMap<>();

        @Override
        public Optional<OptionTemplate> findById(OptionTemplateId id) {
            return Optional.ofNullable(templates.get(id.value()));
        }

        @Override
        public Optional<OptionTemplate> findByNormalizedName(String normalizedName) {
            return templates.values().stream()
                    .filter(template -> template.name().toLowerCase(Locale.ROOT).equals(normalizedName.toLowerCase(Locale.ROOT)))
                    .findFirst();
        }

        @Override
        public Optional<OptionTemplate> findByMemberIdentity(String identity) {
            return templates.values().stream()
                    .filter(template -> template.memberIdentity().map(value -> value.equalsIgnoreCase(identity)).orElse(false))
                    .findFirst();
        }

        @Override
        public List<OptionTemplate> findAll() {
            return new ArrayList<>(templates.values());
        }

        @Override
        public OptionTemplate save(OptionTemplate template) {
            OptionTemplate stored = template;
            if (template.id().isNew()) {
                stored = new OptionTemplate(OptionTemplateId.of(templates.size() + 1L), template.name(), template.groupReferences(),
                        template.memberIdentity().orElse(null));
            }
            templates.put(stored.id().value(), stored);
            return stored;
        }

        @Override
        public void delete(OptionTemplate template) {
            templates.remove(template.id().value());
        }
    }

    private static final class InMemoryGroups implements OptionTemplateGroupRepository {
        private final Map<Long, OptionTemplateGroup> groups = new LinkedHashMap<>();

        @Override
        public Optional<OptionTemplateGroup> findById(OptionTemplateGroupId id) {
            return Optional.ofNullable(groups.get(id.value()));
        }

        @Override
        public Optional<OptionTemplateGroup> findByNormalizedName(String normalizedName) {
            return groups.values().stream()
                    .filter(group -> group.name().toLowerCase(Locale.ROOT).equals(normalizedName.toLowerCase(Locale.ROOT)))
                    .findFirst();
        }

        @Override
        public List<OptionTemplateGroup> findAllReferencing(OptionTemplateId template) {
            return groups.values().stream().filter(group -> group.templateReferences().contains(template)).toList();
        }

        @Override
        public List<OptionTemplateGroup> findAll() {
            return new ArrayList<>(groups.values());
        }

        @Override
        public Optional<OptionTemplateGroup> findMembersGroup() {
            return groups.values().stream().filter(OptionTemplateGroup::managed).findFirst();
        }

        @Override
        public OptionTemplateGroup save(OptionTemplateGroup group) {
            OptionTemplateGroup stored = group;
            if (group.id().isNew()) {
                stored = new OptionTemplateGroup(OptionTemplateGroupId.of(groups.size() + 1L), group.name(), group.description(),
                        group.templateReferences(), group.kind());
            }
            groups.put(stored.id().value(), stored);
            return stored;
        }

        @Override
        public void delete(OptionTemplateGroup group) {
            groups.remove(group.id().value());
        }
    }
}
