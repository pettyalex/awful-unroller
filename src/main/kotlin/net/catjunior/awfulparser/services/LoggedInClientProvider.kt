package net.catjunior.awfulparser.services

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.stereotype.Component
import java.net.CookieManager
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets

@Component
class LoggedInClientProvider {
    val client = HttpClient.newBuilder().cookieHandler(CookieManager()).build()
    private val logger = LoggerFactory.getLogger(this::class.java)

    @Value("\${AWFUL_USERNAME}")
    private lateinit var username: String

    @Value("\${AWFUL_PASSWORD}")
    private lateinit var password: String

    companion object {
        fun ofFormData(data: Map<String, String>): HttpRequest.BodyPublisher? {
            val result = StringBuilder()
            for ((key, value) in data) {
                if (result.isNotEmpty()) {
                    result.append("&")
                }
                val encodedName = URLEncoder.encode(key, StandardCharsets.UTF_8)
                val encodedValue = URLEncoder.encode(value, StandardCharsets.UTF_8)
                result.append(encodedName)
                if (encodedValue != null) {
                    result.append("=")
                    result.append(encodedValue)
                }
            }
            return HttpRequest.BodyPublishers.ofString(result.toString())
        }
    }

    @Bean
    fun loginToSomethingawful(): HttpClient {
        val formData = mapOf("action" to "login", "username" to username, "password" to password, "next" to "/")

        val req = HttpRequest.newBuilder(URI.create("https://forums.somethingawful.com/account.php"))
            .POST(ofFormData(formData))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .build()

        logger.info("Trying to log in to Somethingawful as $username")
        val res = client.send(req, HttpResponse.BodyHandlers.ofString())
        val hasUsername = res.body().contains("Twerk From Home")
        logger.info("Successfully logged in as $hasUsername")

        return client
    }

}