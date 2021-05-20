package net.catjunior.awfulparser.services

import com.slack.api.app_backend.events.payload.EventsApiPayload
import com.slack.api.bolt.context.builtin.EventContext
import com.slack.api.bolt.context.builtin.SlashCommandContext
import com.slack.api.bolt.request.builtin.SlashCommandRequest
import com.slack.api.bolt.response.Response
import com.slack.api.methods.request.chat.ChatUnfurlRequest
import com.slack.api.methods.response.chat.ChatUnfurlResponse
import com.slack.api.model.event.LinkSharedEvent
import net.catjunior.awfulparser.models.TextPostElement
import net.catjunior.awfulparser.parser.AwfulScraper
import org.springframework.stereotype.Service

@Service
class PostUnroller {
    fun unrollPost(req: EventsApiPayload<LinkSharedEvent>, ctx: EventContext): Response {
        ctx.ack() // ack first

        // https://api.slack.com/reference/messaging/link-unfurling
        val links = req.event.links
        val unfurlsByUrl = mutableMapOf<String, ChatUnfurlRequest.UnfurlDetail>()
        links.forEach { link ->
            val correctedUrl = link.url.replace("&amp;", "&")
            val postText = AwfulScraper.getFullPostWithAuthor(correctedUrl)
            val blocks = postText.elements.map { it.toSlackBlock() }
            val unfurlDetail = ChatUnfurlRequest.UnfurlDetail()
            unfurlDetail.blocks = blocks

            unfurlsByUrl[link.url] = unfurlDetail
        }
        println(unfurlsByUrl)
        val response = ctx.client().chatUnfurl { r ->
            r.unfurls(unfurlsByUrl).channel(req.event.channel).ts(req.event.messageTs)
        }
        println(response)

        return ctx.ack()
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