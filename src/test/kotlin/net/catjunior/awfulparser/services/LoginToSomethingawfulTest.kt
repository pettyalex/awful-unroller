package net.catjunior.awfulparser.services

import org.junit.jupiter.api.Test

internal class LoginToSomethingawfulTest {
    val login = LoggedInClientProvider()

    @Test
    fun `logs in`() {
        login.loginToSomethingawful()
    }
}
