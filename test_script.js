
const apiKey = "";
async function runOpenAI(text) {

  let tic = new Date();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-5-mini",      // or any other supported chat model
      instructions: "You are an auto-complete assistant that concisely completes text. Only return the predicted text inside of the <completion> tag.",
      input: `<text_before>${text}</text_before><completion></completion><text_after></text_after>`,
      reasoning: {effort: "minimal"}
    })
  });

  const data = await response.json();
  console.log(new Date() - tic)
  console.log(data);
  console.log(data.output[1].content[0].text)
}

runOpenAI("- Hello, there!\n- Ahhh, general Ke")