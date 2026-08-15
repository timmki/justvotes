package de.justvotes.templatecatalog.core.ports.in;

import de.justvotes.templatecatalog.core.model.OptionTemplate;
import de.justvotes.templatecatalog.core.model.OptionTemplateGroup;

import java.util.List;

public interface ViewTemplateCatalog {
    List<OptionTemplate> templates();
    List<OptionTemplateGroup> groups();
    List<OptionTemplate> templatesInGroup(long groupId);
}
