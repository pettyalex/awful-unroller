package net.catjunior.awfulparser.configuration

import com.slack.api.bolt.App
import com.slack.api.bolt.servlet.SlackAppServlet
import com.slack.api.bolt.servlet.SlackOAuthAppServlet
import com.slack.api.model.event.LinkSharedEvent
import net.catjunior.awfulparser.services.PostUnroller
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import javax.servlet.annotation.WebServlet

// Example environment vars for OAuth2 distribution.
// export SLACK_SIGNING_SECRET=xxx
// export SLACK_CLIENT_ID=111.222
// export SLACK_CLIENT_SECRET=xxx
// export SLACK_SCOPES=commands,chat:write.public,chat:write
// export SLACK_USER_SCOPES=
// export SLACK_INSTALL_PATH=/slack/install
// export SLACK_REDIRECT_URI_PATH=/slack/oauth_redirect
// export SLACK_OAUTH_COMPLETION_URL=https://www.example.com/completion
// export SLACK_OAUTH_CANCELLATION_URL=https://www.example.com/cancellation


@Configuration
class SlackApp {
    @Bean
    fun initSlackApp(postUnroller: PostUnroller): App {
        // TODO: Enabling OAuth https://slack.dev/java-slack-sdk/guides/app-distribution
        val app = App().asOAuthApp(true)
        app.event(LinkSharedEvent::class.java, postUnroller::unrollPost)
        return app
    }
}

@WebServlet("/slack/events")
class SlackAppController(app: App?) : SlackAppServlet(app)

@WebServlet("/slack/install")
class SlackOAuthInstallController(app: App?) : SlackOAuthAppServlet(app)

@WebServlet("/slack/oauth_redirect")
class SlackOAuthRedirectController(app: App?) : SlackOAuthAppServlet(app)
