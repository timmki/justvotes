package de.justvotes.adapters.templatecatalog.infra.out.persistence;

import jakarta.persistence.*;

import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "OptionTemplateGroup")
public class OptionTemplateGroupEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String name;
    private String description;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "OptionTemplateGroupMember",
            joinColumns = @JoinColumn(name = "groupID"),
            inverseJoinColumns = @JoinColumn(name = "templateID"))
    private Set<OptionTemplateEntity> templates = new LinkedHashSet<>();

    protected OptionTemplateGroupEntity() {
    }

    OptionTemplateGroupEntity(String name, String description) {
        this.name = name;
        this.description = description;
    }

    Integer id() {
        return id;
    }

    String name() {
        return name;
    }

    String description() {
        return description;
    }

    void rename(String name) {
        this.name = name;
    }

    Set<OptionTemplateEntity> templates() {
        return templates;
    }
}
