package de.justvotes.templatecatalog.core;

import de.justvotes.templatecatalog.core.exception.CatalogItemNotFoundException;
import de.justvotes.templatecatalog.core.exception.CatalogNameAlreadyExistsException;
import de.justvotes.templatecatalog.core.model.OptionTemplate;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup;
import de.justvotes.templatecatalog.core.ports.in.ManageTemplateCatalog;
import de.justvotes.templatecatalog.core.ports.in.ViewTemplateCatalog;
import de.justvotes.templatecatalog.core.ports.out.OptionTemplateGroupRepository;
import de.justvotes.templatecatalog.core.ports.out.OptionTemplateRepository;
import io.vavr.API;
import io.vavr.control.Try;

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
        return Try.success(name)
                .map(this::ensureNameIsAvailable)
                .map(OptionTemplate::new)
                .map(templates::save)
                .get();
    }

    @Override
    public OptionTemplate renameTemplate(long templateId, String name) {
        return Try.of(() -> OptionTemplate.OptionTemplateId.of(templateId))
                .map(this::template)
                .andThen(template -> ensureNameIsAvailable(name, template.id(), null))
                .map(template -> template.rename(name))
                .map(templates::save)
                .get();
    }

    @Override
    public void deleteTemplate(long templateId) {
        Try.of(() -> OptionTemplate.OptionTemplateId.of(templateId))
                .map(this::template)
                .andThen(template -> this.groups.findAllReferencing(OptionTemplate.OptionTemplateId.of(templateId))
                        .forEach(group -> {
                            group.removeTemplate(OptionTemplate.OptionTemplateId.of(templateId));
                            groups.save(group);
                        }))
                .andThen(templates::delete)
                .get();
    }

    @Override
    public OptionTemplateGroup createGroup(String name, String description) {
        return Try.success(name)
                .map(this::ensureNameIsAvailable)
                .map(validName -> new OptionTemplateGroup(validName, description))
                .map(groups::save)
                .get();
    }

    @Override
    public OptionTemplateGroup renameGroup(long groupId, String name) {
        return Try.of(() -> OptionTemplateGroup.OptionTemplateGroupId.of(groupId))
                .map(this::group)
                .andThen(group -> ensureNameIsAvailable(name, null, group.id()))
                .map(group -> group.rename(name))
                .map(groups::save)
                .get();
    }

    @Override
    public void deleteGroup(long groupId) {
        Try.of(() -> OptionTemplateGroup.OptionTemplateGroupId.of(groupId))
                .map(this::group)
                .andThen(groups::delete)
                .get();
    }

    @Override
    public OptionTemplateGroup assignTemplateToGroup(long templateId, long groupId) {
        Try<OptionTemplate> templateIdTry = Try.of(() -> OptionTemplate.OptionTemplateId.of(templateId))
                .mapTry(this::template);
        Try<OptionTemplateGroup> groupIdTry = Try.of(() -> OptionTemplateGroup.OptionTemplateGroupId.of(groupId))
                .mapTry(this::group);

        return API.For(templateIdTry, groupIdTry).yield((template, group) -> {
            group.addTemplate(template.id());
            return groups.save(group);
        }).get();
    }

    @Override
    public OptionTemplateGroup removeTemplateFromGroup(long templateId, long groupId) {
        Try<OptionTemplate> templateIdTry = Try.of(() -> OptionTemplate.OptionTemplateId.of(templateId))
                .mapTry(this::template);
        Try<OptionTemplateGroup> groupIdTry = Try.of(() -> OptionTemplateGroup.OptionTemplateGroupId.of(groupId))
                .mapTry(this::group);

        return API.For(templateIdTry, groupIdTry).yield((template, group) -> {
            group.removeTemplate(template.id());
            return groups.save(group);
        }).get();
    }

    @Override
    public List<OptionTemplate> templates() {
        return templates.findAll();
    }

    @Override
    public List<OptionTemplateGroup> groups() {
        return groups.findAll();
    }

    @Override
    public List<OptionTemplate> templatesInGroup(long groupId) {
        return group(OptionTemplateGroup.OptionTemplateGroupId.of(groupId))
                .templateReferences().stream()
                .map(this::template)
                .toList();
    }

    private String ensureNameIsAvailable(String name) {
        if (templates.findByNormalizedName(name).isPresent()
                || groups.findByNormalizedName(name).isPresent()) {
            throw new CatalogNameAlreadyExistsException(name);
        }
        return name;
    }

    private void ensureNameIsAvailable(String name, OptionTemplate.OptionTemplateId templateId, OptionTemplateGroup.OptionTemplateGroupId groupId) {
        boolean usedByAnotherTemplate = templates.findByNormalizedName(name)
                .filter(template -> !template.id().equals(templateId)).isPresent();
        boolean usedByAnotherGroup = groups.findByNormalizedName(name)
                .filter(group -> !group.id().equals(groupId)).isPresent();
        if (usedByAnotherTemplate || usedByAnotherGroup) {
            throw new CatalogNameAlreadyExistsException(name);
        }
    }

    private OptionTemplate template(OptionTemplate.OptionTemplateId id) {
        return templates.findById(id).orElseThrow(() -> new CatalogItemNotFoundException("Template", id));
    }

    private OptionTemplateGroup group(OptionTemplateGroup.OptionTemplateGroupId id) {
        return groups.findById(id).orElseThrow(() -> new CatalogItemNotFoundException("Template group", id));
    }
}
