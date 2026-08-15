package de.justvotes.pollmanagement.core.ports.out;

import de.justvotes.pollmanagement.core.model.Poll;

public interface TemplateGroupSnapshotProvider {
    TemplateGroupSnapshot snapshotOf(Poll.TemplateGroupId templateGroupId);
}
