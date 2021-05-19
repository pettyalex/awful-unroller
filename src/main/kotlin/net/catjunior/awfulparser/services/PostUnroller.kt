package net.catjunior.awfulparser.services

import com.slack.api.app_backend.events.payload.EventsApiPayload
import com.slack.api.bolt.context.builtin.EventContext
import com.slack.api.bolt.context.builtin.SlashCommandContext
import com.slack.api.bolt.request.builtin.SlashCommandRequest
import com.slack.api.bolt.response.Response
import com.slack.api.model.event.LinkSharedEvent
import org.springframework.stereotype.Service

@Service
class PostUnroller {
    fun unrollPost(req: EventsApiPayload<LinkSharedEvent>, ctx: EventContext): Response {
        // https://api.slack.com/reference/messaging/link-unfurling
        ctx.ack()
        return ctx.ack()
    }
}