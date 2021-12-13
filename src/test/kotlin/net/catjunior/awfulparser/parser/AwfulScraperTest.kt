package net.catjunior.awfulparser.parser

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles

@SpringBootTest
@ActiveProfiles("test")
internal class AwfulScraperTest {
    @Autowired
    private lateinit var scraper: AwfulScraper

    @Test
    fun getPostById() {
        val post = scraper.getPost("https://forums.somethingawful.com/showthread.php?threadid=3953960&pagenumber=1527#post514840766")
        println(post)
    }

    @Test
    fun getPostWithoutQuotes() {
        val withoutQuotes = scraper.getPostBodyWithoutQuotes("https://forums.somethingawful.com/showthread.php?threadid=3953960&pagenumber=1527#post514841191")
        println(withoutQuotes)
    }

    @Test
    fun getPostWithImages() {

    }

    @Test
    fun getCompletePostWithAllChildren() {
        val rawPost = scraper.getPost("https://forums.somethingawful.com/showthread.php?noseen=0&threadid=3952517&perpage=40&pagenumber=180#post515405429")
        val completePost = rawPost.select("td.postbody").first().childNodes()

        println(completePost)
    }

    @Test
    fun getLoggedInTest() {
        val document = scraper.getPage("https://forums.somethingawful.com/")

        println(document.toString())
    }


}