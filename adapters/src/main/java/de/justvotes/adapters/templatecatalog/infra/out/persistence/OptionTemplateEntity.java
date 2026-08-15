package de.justvotes.adapters.templatecatalog.infra.out.persistence;

import jakarta.persistence.*;

import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "OptionTemplate")
public class OptionTemplateEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String name;

    @ManyToMany(mappedBy = "templates", fetch = FetchType.EAGER)
    private Set<OptionTemplateGroupEntity> groups = new LinkedHashSet<>();

    protected OptionTemplateEntity() {
    }

    OptionTemplateEntity(String name) {
        this.name = name;
    }

    Integer id() {
        return id;
    }

    String name() {
        return name;
    }

    void rename(String name) {
        this.name = name;
    }

    Set<OptionTemplateGroupEntity> groups() {
        return groups;
    }
}
