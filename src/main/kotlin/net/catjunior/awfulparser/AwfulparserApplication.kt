package net.catjunior.awfulparser

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.boot.web.servlet.ServletComponentScan

@ServletComponentScan
@SpringBootApplication
class AwfulparserApplication

fun main(args: Array<String>) {
	runApplication<AwfulparserApplication>(*args)
}
