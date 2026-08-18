package de.justvotes.adapters.templatecatalog.infra.in.http;

import de.justvotes.adapters.shared.infra.in.http.OpaqueIdCodec;
import de.justvotes.api.v1.server.TemplatesApi;
import de.justvotes.templatecatalog.core.model.OptionTemplate;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup;
import de.justvotes.templatecatalog.core.ports.in.ManageTemplateCatalog;
import de.justvotes.templatecatalog.core.ports.in.ViewTemplateCatalog;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class TemplateCatalogController implements TemplatesApi {
    private final ManageTemplateCatalog commands;
    private final ViewTemplateCatalog queries;

    public TemplateCatalogController(ManageTemplateCatalog commands, ViewTemplateCatalog queries) {
        this.commands = commands;
        this.queries = queries;
    }

    private static de.justvotes.api.v1.model.Template template(OptionTemplate template) {
        return new de.justvotes.api.v1.model.Template(OpaqueIdCodec.encode("t", template.id().value()), template.name());
    }

    private static de.justvotes.api.v1.model.TemplateGroup group(OptionTemplateGroup group) {
        return new de.justvotes.api.v1.model.TemplateGroup(OpaqueIdCodec.encode("g", group.id().value()), group.name(), group.description());
    }

    @Override
    public ResponseEntity<List<de.justvotes.api.v1.model.Template>> templates() {
        return ResponseEntity.ok(queries.templates().stream().map(TemplateCatalogController::template).toList());
    }

    @Override
    public ResponseEntity<de.justvotes.api.v1.model.Template> createTemplate(de.justvotes.api.v1.model.Name request) {
        var created = template(commands.createTemplate(request.getName()));
        return ResponseEntity.status(HttpStatus.CREATED).header("Location", "/api/v1/admin/template-catalog/templates/" + created.getId()).body(created);
    }

    @Override
    public ResponseEntity<de.justvotes.api.v1.model.Template> renameTemplate(String id, de.justvotes.api.v1.model.Name request) {
        return ResponseEntity.ok(template(commands.renameTemplate(OpaqueIdCodec.decode("t", id), request.getName())));
    }

    @Override
    public ResponseEntity<Void> deleteTemplate(String id) {
        commands.deleteTemplate(OpaqueIdCodec.decode("t", id));
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<de.justvotes.api.v1.model.TemplateGroup>> groups() {
        return ResponseEntity.ok(queries.groups().stream().map(TemplateCatalogController::group).toList());
    }

    @Override
    public ResponseEntity<de.justvotes.api.v1.model.TemplateGroup> createGroup(de.justvotes.api.v1.model.GroupInput request) {
        var created = group(commands.createGroup(request.getName(), request.getDescription()));
        return ResponseEntity.status(HttpStatus.CREATED).header("Location", "/api/v1/admin/template-catalog/groups/" + created.getId()).body(created);
    }

    @Override
    public ResponseEntity<de.justvotes.api.v1.model.TemplateGroup> renameGroup(String id, de.justvotes.api.v1.model.Name request) {
        return ResponseEntity.ok(group(commands.renameGroup(OpaqueIdCodec.decode("g", id), request.getName())));
    }

    @Override
    public ResponseEntity<Void> deleteGroup(String id) {
        commands.deleteGroup(OpaqueIdCodec.decode("g", id));
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> assignTemplate(String groupId, String templateId) {
        commands.assignTemplateToGroup(OpaqueIdCodec.decode("t", templateId), OpaqueIdCodec.decode("g", groupId));
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> removeTemplate(String groupId, String templateId) {
        commands.removeTemplateFromGroup(OpaqueIdCodec.decode("t", templateId), OpaqueIdCodec.decode("g", groupId));
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<de.justvotes.api.v1.model.Template>> templatesInGroup(String groupId) {
        return ResponseEntity.ok(queries.templatesInGroup(OpaqueIdCodec.decode("g", groupId)).stream().map(TemplateCatalogController::template).toList());
    }
}
