package de.justvotes.bootstrap;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class BCryptHasherTest {

    @Test
    public void createHash() {
        System.out.println(new BCryptPasswordEncoder().encode("admin"));
    }
}
