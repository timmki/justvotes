package de.justvotes.accountmanagement.core.ports.in;

import de.justvotes.accountmanagement.core.model.AdminProvisioning;

public interface ProvisionAdmin {
    AdminProvisioning provisionAdmin(String email, String passwordHash, boolean resetPassword);
}
