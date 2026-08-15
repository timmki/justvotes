package de.justvotes.templatecatalog.core.ports.in;

import de.justvotes.templatecatalog.core.model.OptionTemplate;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup;

public interface ManageTemplateCatalog {
    OptionTemplate createTemplate(String name);
    OptionTemplate renameTemplate(long templateId, String name);
    void deleteTemplate(long templateId);
    OptionTemplateGroup createGroup(String name, String description);
    OptionTemplateGroup renameGroup(long groupId, String name);
    void deleteGroup(long groupId);
    void assignTemplateToGroup(long templateId, long groupId);
    void removeTemplateFromGroup(long templateId, long groupId);
}
