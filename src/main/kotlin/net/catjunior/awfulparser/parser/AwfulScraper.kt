package net.catjunior.awfulparser.parser

import net.catjunior.awfulparser.models.AwfulPost
import net.catjunior.awfulparser.models.PostElement
import net.catjunior.awfulparser.models.TextPostElement
import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import org.jsoup.nodes.Element
import org.jsoup.nodes.Node
import org.jsoup.nodes.TextNode
import org.jsoup.select.Elements
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

        fun getFullPostWithAuthor(url: String): AwfulPost {
            val postElement = getPost(url)
            val username = postElement.select("dt.author").text()
            val postBodyWithoutQuotes =
                postElement.select("td.postbody").textNodes().filter { !it.isBlank }.map { it.toString() }
            val postElements = mutableListOf<PostElement>()

            postElements.add(TextPostElement("*$username posted:*"))
            postElements.addAll(postBodyWithoutQuotes.map { TextPostElement(it) })
            return AwfulPost(postElements)
        }

        /**
         * Gets a post as an ordered list of elements that we want to render into Slack.
         * Right now, these are text, images, and links (including emoticons)
         * These will be combined into slack blocks conditionally
         */
        fun getPostElementsForSlack(url: String): List<Node> {
            val allPostElements = getPost(url).selectFirst("td.postbody").childNodes()

            /**
             * Combine text, links, and emoji where they should be combined.
             * Start a new section when there's a break. Skip empty text.
             */

            return allPostElements
        }
    }
}