import { NodeMap, Node, ChoiceNode, GroupNode, Pos } from "@types"
import { Size, RenderNode, RenderConnect } from "./types"
import Svgx, { SvgxElement } from "../svgx"

import {
  FLOWCHART_PADDING_HORIZONTAL,
  FLOWCHART_PADDING_VERTICAL,
  FLOW_NODE_PADDING_HORIZONTAL,
  FLOW_NODE_PADDING_VERTICAL,
  FLOW_NODE_MARGIN_VERTICAL,
  FLOW_NODE_MARGIN_HORIZONTAL,
  FLOW_CHOICE_PADDING_HORIZONTAL,
  FLOW_ROOT_PADDING,
  FLOW_QUANTIFIER_MARGIN_TOP,
  FLOW_QUANTIFIER_MARGIN_BOTTOM,
  FLOW_GROUP_PADDING_VERTICAL,
} from "./config"
class Traverse {
  svgx: Svgx
  nodeMap!: NodeMap
  cachedSizeMap: Map<number, Size> = new Map()
  standardText!: SvgxElement
  renderNodes: RenderNode[] = []
  renderConnects: RenderConnect[] = []
  constructor(svgx: Svgx) {
    this.svgx = svgx
  }
  t(nodeMap: NodeMap, root: number) {
    this.standardText = this.svgx.text(-9999, -9999, "")
    this.renderNodes = []
    this.renderConnects = []
    this.cachedSizeMap = new Map()
    this.nodeMap = nodeMap
    const concatenation: number[] = []
    let cur: number | null = root
    while (cur !== null) {
      let curNode: Node
      if (typeof cur === "number") {
        concatenation.push(cur)
        curNode = nodeMap.get(cur) as Node
      } else {
        curNode = cur
      }
      cur = curNode.next
    }
    let { width, height } = this.traverseConcatenation(
      concatenation,
      FLOWCHART_PADDING_HORIZONTAL,
      FLOWCHART_PADDING_VERTICAL
    )
    width += FLOWCHART_PADDING_HORIZONTAL * 2
    height += FLOWCHART_PADDING_VERTICAL * 2
    const { renderNodes, renderConnects } = this
    return {
      width,
      height,
      renderNodes,
      renderConnects,
    }
  }
  measureText(text: string, fontSize: number = 16) {
    this.standardText.attr({
      text,
      "font-size": fontSize,
    })
    const box = this.standardText.getBBox()
    return { width: box ? box.width : 0, height: box ? box.height : 0 }
  }
  getSize(id: number) {
    const cachedSize = this.cachedSizeMap.get(id)
    if (cachedSize) {
      return cachedSize
    }
    const node = this.nodeMap.get(id) as Node
    let width = 0
    let height = 0
    switch (node.type) {
      case "root": {
        const text = node.text
        const size = this.measureText(text)
        width = size.width + 2 * FLOW_ROOT_PADDING
        height = width
        break
      }

      case "basic":
        {
          const text = node.body.text
          const size = this.measureText(text)
          width = size.width + 2 * FLOW_NODE_PADDING_HORIZONTAL
          height = size.height + 2 * FLOW_NODE_PADDING_VERTICAL
        }
        break

      case "choice":
        const { branches } = node
        branches.forEach((branch, index) => {
          let _width = 0
          let _height = 0
          let cur = branch
          while (cur !== id) {
            const size = this.getSize(cur)
            _width += size.width
            if (cur !== branch) {
              _width += FLOW_NODE_MARGIN_HORIZONTAL
            }
            _height = Math.max(size.height, _height)
            const nextNode = this.nodeMap.get(cur) as Node
            cur = nextNode.next as number
          }
          height += _height
          index > 0 && (height += FLOW_NODE_MARGIN_VERTICAL)
          width = Math.max(width, _width)
        })
        width += FLOW_CHOICE_PADDING_HORIZONTAL * 2
        break

      case "group":
        const { head } = node
        let cur = head
        while (cur !== id) {
          const size = this.getSize(cur)
          width += size.width
          if (cur !== head) {
            width += FLOW_NODE_MARGIN_HORIZONTAL
          }
          height = Math.max(size.height, height)
          const curNode = this.nodeMap.get(cur) as Node
          cur = curNode.next as number
        }
        height += 2 * FLOW_GROUP_PADDING_VERTICAL
        break
      default:
        break
    }
    const { quantifier } = node
    if (quantifier) {
      if (quantifier.min === 0) {
        height += FLOW_QUANTIFIER_MARGIN_TOP
      }
      if (quantifier.max > 1) {
        height += FLOW_QUANTIFIER_MARGIN_BOTTOM
      }
    }
    const size: Size = {
      width,
      height,
    }
    this.cachedSizeMap.set(id, size)
    return size
  }
  traverseUnknownType(id: number, x: number, y: number) {
    const node = this.nodeMap.get(id) as Node
    switch (node.type) {
      case "basic":
        {
          const size = this.getSize(id)
          const text = node.body.text
          const { quantifier } = node
          const preRenderNode: RenderNode = {
            id,
            x,
            y,
            width: size.width,
            height: size.height,
            text,
            type: "basic",
            quantifier,
          }
          if (quantifier) {
            if (quantifier.min === 0) {
              preRenderNode.y += FLOW_QUANTIFIER_MARGIN_TOP / 2
              preRenderNode.height -= FLOW_QUANTIFIER_MARGIN_TOP
            }
            if (quantifier.max > 1) {
              preRenderNode.y += FLOW_QUANTIFIER_MARGIN_BOTTOM / 2
              preRenderNode.height -= FLOW_QUANTIFIER_MARGIN_BOTTOM
            }
          }
          this.renderNodes.push(preRenderNode)
        }
        break
      case "root": {
        const size = this.getSize(id)
        const text = node.text
        this.renderNodes.push({
          id,
          x,
          y,
          width: size.width,
          height: size.height,
          text,
          type: "root",
        })
        break
      }
      case "choice":
        this.traverseChoice(id, x, y)
        break
      case "group":
        this.traverseGroup(id, x, y)
        break
      default:
        break
    }
  }
  traverseGroup(id: number, x: number, y: number) {
    const node = this.nodeMap.get(id) as GroupNode
    const groupSize = this.getSize(id)
    const { head, quantifier } = node
    const concatenation: number[] = []
    let cur = head
    // let width = 0
    while (cur !== id) {
      concatenation.push(cur)
      // width += this.getSize(cur).width
      const curNode = this.nodeMap.get(cur) as Node
      cur = curNode.next as number
    }
    let { width, height } = groupSize
    if (quantifier) {
      if (quantifier.min === 0) {
        y += FLOW_QUANTIFIER_MARGIN_TOP / 2
        height -= FLOW_QUANTIFIER_MARGIN_TOP
      }
      if (quantifier.max > 1) {
        y += FLOW_QUANTIFIER_MARGIN_BOTTOM / 2
        height -= FLOW_QUANTIFIER_MARGIN_BOTTOM
      }
    }
    const preRenderNode: RenderNode = {
      id,
      x,
      y,
      width,
      height,
      text: "",
      type: "group",
      quantifier,
    }
    this.renderNodes.push(preRenderNode)
    y += FLOW_GROUP_PADDING_VERTICAL
    this.traverseConcatenation(concatenation, x, y)
  }
  traverseChoice(id: number, x: number, y: number) {
    const node = this.nodeMap.get(id) as ChoiceNode
    const originY = y
    const { branches } = node
    const choiceSize = this.getSize(id)
    const maxWidth = choiceSize.width
    const branchEndPoints: Pos[] = []

    branches.forEach((branch, index) => {
      index > 0 && (y += FLOW_NODE_MARGIN_VERTICAL)
      let width = 0
      let cur = branch
      const concatenation: number[] = []
      while (cur !== id) {
        concatenation.push(cur)
        width += this.getSize(cur).width
        if (cur !== branch) {
          width += FLOW_NODE_MARGIN_HORIZONTAL
        }
        const curNode = this.nodeMap.get(cur) as Node
        cur = curNode.next as number
      }
      const deltaX = (maxWidth - width) / 2
      const height = this.traverseConcatenation(concatenation, x + deltaX, y)
        .height
      branchEndPoints.push({
        x: x + deltaX + width,
        y: y + height / 2,
      })
      this.renderConnects.push({
        start: { x: x, y: originY + choiceSize.height / 2 },
        end: { x: x + deltaX, y: y + height / 2 },
        type: "split",
      })
      y += height
    })
    branchEndPoints.forEach(branchEndPoint => {
      this.renderConnects.push({
        start: { ...branchEndPoint },
        end: { x: x + choiceSize.width, y: y - choiceSize.height / 2 },
        type: "combine",
      })
    })
  }
  traverseConcatenation(concatenation: number[], x: number, y: number): Size {
    const originX = x
    let height = 0
    let connectPoint: Pos
    concatenation.forEach(id => {
      const size = this.getSize(id)
      height = Math.max(height, size.height)
    })
    concatenation.forEach((id, index) => {
      const size = this.getSize(id)
      const deltaY = (height - size.height) / 2
      this.traverseUnknownType(id, x, y + deltaY)

      if (connectPoint) {
        this.renderConnects.push({
          type: "straight",
          start: { ...connectPoint },
          end: {
            x,
            y: y + height / 2,
          },
        })
      }
      connectPoint = {
        x: x + size.width,
        y: y + height / 2,
      }
      x += size.width
      index !== concatenation.length - 1 && (x += FLOW_NODE_MARGIN_HORIZONTAL)
    })
    return { width: x - originX, height }
  }
}
export default Traverse