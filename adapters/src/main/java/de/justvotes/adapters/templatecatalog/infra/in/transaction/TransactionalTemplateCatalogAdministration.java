package de.justvotes.adapters.templatecatalog.infra.in.transaction;

import de.justvotes.templatecatalog.core.model.OptionTemplate;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup;
import de.justvotes.templatecatalog.core.ports.in.ManageTemplateCatalog;
import de.justvotes.templatecatalog.core.ports.in.ViewTemplateCatalog;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public class TransactionalTemplateCatalogAdministration implements ManageTemplateCatalog, ViewTemplateCatalog {
    private final ManageTemplateCatalog commands;
    private final ViewTemplateCatalog queries;

    public TransactionalTemplateCatalogAdministration(ManageTemplateCatalog commands, ViewTemplateCatalog queries) {
        this.commands = commands;
        this.queries = queries;
    }

    @Override
    @Transactional
    public OptionTemplate createTemplate(String name) {
        return commands.createTemplate(name);
    }

    @Override
    @Transactional
    public OptionTemplate renameTemplate(long templateId, String name) {
        return commands.renameTemplate(templateId, name);
    }

    @Override
    @Transactional
    public void deleteTemplate(long templateId) {
        commands.deleteTemplate(templateId);
    }

    @Override
    @Transactional
    public OptionTemplateGroup createGroup(String name, String description) {
        return commands.createGroup(name, description);
    }

    @Override
    @Transactional
    public OptionTemplateGroup renameGroup(long groupId, String name) {
        return commands.renameGroup(groupId, name);
    }

    @Override
    @Transactional
    public void deleteGroup(long groupId) {
        commands.deleteGroup(groupId);
    }

    @Override
    @Transactional
    public OptionTemplateGroup assignTemplateToGroup(long templateId, long groupId) {
        return commands.assignTemplateToGroup(templateId, groupId);
    }

    @Override
    @Transactional
    public OptionTemplateGroup removeTemplateFromGroup(long templateId, long groupId) {
        return commands.removeTemplateFromGroup(templateId, groupId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OptionTemplate> templates() {
        return queries.templates();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OptionTemplateGroup> groups() {
        return queries.groups();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OptionTemplate> templatesInGroup(long groupId) {
        return queries.templatesInGroup(groupId);
    }
}
