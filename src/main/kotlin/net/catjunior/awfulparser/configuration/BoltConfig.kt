package net.catjunior.awfulparser.configuration

import com.slack.api.bolt.App
import com.slack.api.bolt.servlet.SlackAppServlet
import com.slack.api.model.event.LinkSharedEvent
import net.catjunior.awfulparser.services.PostUnroller
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import javax.servlet.annotation.WebServlet

@Configuration
class SlackApp {
    @Bean
    fun initSlackApp(postUnroller: PostUnroller): App {
        val app = App()
        app.event(LinkSharedEvent::class.java, postUnroller::unrollPost)
        return app
    }
}

@WebServlet("/slack/events")
class SlackAppController(app: App?) : SlackAppServlet(app)