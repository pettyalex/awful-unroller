package net.catjunior.awfulparser.controllers

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/landing")
class OAuthLandingController {

    @GetMapping("/success")
    fun handleSuccessfulOAuth(): String {
        return "OAuth Connection Worked"
    }

    @GetMapping("/failure")
    fun handleUnsuccessfulOAuth(): String {
        return "OAuth Connection Failed"
    }
}