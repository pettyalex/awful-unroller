package net.catjunior.awfulparser.parser

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

internal class AwfulScraperTest {
    @Test
    fun getPostById() {
        val post = AwfulScraper.getPost("https://forums.somethingawful.com/showthread.php?threadid=3953960&pagenumber=1527#post514840766")
        println(post)
    }

    @Test
    fun getPostWithoutQuotes() {
        val withoutQuotes = AwfulScraper.getPostBodyWithoutQuotes("https://forums.somethingawful.com/showthread.php?threadid=3953960&pagenumber=1527#post514841191")
        println(withoutQuotes)
    }
}