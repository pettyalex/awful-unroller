package net.catjunior.awfulparser.models

import com.slack.api.model.block.ImageBlock
import com.slack.api.model.block.LayoutBlock
import com.slack.api.model.block.SectionBlock
import com.slack.api.model.block.composition.MarkdownTextObject
import com.slack.api.model.block.composition.TextObject

data class AwfulPost(
    val elements: List<PostElement>
)

interface PostElement {
    fun toSlackBlock(): LayoutBlock
}

class TextPostElement(private val text: String) : PostElement {
    override fun toSlackBlock(): LayoutBlock {
        val textObject = MarkdownTextObject.builder().text(text).build()
        return SectionBlock.builder().text(textObject).build()
    }
}

class ImagePostElement(private val url: String) : PostElement {
    override fun toSlackBlock(): LayoutBlock {
        return ImageBlock.builder().imageUrl(url).build()
    }
}

