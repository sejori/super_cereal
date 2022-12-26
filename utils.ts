export async function serialize (node: unknown): Promise<string> {
  if (node instanceof Function) {
    return node.toString()
  }

  if (node instanceof Date) {
    return node.valueOf().toString()
  }

  if (node instanceof Response) {
    const reader = new FileReader()
    const bodyBlob = await node.blob()
    reader.readAsDataURL(bodyBlob)

    const bodyDataURL: string = await new Promise(res => {
      reader.addEventListener("load", () => {
        res(reader.result as string);
      });
    })

    node = {
      body: bodyDataURL,
      status: node.status,
      statusText: node.statusText,
      headers: [...node.headers.entries()]
    }
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