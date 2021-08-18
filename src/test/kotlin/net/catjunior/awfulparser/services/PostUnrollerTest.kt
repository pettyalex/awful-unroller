package net.catjunior.awfulparser.services

import net.catjunior.awfulparser.parser.AwfulScraper
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
internal class PostUnrollerTest {
    @Autowired
    private lateinit var unroller: PostUnroller

    @Test
    fun processPostIntoBlocks() {
        val (authorBlock, postNodes) = AwfulScraper.getPostElementsForSlack("https://forums.somethingawful.com/showthread.php?noseen=0&threadid=3952517&perpage=40&pagenumber=180#post515405429")
        val blocks = unroller.processElementsIntoSections(authorBlock, postNodes)

        println(blocks)
    }
}