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
    @Column(name = "memberIdentityKey")
    private String memberIdentityKey;

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

    String memberIdentityKey() {
        return memberIdentityKey;
    }

    void representMember(String memberIdentityKey) {
        this.memberIdentityKey = memberIdentityKey;
    }

    Set<OptionTemplateGroupEntity> groups() {
        return groups;
    }
}
