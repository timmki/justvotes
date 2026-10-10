package de.justvotes.pollmanagement.core.ports.out;

import de.justvotes.pollmanagement.core.model.Poll.TemplateGroupId;
import de.justvotes.pollmanagement.core.model.TemplateGroupSnapshot;

public interface TemplateGroupSnapshotProvider {
    TemplateGroupSnapshot snapshotOf(TemplateGroupId templateGroupId);
}
