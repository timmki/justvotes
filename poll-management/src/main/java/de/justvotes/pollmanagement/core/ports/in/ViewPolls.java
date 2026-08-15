package de.justvotes.pollmanagement.core.ports.in;

import de.justvotes.pollmanagement.core.model.Poll;

import java.util.List;

public interface ViewPolls {
    List<Poll> draftsCreatedBy(String systemAdmin);
}
