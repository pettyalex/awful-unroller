package net.catjunior.awfulparser.services

import com.slack.api.app_backend.events.payload.EventsApiPayload
import com.slack.api.bolt.context.builtin.EventContext
import com.slack.api.bolt.response.Response
import com.slack.api.methods.request.chat.ChatUnfurlRequest
import com.slack.api.model.block.ImageBlock
import com.slack.api.model.block.LayoutBlock
import com.slack.api.model.block.SectionBlock
import com.slack.api.model.block.composition.MarkdownTextObject
import com.slack.api.model.event.LinkSharedEvent
import net.catjunior.awfulparser.parser.AwfulScraper
import org.jsoup.nodes.Element
import org.jsoup.nodes.Node
import org.jsoup.nodes.TextNode
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class PostUnroller {
    companion object {
        private val EMOTICON_REGEX = Regex("^:.*:$")
    }

    private val logger = LoggerFactory.getLogger(this::class.java)

    // This doesn't need to be lazy, I just needed to configure the errorDetail
    private val errorUnfurlDetails by lazy {
        val detail = ChatUnfurlRequest.UnfurlDetail()
        val errorText = "Error: I couldn't unfurl that, tell @twerk to check the logs"

        val errorTextObject = MarkdownTextObject.builder().text(errorText).build()
        val errorSection = SectionBlock.builder().text(errorTextObject).build()
        detail.blocks = listOf(errorSection)
        detail
    }

    /**
     * Handles the Unfurl event from Slack
     */
    fun unrollPost(req: EventsApiPayload<LinkSharedEvent>, ctx: EventContext): Response {
        ctx.ack() // ack first
        val unfurlsByUrl = mutableMapOf<String, ChatUnfurlRequest.UnfurlDetail>()
        logger.info("Unrolling ${req.event.links} from user ${req.event.user} in channel ${req.event.channel} in workspace ${ctx.teamId}")

        try {
            // https://api.slack.com/reference/messaging/link-unfurling
            val links = req.event.links
            links.forEach { link ->
                val correctedUrl = link.url.replace("&amp;", "&")

                val (authorBlock, postElements) = AwfulScraper.getPostElementsForSlack(correctedUrl)
                val blocks = processElementsIntoSections(authorBlock, postElements)
                val unfurlDetail = ChatUnfurlRequest.UnfurlDetail()
                unfurlDetail.blocks = blocks

                unfurlsByUrl[link.url] = unfurlDetail
            }
            logger.debug(unfurlsByUrl.toString())
            ctx.client().chatUnfurl { r ->
                r.unfurls(unfurlsByUrl).channel(req.event.channel).ts(req.event.messageTs)
            }
        } catch (e: Exception) {
            logger.error("Exception when unrolling post at ${req.event.links}", e)


            ctx.client().chatUnfurl { r ->
                r.unfurls(unfurlsByUrl).channel(req.event.channel).ts(req.event.messageTs)
            }
        }

        return ctx.ack()
    }

    fun processElementsIntoSections(authorBlock: SectionBlock, postElements: List<Node>): List<LayoutBlock> {
        val outputBlocks = mutableListOf<LayoutBlock>(authorBlock)
        var currentTextBeingBuilt = String() // used to put together links, text, and emoticons

        for (element in postElements) {
            // Simple text
            if (element is TextNode && !element.isBlank) {
                currentTextBeingBuilt += element.text()
            }

            // Links
            if (element is Element && element.tag().normalName() == "a") {
                val linkTarget = element.attr("href")
                val linkText = element.text()
                currentTextBeingBuilt += "<$linkTarget|$linkText>"
            }

            // Emoticons & Images
            if (element is Element && element.tag().normalName() == "img") {
                // Title starts and ends with :, it's an emoticon
                if (element.attr("src").contains("somethingawful.com") &&
                    element.attr("title").matches(EMOTICON_REGEX)
                ) {
                    // TODO Some emoticons look like https://fi.somethingawful.com/safs/smilies/b/2/rip.001.gif
                    // Emoticon
                    currentTextBeingBuilt += element.attr("title")
                } else {
                    // image
                    closeOutSection(outputBlocks, currentTextBeingBuilt)
                    currentTextBeingBuilt = ""

                    val imageUrl = element.attr("src")

                    val imageBlock =
                        ImageBlock.builder().imageUrl(imageUrl).altText("Image from somethingawful post").build()
                    outputBlocks.add(imageBlock)
                }
            }

            // Break means end the section and begin a new one
            if (element is Element && element.tag().normalName() == "br") {
                closeOutSection(outputBlocks, currentTextBeingBuilt)
                currentTextBeingBuilt = ""
            }
        }

        closeOutSection(outputBlocks, currentTextBeingBuilt)

        return outputBlocks
    }

    /**
     * Builds any text, links, or emoticons into a slack Section Block and adds it to output
     */
    fun closeOutSection(outputBlocks: MutableList<LayoutBlock>, textToAdd: String) {
        // If we haven't added any text, links, or emoticons, don't add anything
        if (textToAdd.isBlank()) {
            return
        }

        val textElement = MarkdownTextObject.builder().text(textToAdd).build()
        val outputBlock = SectionBlock.builder().text(textElement).build()

        outputBlocks.add(outputBlock)
    }
}

// Example of what we're trying to send
//{
//    "blocks": [
//    {
//        "type": "section",
//        "text": {
//        "type": "mrkdwn",
//        "text": "<https://forums.somethingawful.com/showthread.php?goto=post&postid=514821223#post514821223%7C*SabGuy posted:*>\n It would be kind of funny if there were bike computer fanboys though."
//    }
//    },
//    {
//        "type": "divider"
//    },
//    {
//        "type": "section",
//        "text": {
//        "type": "mrkdwn",
//        "text": "*Literally Lewis Hamilton posted:*\nIf my Garmin detects a hard fall it automatically posts a GoFundMe."
//    },
//        "accessory": {
//        "type": "image",
//        "image_url": "https://fi.somethingawful.com/safs/titles/9e/6d/00075172.0006.png",
//        "alt_text": "An Avatar"
//    }
//    },
//    {
//        "type": "image",
//        "image_url": "https://i.imgur.com/6O1CzSx.png?1",
//        "alt_text": "inspiration"
//    }
//    ]
//}