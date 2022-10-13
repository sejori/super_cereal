export function parseFcnString(fcnString: string) {
  const args = fcnString.match(/(?<=\()(.|\n)*?(?=\))/)![0]
  const bodyMatches = fcnString.match(/(?<=\{)(.|\n)*?(?=\})/)

  // handle arrow fcn with no curly brackets
  let body = bodyMatches
    ? bodyMatches[0]
    : fcnString.slice(fcnString.indexOf("=>")+2)

  // add no return
  if (!body.includes("return")) {
    let lastBr = body.lastIndexOf("\n")
    if (lastBr < 0) lastBr = 0
    body = body.slice(0,lastBr) + "return " + body.slice(lastBr)
  }

  return new Function(args, body)
}