package net.catjunior.awfulparser.parser

import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import org.jsoup.nodes.Element
import org.springframework.stereotype.Component

@Component
class AwfulScraper {
    companion object {
        // https://forums.somethingawful.com/showthread.php?noseen=0&threadid=3953960&perpage=40&pagenumber=1519#post514827432
        fun getPage(url: String): Document {
            return Jsoup.connect(url).get();
        }

        /**
         * PostIDs are like post514827432
         */
        fun getPost(document: Document, postId: String): Element {
            return document.getElementById(postId)
        }
    }
}