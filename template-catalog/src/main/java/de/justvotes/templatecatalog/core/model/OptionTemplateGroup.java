package de.justvotes.templatecatalog.core.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "OptionTemplateGroup")
public class OptionTemplateGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String name;
    private String description;

    @ManyToMany
    @JoinTable(name = "OptionTemplateGroupMember",
            joinColumns = @JoinColumn(name = "groupID"),
            inverseJoinColumns = @JoinColumn(name = "templateID"))
    private final Set<OptionTemplate> templates = new LinkedHashSet<>();

    protected OptionTemplateGroup() {
    }

    public OptionTemplateGroup(String name, String description) {
        this.name = name;
        this.description = description;
    }

    public long id() { return id; }
    public String name() { return name; }
    public String description() { return description; }
    public Set<OptionTemplate> templates() { return Collections.unmodifiableSet(templates); }
    public void rename(String name) { this.name = name; }

    public void addTemplate(OptionTemplate template) {
        if (templates.add(template)) template.addToGroup(this);
    }

    public void removeTemplate(OptionTemplate template) {
        if (templates.remove(template)) template.removeFromGroup(this);
    }
}
