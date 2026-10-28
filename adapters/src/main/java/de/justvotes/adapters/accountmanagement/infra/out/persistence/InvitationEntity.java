package de.justvotes.adapters.accountmanagement.infra.out.persistence;

import de.justvotes.accountmanagement.core.model.AccountId;
import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.model.Invitation;
import de.justvotes.accountmanagement.core.model.InvitationId;
import de.justvotes.accountmanagement.core.model.InvitationStatus;
import de.justvotes.accountmanagement.core.model.InvitationTokenHash;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "Invitation")
public class InvitationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String email;
    @Column(name = "emailKey")
    private String emailKey;
    @Column(name = "tokenHash")
    private String tokenHash;
    private String status;
    @Column(name = "deliveryFailed")
    private int deliveryFailed;
    @Column(name = "issuedAt")
    private String issuedAt;
    @Column(name = "expiresAt")
    private String expiresAt;
    @Column(name = "acceptedAt")
    private String acceptedAt;
    @Column(name = "acceptedAccountId")
    private Integer acceptedAccountId;

    protected InvitationEntity() {
    }

    static InvitationEntity from(Invitation invitation) {
        InvitationEntity entity = new InvitationEntity();
        entity.apply(invitation);
        return entity;
    }

    void apply(Invitation invitation) {
        email = invitation.email().value();
        emailKey = invitation.email().normalized();
        tokenHash = invitation.tokenHash().value();
        status = invitation.status().name();
        deliveryFailed = AccountEntity.flag(invitation.deliveryFailed());
        issuedAt = invitation.issuedAt().toString();
        expiresAt = invitation.expiresAt().toString();
        acceptedAt = invitation.acceptedAt().map(Instant::toString).orElse(null);
        acceptedAccountId = invitation.acceptedAccountId().map(accountId -> Math.toIntExact(accountId.value())).orElse(null);
    }

    Invitation toDomain() {
        Instant accepted = null;
        if (acceptedAt != null) {
            accepted = Instant.parse(acceptedAt);
        }
        AccountId acceptedAccount = null;
        if (acceptedAccountId != null) {
            acceptedAccount = AccountId.of(acceptedAccountId);
        }
        return Invitation.restore(InvitationId.of(id), EmailAddress.of(email), InvitationTokenHash.of(tokenHash),
                InvitationStatus.valueOf(status), deliveryFailed != 0, Instant.parse(issuedAt), Instant.parse(expiresAt),
                accepted, acceptedAccount);
    }
}
