package net.catjunior.awfulparser.parser

import com.slack.api.model.block.SectionBlock
import com.slack.api.model.block.composition.MarkdownTextObject
import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import org.jsoup.nodes.Element
import org.jsoup.nodes.Node
import org.springframework.stereotype.Component
import java.net.URL

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
        fun getPost(url: String): Element {
            val postId = URL(url).ref
            val document = Jsoup.connect(url).get()
            return document.getElementById(postId)
        }

        /**
         * Gets a list of all of the text in a post. There should be newlines in
         * between each, or we could inject the newlines here
         */
        fun getPostBodyWithoutQuotes(url: String): List<String> {
            val post = getPost(url)
            return post.select("td.postbody").textNodes().filter { !it.isBlank }.map { it.toString() }
        }

        /**
         * Gets a post as an ordered list of elements that we want to render into Slack.
         * Right now, these are text, images, and links (including emoticons)
         * These will be combined into slack blocks conditionally.
         *
         * Returns one pre-built block with author information
         */
        fun getPostElementsForSlack(url: String): Pair<SectionBlock, List<Node>> {
            val post = getPost(url)
            val author = post.select("dt.author").text()
            val allPostElements = post.selectFirst("td.postbody").childNodes()

            val authorSectionBlock =
                SectionBlock.builder().text(MarkdownTextObject.builder().text("*$author posted:*").build()).build()

            return Pair(authorSectionBlock, allPostElements)
        }
    }
}