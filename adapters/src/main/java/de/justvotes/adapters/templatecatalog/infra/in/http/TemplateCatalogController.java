package de.justvotes.adapters.templatecatalog.infra.in.http;

import de.justvotes.templatecatalog.core.CatalogNameAlreadyExistsException;
import de.justvotes.templatecatalog.core.CatalogItemNotFoundException;
import de.justvotes.templatecatalog.core.model.OptionTemplate;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup;
import de.justvotes.templatecatalog.core.ports.in.ManageTemplateCatalog;
import de.justvotes.templatecatalog.core.ports.in.ViewTemplateCatalog;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/template-catalog")
public final class TemplateCatalogController {
    private final ManageTemplateCatalog commands;
    private final ViewTemplateCatalog queries;

    public TemplateCatalogController(ManageTemplateCatalog commands, ViewTemplateCatalog queries) {
        this.commands = commands;
        this.queries = queries;
    }

    @GetMapping("/templates")
    public List<TemplateResponse> templates() {
        return queries.templates().stream().map(TemplateResponse::from).toList();
    }

    @PostMapping("/templates")
    public ResponseEntity<TemplateResponse> createTemplate(@RequestBody NameRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(TemplateResponse.from(commands.createTemplate(request.name())));
    }

    @PatchMapping("/templates/{id}")
    public TemplateResponse renameTemplate(@PathVariable("id") long id, @RequestBody NameRequest request) {
        return TemplateResponse.from(commands.renameTemplate(id, request.name()));
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable("id") long id) {
        commands.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/groups")
    public List<GroupResponse> groups() {
        return queries.groups().stream().map(GroupResponse::from).toList();
    }

    @PostMapping("/groups")
    public ResponseEntity<GroupResponse> createGroup(@RequestBody GroupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(GroupResponse.from(commands.createGroup(request.name(), request.description())));
    }

    @PatchMapping("/groups/{id}")
    public GroupResponse renameGroup(@PathVariable("id") long id, @RequestBody NameRequest request) {
        return GroupResponse.from(commands.renameGroup(id, request.name()));
    }

    @DeleteMapping("/groups/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable("id") long id) {
        commands.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/groups/{groupId}/templates/{templateId}")
    public ResponseEntity<Void> assign(@PathVariable("groupId") long groupId, @PathVariable("templateId") long templateId) {
        commands.assignTemplateToGroup(templateId, groupId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/groups/{groupId}/templates/{templateId}")
    public ResponseEntity<Void> remove(@PathVariable("groupId") long groupId, @PathVariable("templateId") long templateId) {
        commands.removeTemplateFromGroup(templateId, groupId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/groups/{groupId}/templates")
    public List<TemplateResponse> templatesInGroup(@PathVariable("groupId") long groupId) {
        return queries.templatesInGroup(groupId).stream().map(TemplateResponse::from).toList();
    }

    @ExceptionHandler({CatalogNameAlreadyExistsException.class, DataIntegrityViolationException.class})
    ResponseEntity<ProblemDetail> invalidCatalogChange(RuntimeException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, exception.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ProblemDetail> invalidCatalogInput(IllegalArgumentException exception) {
        return ResponseEntity.badRequest()
                .body(ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage()));
    }

    @ExceptionHandler(CatalogItemNotFoundException.class)
    ResponseEntity<ProblemDetail> missingCatalogItem(CatalogItemNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, exception.getMessage()));
    }

    public record NameRequest(String name) { }

    public record GroupRequest(String name, String description) { }

    public record TemplateResponse(long id, String name) {
        static TemplateResponse from(OptionTemplate template) {
            return new TemplateResponse(template.id(), template.name());
        }
    }

    public record GroupResponse(long id, String name, String description) {
        static GroupResponse from(OptionTemplateGroup group) {
            return new GroupResponse(group.id(), group.name(), group.description());
        }
    }
}
