package de.justvotes.adapters.templatecatalog.infra.in.http;

import de.justvotes.adapters.shared.infra.in.http.OpaqueIdCodec;
import de.justvotes.api.v1.model.GroupInput;
import de.justvotes.api.v1.model.Name;
import de.justvotes.api.v1.model.Template;
import de.justvotes.api.v1.model.TemplateGroup;
import de.justvotes.api.v1.server.TemplatesApi;
import de.justvotes.templatecatalog.core.model.OptionTemplate;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup;
import de.justvotes.templatecatalog.core.ports.in.ManageTemplateCatalog;
import de.justvotes.templatecatalog.core.ports.in.ViewTemplateCatalog;
import org.springframework.http.CacheControl;
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

    private static Template template(OptionTemplate template) {
        return new Template(OpaqueIdCodec.encode("t", template.id().value()), template.name());
    }

    private static TemplateGroup group(OptionTemplateGroup group) {
        return new TemplateGroup(OpaqueIdCodec.encode("g", group.id().value()), group.name(), group.description());
    }

    private static <T> ResponseEntity<T> noStore(T body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }

    private static <T> ResponseEntity<T> created(T body, String location) {
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore()).header("Location", location).body(body);
    }

    private static ResponseEntity<Void> noContent() {
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    @Override
    public ResponseEntity<List<Template>> templates() {
        return noStore(queries.templates().stream().map(TemplateCatalogController::template).toList());
    }

    @Override
    public ResponseEntity<Template> createTemplate(Name request) {
        var created = template(commands.createTemplate(request.getName()));
        return created(created, "/api/v1/admin/template-catalog/templates/" + created.getId());
    }

    @Override
    public ResponseEntity<Template> renameTemplate(String id, Name request) {
        return noStore(template(commands.renameTemplate(OpaqueIdCodec.decode("t", id), request.getName())));
    }

    @Override
    public ResponseEntity<Void> deleteTemplate(String id) {
        commands.deleteTemplate(OpaqueIdCodec.decode("t", id));
        return noContent();
    }

    @Override
    public ResponseEntity<List<TemplateGroup>> groups() {
        return noStore(queries.groups().stream().map(TemplateCatalogController::group).toList());
    }

    @Override
    public ResponseEntity<TemplateGroup> createGroup(GroupInput request) {
        var created = group(commands.createGroup(request.getName(), request.getDescription()));
        return created(created, "/api/v1/admin/template-catalog/groups/" + created.getId());
    }

    @Override
    public ResponseEntity<TemplateGroup> renameGroup(String id, Name request) {
        return noStore(group(commands.renameGroup(OpaqueIdCodec.decode("g", id), request.getName())));
    }

    @Override
    public ResponseEntity<Void> deleteGroup(String id) {
        commands.deleteGroup(OpaqueIdCodec.decode("g", id));
        return noContent();
    }

    @Override
    public ResponseEntity<Void> assignTemplate(String groupId, String templateId) {
        commands.assignTemplateToGroup(OpaqueIdCodec.decode("t", templateId), OpaqueIdCodec.decode("g", groupId));
        return noContent();
    }

    @Override
    public ResponseEntity<Void> removeTemplate(String groupId, String templateId) {
        commands.removeTemplateFromGroup(OpaqueIdCodec.decode("t", templateId), OpaqueIdCodec.decode("g", groupId));
        return noContent();
    }

    @Override
    public ResponseEntity<List<Template>> templatesInGroup(String groupId) {
        return noStore(queries.templatesInGroup(OpaqueIdCodec.decode("g", groupId)).stream().map(TemplateCatalogController::template).toList());
    }
}
