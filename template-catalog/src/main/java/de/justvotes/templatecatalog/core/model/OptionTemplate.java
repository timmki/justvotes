package de.justvotes.templatecatalog.core.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "OptionTemplate")
public class OptionTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String name;

    @ManyToMany(mappedBy = "templates")
    private final Set<OptionTemplateGroup> groups = new LinkedHashSet<>();

    protected OptionTemplate() {
    }

    public OptionTemplate(String name) {
        this.name = name;
    }

    public long id() { return id; }
    public String name() { return name; }
    public Set<OptionTemplateGroup> groups() { return Collections.unmodifiableSet(groups); }
    public void rename(String name) { this.name = name; }

    void addToGroup(OptionTemplateGroup group) { groups.add(group); }
    void removeFromGroup(OptionTemplateGroup group) { groups.remove(group); }
}
