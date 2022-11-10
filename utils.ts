export function serialize (node: unknown) {
  if (node instanceof Function) {
    return node.toString()
  }

  if (node instanceof Date) {
    return node.valueOf().toString()
  }

  return JSON.stringify(node, replacer)
}

function replacer (_key: string, value: unknown) {
  if (value instanceof Map) {
    return [...value.entries()]
  }
  if (value instanceof Set) {
    return [...value.values()]
  }
  return value
}

export function parseFcnString(fcnString: string) {
  const args = fcnString.match(/(?<=\()(.|\n)*?(?=\))/)![0]
  const bodyMatches = fcnString.match(/(?<=\{)(.|\n)*?(?=\})/)

  // handle arrow fcn with no curly brackets
  let body = bodyMatches
    ? bodyMatches[0]
    : fcnString.slice(fcnString.indexOf("=>")+2)

  // add return if not there
  if (!body.includes("return")) {
    let lastBr = body.lastIndexOf("\n")
    if (lastBr < 0) lastBr = 0
    body = body.slice(0,lastBr) + "return " + body.slice(lastBr)
  }

  return new Function(args, body)
}