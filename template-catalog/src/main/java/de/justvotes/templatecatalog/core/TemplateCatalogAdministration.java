package de.justvotes.templatecatalog.core;

import de.justvotes.templatecatalog.core.model.OptionTemplate;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup;
import de.justvotes.templatecatalog.core.ports.in.ManageTemplateCatalog;
import de.justvotes.templatecatalog.core.ports.in.ViewTemplateCatalog;
import de.justvotes.templatecatalog.core.ports.out.OptionTemplateGroupRepository;
import de.justvotes.templatecatalog.core.ports.out.OptionTemplateRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public class TemplateCatalogAdministration implements ManageTemplateCatalog, ViewTemplateCatalog {
    private final OptionTemplateRepository templates;
    private final OptionTemplateGroupRepository groups;

    public TemplateCatalogAdministration(OptionTemplateRepository templates, OptionTemplateGroupRepository groups) {
        this.templates = templates;
        this.groups = groups;
    }

    @Override
    public OptionTemplate createTemplate(String name) {
        String validName = validName(name);
        ensureNameIsAvailable(validName);
        return templates.save(new OptionTemplate(validName));
    }

    @Override @Transactional public OptionTemplate renameTemplate(long templateId, String name) {
        String validName = validName(name);
        ensureNameIsAvailable(validName, templateId, null);
        OptionTemplate template = template(templateId);
        template.rename(validName);
        return template;
    }

    @Override @Transactional public void deleteTemplate(long templateId) {
        OptionTemplate template = template(templateId);
        groups.findAllByTemplatesContaining(template).forEach(group -> group.removeTemplate(template));
        templates.delete(template);
    }

    @Override
    public OptionTemplateGroup createGroup(String name, String description) {
        String validName = validName(name);
        ensureNameIsAvailable(validName);
        return groups.save(new OptionTemplateGroup(validName, description == null ? "" : description.trim()));
    }

    @Override @Transactional public OptionTemplateGroup renameGroup(long groupId, String name) {
        String validName = validName(name);
        ensureNameIsAvailable(validName, null, groupId);
        OptionTemplateGroup group = group(groupId);
        group.rename(validName);
        return group;
    }

    @Override @Transactional public void deleteGroup(long groupId) { groups.delete(group(groupId)); }

    @Override @Transactional public void assignTemplateToGroup(long templateId, long groupId) { group(groupId).addTemplate(template(templateId)); }
    @Override @Transactional public void removeTemplateFromGroup(long templateId, long groupId) { group(groupId).removeTemplate(template(templateId)); }
    @Override public List<OptionTemplate> templates() { return templates.findAll(); }
    @Override public List<OptionTemplateGroup> groups() { return groups.findAll(); }
    @Override @Transactional public List<OptionTemplate> templatesInGroup(long groupId) { return List.copyOf(group(groupId).templates()); }

    private void ensureNameIsAvailable(String name) {
        if (templates.findByNormalizedName(normalizedName(name)).isPresent()
                || groups.findByNormalizedName(normalizedName(name)).isPresent()) {
            throw new CatalogNameAlreadyExistsException(name);
        }
    }

    private void ensureNameIsAvailable(String name, Long templateId, Long groupId) {
        boolean usedByAnotherTemplate = templates.findByNormalizedName(normalizedName(name))
                .filter(template -> templateId == null || template.id() != templateId).isPresent();
        boolean usedByAnotherGroup = groups.findByNormalizedName(normalizedName(name))
                .filter(group -> groupId == null || group.id() != groupId).isPresent();
        if (usedByAnotherTemplate || usedByAnotherGroup) {
            throw new CatalogNameAlreadyExistsException(name);
        }
    }

    private static String validName(String name) {
        if (name == null || name.trim().isEmpty()) throw new IllegalArgumentException("A catalog name must not be blank.");
        return name.trim();
    }

    private OptionTemplate template(long id) {
        return templates.findById(Math.toIntExact(id)).orElseThrow(() -> new CatalogItemNotFoundException("Template", id));
    }

    private OptionTemplateGroup group(long id) {
        return groups.findById(Math.toIntExact(id)).orElseThrow(() -> new CatalogItemNotFoundException("Template group", id));
    }

    private static String normalizedName(String name) {
        return name.trim().toLowerCase(java.util.Locale.ROOT);
    }
}
