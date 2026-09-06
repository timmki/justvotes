package de.justvotes.adapters.templatecatalog.infra.in.transaction;

import de.justvotes.templatecatalog.core.model.OptionTemplate;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup;
import de.justvotes.templatecatalog.core.ports.in.ManageTemplateCatalog;
import de.justvotes.templatecatalog.core.ports.in.ViewTemplateCatalog;
import de.justvotes.adapters.sqlite.SqliteRetryingTransaction;

import java.util.List;

public class TransactionalTemplateCatalogAdministration implements ManageTemplateCatalog, ViewTemplateCatalog {
    private final ManageTemplateCatalog commands;
    private final ViewTemplateCatalog queries;
    private final SqliteRetryingTransaction transactions;

    public TransactionalTemplateCatalogAdministration(ManageTemplateCatalog commands, ViewTemplateCatalog queries,
                                                     SqliteRetryingTransaction transactions) {
        this.commands = commands;
        this.queries = queries;
        this.transactions = transactions;
    }

    @Override
    public OptionTemplate createTemplate(String name) {
        return transactions.execute(() -> commands.createTemplate(name));
    }

    @Override
    public OptionTemplate renameTemplate(long templateId, String name) {
        return transactions.execute(() -> commands.renameTemplate(templateId, name));
    }

    @Override
    public void deleteTemplate(long templateId) {
        transactions.execute(() -> {
            commands.deleteTemplate(templateId);
            return null;
        });
    }

    @Override
    public OptionTemplateGroup createGroup(String name, String description) {
        return transactions.execute(() -> commands.createGroup(name, description));
    }

    @Override
    public OptionTemplateGroup renameGroup(long groupId, String name) {
        return transactions.execute(() -> commands.renameGroup(groupId, name));
    }

    @Override
    public void deleteGroup(long groupId) {
        transactions.execute(() -> {
            commands.deleteGroup(groupId);
            return null;
        });
    }

    @Override
    public OptionTemplateGroup assignTemplateToGroup(long templateId, long groupId) {
        return transactions.execute(() -> commands.assignTemplateToGroup(templateId, groupId));
    }

    @Override
    public OptionTemplateGroup removeTemplateFromGroup(long templateId, long groupId) {
        return transactions.execute(() -> commands.removeTemplateFromGroup(templateId, groupId));
    }

    @Override
    public List<OptionTemplate> templates() {
        return transactions.executeReadOnly(queries::templates);
    }

    @Override
    public List<OptionTemplateGroup> groups() {
        return transactions.executeReadOnly(queries::groups);
    }

    @Override
    public List<OptionTemplate> templatesInGroup(long groupId) {
        return transactions.executeReadOnly(() -> queries.templatesInGroup(groupId));
    }
}
