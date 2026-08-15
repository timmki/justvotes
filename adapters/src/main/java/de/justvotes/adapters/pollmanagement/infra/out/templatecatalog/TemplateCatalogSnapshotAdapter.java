package de.justvotes.adapters.pollmanagement.infra.out.templatecatalog;

import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.TemplateGroupSnapshot;
import de.justvotes.pollmanagement.core.ports.out.TemplateGroupSnapshotProvider;
import de.justvotes.templatecatalog.core.ports.in.ViewTemplateCatalog;

public final class TemplateCatalogSnapshotAdapter implements TemplateGroupSnapshotProvider {
    private final ViewTemplateCatalog catalog;

    public TemplateCatalogSnapshotAdapter(ViewTemplateCatalog catalog) {
        this.catalog = catalog;
    }

    @Override
    public TemplateGroupSnapshot snapshotOf(Poll.TemplateGroupId templateGroupId) {
        var group = catalog.groups().stream().filter(candidate -> candidate.id().value() == templateGroupId.value()).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Template group not found: " + templateGroupId.value()));
        return new TemplateGroupSnapshot(templateGroupId, group.name(), catalog.templatesInGroup(templateGroupId.value()).stream().map(template -> template.name()).toList());
    }
}
